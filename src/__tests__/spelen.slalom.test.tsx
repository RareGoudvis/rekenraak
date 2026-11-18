// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import { skinAccepts } from '../oefenen/spelen/accepts';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Slalom from '../oefenen/spelen/skins/slalom/Slalom';
import {
    SLALOM, STEPS, VIEW, answerRun, gateSeconds, isJump, laneX, openGate, paceOf, poseOf, project, scaleAt, spawnGate, speedOf, startRun, tickRun,
    type SlRun, type TickNews,
} from '../oefenen/spelen/skins/slalom/run';
import { SLALOM_RECORDS_KEY, formatMetres, loadBestM, saveIfLonger, slalomResult, wipeSlalom } from '../oefenen/spelen/skins/slalom/records';
import { formatMathNumber } from '../services/math/formatters';
import { resetKiosk } from './helpers/oefenKiosk';
import { resolveMeta } from '../oefenen/spelen/skins/options';

// Skislalom: the run down the slope (gates, speed steps, the tumble, a gate missed), the record per card, and the
// skin on the real session: tap a flag, the wrong flash with the laughing snowman, help freezing it, the 2-minute end.

const FRAME = 16;
// Ticks the run for ms of game time in frames; collects what happened.
function ski(r: SlRun, ms: number): { run: SlRun; news: TickNews[] } {
    const news: TickNews[] = [];
    for (let t = 0; t < ms; t += FRAME) {
        const step = tickRun(r, FRAME);
        r = step.run;
        news.push(step.news);
    }
    return { run: r, news };
}
const passed = (news: TickNews[]) => news.map(n => n.passed).filter(Boolean);

