// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, SPEL_FLASH_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Brandweer, { BrandweerEnding, JUMP_MS, TOO_HOT_MS } from '../oefenen/spelen/skins/brandweer/Brandweer';
import { FIRE, RESCUE_EVERY, WINDOWS, decorOf, fireMood, fireOf, fireStart, fireStep, flameScale, petWindow, rescuedOf, tooHot, windowsOf, type FireCounts } from '../oefenen/spelen/skins/brandweer/fire';
import { aimAt, sprayPath } from '../oefenen/spelen/skins/brandweer/geometry';
import { BRANDWEER_SOUNDS } from '../oefenen/spelen/skins/brandweer/sounds';
import { resetKiosk } from './helpers/oefenKiosk';

// Brandweer: the fire level's tuning (fire.ts), the windows and pets, and the skin on the real session.

const at = (elapsedMs: number, right: number, mistakes: number, streak: number): FireCounts => ({ elapsedMs, right, mistakes, streak });

describe('the fire level', () => {
    test('a new building starts in the yellow; time and mistakes heat it, a sprayed window cools it', () => {
        expect(fireStart().level).toBe(FIRE.start);
        expect(fireOf([at(FIRE.riseMs - 1, 0, 0, 0)]).level).toBe(FIRE.start);
        expect(fireOf([at(FIRE.riseMs, 0, 0, 0)]).level).toBe(FIRE.start + 1);
        expect(fireOf([at(0, 0, 2, 0)]).level).toBe(FIRE.start + 2);
        expect(fireOf([at(0, 1, 0, 1)]).level).toBe(FIRE.start - 1);
        // A wrong answer, then two right: no streak bonus.
        expect(fireOf([at(0, 0, 1, 0), at(0, 1, 1, 1), at(0, 2, 1, 2)]).level).toBe(FIRE.start - 1);
    });

    test('every third in a row cools one step more (the Superstraal)', () => {
        const s = fireOf([at(0, 0, 3, 0), at(0, 1, 3, 1), at(0, 2, 3, 2), at(0, 3, 3, 3)]);
        expect(s.level).toBe(FIRE.start + 3 - 3 - 1);
        expect(s.supers).toBe(1);
    });

    test('at 0 the building is fully out and the next one burns from the start', () => {
        // 4 → 3 → 2 → 0 (the third in a row cools 2): out, the next one at the start level.
        const s = fireOf([at(0, 1, 0, 1), at(0, 2, 0, 2), at(0, 3, 0, 3)]);
        expect(s.buildings).toBe(1);
        expect(s.level).toBe(FIRE.start);
    });

    test('too hot at max: the level stays there; counts going back start a new round', () => {
        const hot = fireOf([at(0, 0, FIRE.max, 0)]);
        expect(hot.level).toBe(FIRE.max);
        expect(tooHot(hot.level)).toBe(true);
        expect(fireStep(hot, at(1000, 3, FIRE.max, 3)).level).toBe(FIRE.max);
        expect(fireStep(hot, at(0, 0, 0, 0))).toEqual(fireStart());
        expect([0, 4, 5, 6, 7, 10].map(fireMood)).toEqual(['calm', 'calm', 'warm', 'warm', 'hot', 'hot']);
        expect(flameScale(0)).toBeLessThan(flameScale(FIRE.max));
        expect(flameScale(99)).toBe(flameScale(FIRE.max));
    });

    // The owner's rule: a pupil who guesses always burns down, a steady 80 % pupil holds out (3 minutes, 6–8 s per answer).
    test('tuning: guessing always burns down, 60 % mostly, 80 % about one round in ten at most', () => {
        const rate = (pRight: number, pace: [number, number], runs = 3000) => {
            const rng = mulberry32(23);
            let fails = 0;
            for (let r = 0; r < runs; r++) {
                let s = fireStart();
                let t = 0, right = 0, mistakes = 0, streak = 0;
                for (;;) {
                    t += (pace[0] + rng() * (pace[1] - pace[0])) * 1000;
                    if (t >= 180_000) { s = fireStep(s, at(180_000, right, mistakes, streak)); break; }
                    if (rng() < pRight) { right++; streak++; } else { mistakes++; streak = 0; }
                    s = fireStep(s, at(t, right, mistakes, streak));
                    if (tooHot(s.level)) break;
                }
                if (tooHot(s.level)) fails++;
            }
            return fails / runs;
        };
        expect(rate(0.25, [4, 6])).toBeGreaterThan(0.98);
        expect(rate(0.6, [6, 8])).toBeGreaterThan(0.5);
        expect(rate(0.8, [6, 8])).toBeLessThan(0.12);
        expect(rate(0.8, [8, 11])).toBeLessThan(0.18);
        expect(rate(0.9, [6, 8])).toBeLessThan(0.02);
    });
});

describe('the windows and the pets', () => {
    test('a sum lights one window per option, all different, never the pet, the same for the same sum', () => {
        for (const key of ['a', 'q-1', '7 + 5', 'x'.repeat(20)]) {
            for (let pet = 0; pet < WINDOWS; pet++) {
                const w = windowsOf(key, 4, pet);
                expect(w).toHaveLength(4);
                expect(new Set(w).size).toBe(4);
                expect(w).not.toContain(pet);
                expect(w.every(i => i >= 0 && i < WINDOWS)).toBe(true);
                expect(windowsOf(key, 4, pet)).toEqual(w);
            }
        }
        expect(windowsOf('k', 3, 0)).toHaveLength(3);
        // Over many sums every window burns at some point.
        expect(new Set(Array.from({ length: 60 }, (_, i) => windowsOf(`k${i}`, 4, 8)).flat()).size).toBe(WINDOWS - 1);
    });

    test('a pet every few right answers, each in a new window', () => {
        expect(rescuedOf(RESCUE_EVERY - 1)).toBe(0);
        expect(rescuedOf(RESCUE_EVERY)).toBe(1);
        for (let n = 1; n < 30; n++) expect(petWindow(n)).not.toBe(petWindow(n - 1));
        expect(['dark', 'plant', 'lamp', 'curtain']).toContain(decorOf(3, 2));
    });

    test('the ladder reaches higher for a higher floor; the water arcs from the nozzle', () => {
        expect(aimAt(0).angle).toBeLessThan(aimAt(2).angle);
        expect(aimAt(0).ext).toBeGreaterThan(aimAt(2).ext);
        expect(sprayPath({ x: 0, y: 0 }, { x: 100, y: 50 })).toMatch(/^M0\.0 0\.0 Q.+ 100\.0 50\.0$/);
        expect(BRANDWEER_SOUNDS).toEqual(expect.arrayContaining(['sirene', 'spray', 'dribble', 'kat']));
    });
});

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = () => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('brandweer')!.meta }));
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

function Wired() {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Brandweer question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} onReport={r => st.report(r)} sound={() => { }} progress={progress} options={{}} events={st.events} />
    );
}
const windows = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).queryAllByRole('button', { hidden: true }) as HTMLButtonElement[];
const tap = (value: string) => fireEvent.click(windows().find(b => !b.disabled && b.getAttribute('aria-label') === value)!);
const tapWrong = () => tap(sp().question!.choices.find(c => c !== sp().question!.answer)!);
const tapRight = () => tap(sp().question!.answer);
const lit = (c: HTMLElement) => c.querySelectorAll('.bw-seg.is-on').length;