describe('Skislalom run', () => {
    test('five speed steps, each gate slower to reach at step 1 than at step 5, but never rushed', () => {
        expect(STEPS).toBe(5);
        for (let s = 2; s <= STEPS; s++) expect(speedOf(s)).toBeGreaterThan(speedOf(s - 1));
        expect(speedOf(0)).toBe(speedOf(1));
        expect(speedOf(9)).toBe(speedOf(STEPS));
        expect(gateSeconds(1)).toBeGreaterThan(7);
        expect(gateSeconds(1)).toBeLessThan(10);
        expect(gateSeconds(STEPS)).toBeGreaterThanOrEqual(4);
        expect(gateSeconds(STEPS)).toBeLessThan(gateSeconds(1));
    });

    test('a gate comes up the slope and brakes him; unanswered it slips past (a step slower) and a new one may come', () => {
        let r: SlRun = { ...spawnGate(startRun()), step: 3 };
        r = { ...r, speed: speedOf(3) };
        expect(openGate(r)!.d).toBe(SLALOM.spawnM);
        // Only one open gate at a time.
        expect(spawnGate(r)).toBe(r);
        const early = ski(r, 1000).run;
        expect(openGate(early)!.d).toBeLessThan(SLALOM.spawnM);
        expect(early.metres).toBeGreaterThan(0);
        // Near the gate he checks his speed.
        const near = ski(r, gateSeconds(3) * 1000 - 600).run;
        expect(near.speed).toBeLessThan(speedOf(3) * 0.8);
        const { run: after, news } = ski(r, gateSeconds(3) * 1000 + 900);
        expect(news.filter(n => n.missed !== null)).toHaveLength(1);
        expect(passed(news)).toEqual([{ id: 1, end: 'miss' }]);
        expect(after.step).toBe(2);
        expect(openGate(after)).toBeNull();
        expect(openGate(spawnGate(after))!.id).toBe(2);
        // Never below step 1.
        const slow = ski({ ...spawnGate(startRun()) }, gateSeconds(1) * 1000 + 900).run;
        expect(slow.step).toBe(1);
    });

    test('the levels: a step-1 gate takes the shared clock (12 s the first minute), every step as much faster; Makkelijk holds 12 s', () => {
        expect(gateSeconds(1, paceOf('normaal', 0))).toBeCloseTo(12, 6);
        expect(gateSeconds(1, paceOf('normaal', 60_000))).toBeCloseTo(11, 6);
        expect(gateSeconds(1, paceOf('moeilijk', 600_000))).toBeCloseTo(6, 6);
        expect(gateSeconds(1, paceOf('onmogelijk', 600_000))).toBeCloseTo(4, 6);
        expect(gateSeconds(1, paceOf('makkelijk', 600_000))).toBeCloseTo(12, 6);
        const p = paceOf('onmogelijk', 120_000);
        expect(gateSeconds(STEPS, p) / gateSeconds(1, p)).toBeCloseTo(gateSeconds(STEPS) / gateSeconds(1), 6);
        // The gate really arrives at the clock: a step-1 gate unanswered slips past just after 12 s of slope.
        const r = spawnGate(startRun(paceOf('normaal', 0)));
        expect(ski(r, 11_400).news.some(n => n.missed !== null)).toBe(false);
        expect(ski(r, 12_600).news.some(n => n.missed !== null)).toBe(true);
    });

    test('Makkelijk (gentle): a tumble keeps his speed step; otherwise back to step 1', () => {
        const gentle = { ...spawnGate(startRun(1, true)), step: 4 };
        expect(answerRun(gentle, false).step).toBe(4);
        expect(answerRun({ ...spawnGate(startRun()), step: 4 }, false).step).toBe(1);
        expect(answerRun(gentle, true).step).toBe(5);
    });

    test('a right answer shoots him through within the right flash, a step faster (at most 5)', () => {
        const r = spawnGate(startRun());
        const a = answerRun(r, true);
        expect(a.step).toBe(2);
        expect(a.gates[0].end).toBe('right');
        // An answered gate is no longer open: a second answer changes nothing.
        expect(answerRun(a, false)).toBe(a);
        const { run: after, news } = ski(a, SLALOM.passMs + 40);
        expect(passed(news)).toEqual([{ id: 1, end: 'right' }]);
        expect(after.metres).toBeGreaterThanOrEqual(SLALOM.spawnM - 0.01);
        // He leaves the gate faster than his new step, easing back to it.
        expect(after.speed).toBeGreaterThan(speedOf(2));
        expect(after.speed).toBeLessThanOrEqual(speedOf(2) * SLALOM.exitBoost);
        // The passed gate fades away.
        expect(ski(after, SLALOM.fadeMs + 40).run.gates).toEqual([]);
        expect(answerRun({ ...spawnGate(startRun()), step: STEPS }, true).step).toBe(STEPS);
        expect([1, 2, 3, 4, 6].map(isJump)).toEqual([false, false, true, false, true]);
        expect(isJump(0)).toBe(false);
    });

    test('a wrong answer: through the gate, a tumble (roll, sit) back to step 1, then up; a gate on the way waits', () => {
        const r = { ...spawnGate(startRun()), step: 4, speed: speedOf(4) };
        const a = answerRun(r, false);
        expect(a.step).toBe(1);
        const { run: down, news } = ski(a, SLALOM.passMs + 40);
        expect(passed(news)).toEqual([{ id: 1, end: 'wrong' }]);
        expect(poseOf(down)).toBe('roll');
        expect(down.down).toBeGreaterThan(SLALOM.tumbleMs - 100);
        // The slide stops; the next sum's gate does not come nearer while he sits, and an answer on it waits.
        const sitting = spawnGate(ski(down, SLALOM.rollMs + 200).run);
        expect(poseOf(sitting)).toBe('sit');
        expect(sitting.speed).toBeLessThan(speedOf(1) / 4);
        const waiting = answerRun(sitting, true);
        const still = ski(waiting, 300).run;
        expect(still.metres).toBeCloseTo(waiting.metres, 5);
        expect(openGate(sitting)!.d).toBe(SLALOM.spawnM);
        // Up again, the waiting shoot-through goes on.
        const through = ski(waiting, SLALOM.tumbleMs + SLALOM.upMs + SLALOM.passMs + 100);
        const upAt = through.news.findIndex(n => n.gotUp);
        const passAt = through.news.findIndex(n => n.passed);
        expect(upAt).toBeGreaterThan(0);
        expect(passAt).toBeGreaterThan(upAt);
        expect(passed(through.news)).toEqual([{ id: 2, end: 'right' }]);
        expect(poseOf(through.run)).toBe('ski');
    });

    test('the view: 1 at the skier, smaller up the slope, lanes round the middle', () => {
        expect(scaleAt(0)).toBe(1);
        expect(scaleAt(SLALOM.spawnM)).toBeLessThan(0.3);
        expect(scaleAt(SLALOM.spawnM)).toBeGreaterThan(0.18);
        const box = { w: 1280, h: 728 };
        const me = project(box, 0, 0);
        expect(me).toMatchObject({ x: 640, s: 1 });
        expect(me.y).toBeCloseTo(728 * VIEW.ground, 5);
        const far = project(box, 40, laneX(0));
        expect(far.y).toBeLessThan(me.y);
        expect(far.y).toBeGreaterThan(728 * VIEW.horizon);
        expect(far.x).toBeLessThan(640);
        expect(laneX(0)).toBe(-laneX(2));
        expect(laneX(1)).toBe(0);
    });
});

describe('Skislalom records', () => {
    beforeEach(() => localStorage.clear());

    test('the longest run per card; storage that fails never breaks a run; wipe', () => {
        expect(loadBestM('a')).toBeNull();
        saveIfLonger('a', 812.7);
        expect(loadBestM('a')).toBe(812);
        saveIfLonger('a', 500);
        expect(loadBestM('a')).toBe(812);
        saveIfLonger('b', 40);
        expect(loadBestM('b')).toBe(40);
        localStorage.setItem(SLALOM_RECORDS_KEY, '{oops');
        expect(loadBestM('a')).toBeNull();
        const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
        expect(() => saveIfLonger('a', 900)).not.toThrow();
        set.mockRestore();
        saveIfLonger('a', 900);
        wipeSlalom();
        expect(loadBestM('a')).toBeNull();
    });

    test('the end lines: the distance and the record before', () => {
        expect(formatMetres(1234.9)).toBe(`${formatMathNumber(1234)} m`);
        expect(slalomResult(300, null)).toMatchObject({ lead: 'Je skiede 300 m', detail: 'Nieuw record!' });
        expect(slalomResult(420, 300).detail).toBe('Nieuw record! 120 m verder dan je vorige record.');
        expect(slalomResult(250, 300).detail).toBe('Je record is 300 m.');
        expect(slalomResult(250, 300).wipe).toBe(wipeSlalom);
    });
});

describe('Skislalom in the picker', () => {
    test('a timed tap game with three flags: Op tijd, number or choice content up to 5 characters, its own line', () => {
        const meta = skinById('slalom')!.meta;
        expect(meta).toMatchObject({ input: 'choice', choiceCount: 3, timed: true, round: { seconds: 120 }, music: 'ijs' });
        expect(meta.options!.map(o => o.id)).toEqual(['niveau']);
        expect(meta.options![0].choices.map(c => c.icon)).toEqual([{ clock: 'off' }, { clock: 'on' }, { clock: 'on', flames: 1 }, { clock: 'on', flames: 2 }]);
        expect(meta.season).toBe('winter');
        expect(meta.canFail).toBeFalsy();
        expect(gameGroupOf(meta)).toBe('tijd');
        expect(skinAccepts(meta.accepts, { kind: 'choice' })).toBe(true);
        expect(skinAccepts(meta.accepts, { kind: 'number', answerChars: 5 })).toBe(true);
        expect(skinAccepts(meta.accepts, { kind: 'number', answerChars: 6 })).toBe(false);
        expect(GAME_BLURB.slalom).toBeTruthy();
    });
});