describe('the skin on the session', () => {
    test('registry: timed tap game, Op tijd, can fail, own titles, end picture and blurb', () => {
        const entry = skinById('brandweer')!;
        expect(entry.meta).toMatchObject({
            label: 'Brandweer', input: 'choice', choiceCount: 4, timed: true, round: { seconds: 180 }, canFail: true, music: 'tikken',
            winTitle: 'Alles geblust!', failTitle: 'Oei! Het brandt te hard. Nog eens?', accepts: { kinds: ['number', 'choice'], maxAnswerChars: 5 },
        });
        expect(entry.meta.season).toBeUndefined();
        expect(entry.Ending).toBeDefined();
        expect(GAME_BLURB.brandweer).toBeTruthy();
    });

    test('four burning windows carry the options; keys 1 to 4 pick one', () => {
        start();
        const { container } = render(<Wired />);
        expect(windows().map(b => b.getAttribute('aria-label'))).toEqual(sp().question!.choices);
        expect(container.querySelectorAll('.bw-flames')).toHaveLength(4);
        expect(lit(container)).toBe(FIRE.start);
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(sp().phase).toBe('right');
    });

    test('a right window: the hose sprays it out and the gauge drops; the next sum lights four again', () => {
        start();
        const { container } = render(<Wired />);
        tapRight();
        expect(container.querySelector('.bw-window.is-hit')).not.toBeNull();
        expect(container.querySelector('.bw-spray .bw-jet')).not.toBeNull();
        expect(container.querySelectorAll('.bw-win.is-out')).toHaveLength(1);
        expect(lit(container)).toBe(FIRE.start - 1);
        wait(SPEL_FLASH_MS.right + 10);
        expect(sp().phase).toBe('play');
        expect(container.querySelectorAll('.bw-flames')).toHaveLength(4);
        expect(container.querySelector('.bw-spray')).toBeNull();
    });

    test('a mistake: the hose dribbles, the flames flare, the answer window lights up, the gauge climbs', () => {
        start();
        const { container } = render(<Wired />);
        tapWrong();
        expect(sp().phase).toBe('wrong');
        expect(container.querySelector('.bw-window.is-miss')).not.toBeNull();
        expect(container.querySelector('.bw-window.is-answer')!.getAttribute('aria-label')).toBe(sp().question!.answer);
        expect(container.querySelector('.bw-dribble')).not.toBeNull();
        expect(container.querySelector('.bw-flames.is-flare')).not.toBeNull();
        expect(lit(container)).toBe(FIRE.start + 1);
    });

    test('three in a row put the first building out: Geblust!, then the next building drives in', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 2; i++) { tapRight(); wait(SPEL_FLASH_MS.right + 10); }
        tapRight();
        expect(container.querySelector('.bw-spray.is-super')).not.toBeNull();
        expect(container.querySelector('.bw-callout.is-out')).not.toBeNull();
        expect(container.querySelectorAll('.bw-win.is-out')).toHaveLength(4);
        wait(SPEL_FLASH_MS.right + 10);
        expect(container.querySelector('.bw-arrive .bw-block.is-look-1')).not.toBeNull();
        expect(lit(container)).toBe(FIRE.start);
        expect(sp().result?.detail).toBe('1 gebouw helemaal geblust!');
    });

    test('every fourth right answer a pet jumps from its window into the sheet and joins the residents', () => {
        start();
        const { container } = render(<Wired />);
        expect(container.querySelectorAll('.bw-win.is-pet')).toHaveLength(1);
        for (let i = 0; i < RESCUE_EVERY; i++) { tapRight(); if (i < RESCUE_EVERY - 1) wait(SPEL_FLASH_MS.right + 10); }
        expect(container.querySelector('.bw-jumper')).not.toBeNull();
        expect(container.querySelector('.bw-sheet-bounce')).not.toBeNull();
        wait(JUMP_MS + 10);
        expect(container.querySelector('.bw-jumper')).toBeNull();
        expect(container.querySelectorAll('.bw-lawn-pet')).toHaveLength(1);
        // The next pet waits in another window.
        expect(container.querySelectorAll('.bw-win.is-pet')).toHaveLength(1);
        expect(sp().result?.detail).toContain('1 dier gered');
    });

    test('too hot: the crew shrugs, everyone waves from the lawn, then the friendly early end', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < FIRE.max - FIRE.start - 1; i++) { tapWrong(); wait(SPEL_FLASH_MS.wrong + 10); }
        tapWrong();
        expect(container.querySelector('.bw-root.is-toohot')).not.toBeNull();
        expect(container.querySelectorAll('.bw-fighter.is-shrug')).toHaveLength(2);
        expect(container.querySelectorAll('.bw-resident.is-wave')).toHaveLength(3);
        // Nobody is ever in a window: only fire, pets, plants, lamps, curtains or dark glass.
        expect(container.querySelectorAll('.bw-win .bw-resident, .bw-win .bw-fighter')).toHaveLength(0);
        expect(windows().every(b => b.disabled)).toBe(true);
        wait(TOO_HOT_MS + 10);
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('failed');
    });

    test('under help the fire never ends the round, and met hulp never heats it', () => {
        start();
        const { container } = render(<Wired />);
        // Fewer than 15 s of play: the clock adds nothing either.
        for (let i = 0; i < FIRE.max - FIRE.start; i++) {
            act(() => sp().openHelp());
            act(() => sp().closeHelp());
            tapWrong();
            wait(SPEL_FLASH_MS.wrong + 10);
        }
        expect(lit(container)).toBe(FIRE.start);
        expect(sp().phase).toBe('play');
    });
});

describe('the end picture', () => {
    test('held: a rainbow and cheering; too hot: the crew shrugs and everyone waves, nobody hurt', () => {
        const progress = progressOf(sp());
        const { container, unmount } = render(<BrandweerEnding outcome="won" progress={progress} options={{}} />);
        expect(container.querySelector('.bw-ending.is-won .bw-end-rainbow')).not.toBeNull();
        expect(container.querySelectorAll('.bw-resident.is-cheer')).toHaveLength(3);
        unmount();
        const failed = render(<BrandweerEnding outcome="failed" progress={progress} options={{}} />);
        expect(failed.container.querySelectorAll('.bw-fighter.is-shrug')).toHaveLength(2);
        expect(failed.container.querySelectorAll('.bw-resident.is-wave')).toHaveLength(3);
    });
});