describe('Skislalom on the session', () => {
    let choice: ZelfChoice;
    const sp = () => useSpelStore.getState();
    const log: { name: SpelEventName; payload: unknown }[] = [];
    const offs: (() => void)[] = [];
    // In steps of 100 ms, each its own act: React renders between them, as it does between frames in a browser.
    const wait = (ms: number) => { for (let t = 0; t < ms; t += 100) act(() => { vi.advanceTimersByTime(Math.min(100, ms - t)); }); };

    beforeAll(async () => {
        const data = await loadEenvoudigData();
        choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    });
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
        localStorage.clear();
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        sp().takePickerAt();
        log.length = 0;
        for (const name of ['correct', 'wrong', 'help', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
        vi.spyOn(console, 'error').mockImplementation(() => { });
        act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(skinById('slalom')!.meta) }));
    });
    afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

    function Wired() {
        const st = useSpelStore();
        if (!st.question || !st.meta) return null;
        const progress = progressOf(st);
        return (
            <Slalom question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
                phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
                onFail={() => st.fail()} onReport={st.report} sound={() => { }} progress={progress} options={st.meta.chosen ?? {}} events={st.events} runKey="slalom:test" />
        );
    }
    const openFlags = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).queryAllByRole('button')
        .filter(b => !(b as HTMLButtonElement).disabled) as HTMLButtonElement[];
    const tapValue = (value: string) => fireEvent.click(openFlags().find(b => b.getAttribute('aria-label') === value)!);
    const names = () => log.map(l => l.name);

    test('three flags on a gate; the right one → correct, a wrong one → wrong with the snowman; help freezes the slope', () => {
        const { container } = render(<Wired />);
        wait(100);
        expect(sp().question!.choices).toHaveLength(3);
        expect(openFlags()).toHaveLength(3);
        expect(openFlags().map(b => b.getAttribute('aria-label')).sort()).toEqual([...sp().question!.choices].sort());
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.sl-flag.is-right')).not.toBeNull();
        wait(800);
        // The next sum's gate.
        expect(openFlags()).toHaveLength(3);
        const wrong = sp().question!.choices.find(c => c !== sp().question!.answer)!;
        tapValue(wrong);
        expect(names()).toEqual(['correct', 'wrong']);
        expect(container.querySelector('.sl-flag.is-answer')).not.toBeNull();
        wait(SLALOM.passMs + 200);
        expect(container.querySelector('.sl-skier.is-roll')).not.toBeNull();
        expect(container.querySelector('.sl-prop.is-snowman')).not.toBeNull();
        wait(SLALOM.rollMs);
        expect(container.querySelector('.sl-skier.is-sit .sl-dizzy')).not.toBeNull();
        expect(container.querySelector('.sl-snowman-art.is-laughing')).not.toBeNull();
        // While he sits (the next sum is already there), a tap does nothing.
        wait(400);
        if (openFlags().length) { fireEvent.click(openFlags()[0]); expect(names()).toEqual(['correct', 'wrong']); }
        wait(1500);
        expect(container.querySelector('.sl-skier.is-ski')).not.toBeNull();

        const metres = () => container.querySelector('.sl-metres')!.textContent;
        wait(1000);
        const before = metres();
        act(() => sp().openHelp());
        const left = progressOf(sp()).msLeft;
        wait(10_000);
        expect(metres()).toBe(before);
        expect(progressOf(sp()).msLeft).toBe(left);
        expect(container.querySelector('.sl-root.is-paused')).not.toBeNull();
        act(() => sp().closeHelp());
        wait(1000);
        expect(metres()).not.toBe(before);
    });

    test('the round ends after two minutes with the metres and the record as its end lines', () => {
        render(<Wired />);
        wait(60_000);
        act(() => sp().tick());
        expect(sp().phase).toBe('play');
        wait(61_000);
        act(() => sp().tick());
        expect(sp().phase).toBe('end');
        expect(names()).toContain('end');
        expect(sp().result?.lead).toMatch(/^Je skiede \d+/);
        expect(sp().result?.detail).toBe('Nieuw record!');
        // A best per card and level.
        expect(loadBestM('slalom:test|normaal')).toBeGreaterThan(80);
    });
});
