// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinChoices, SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { NUMBER_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
import Voetbal, { VoetbalEnding } from '../oefenen/spelen/skins/voetbal/Voetbal';
import { VOETBAL, VOETBAL_BEST_KEY, goalsLine, halfTimeDue, isShot, loadBest, newMatch, playOf, saveBest } from '../oefenen/spelen/skins/voetbal/match';
import { resetKiosk } from './helpers/oefenKiosk';

// Voetbal: passes on right answers, a tap-away on a wrong one, the shot on its own clock after four passes,
// a match clock in two halves with a held "Rust!", and the end lines the skin reports.

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
    try { localStorage.removeItem(VOETBAL_BEST_KEY); } catch { /* none */ }
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = (picked: SkinChoices = {}) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(skinById('voetbal')!.meta, picked) }));
const typeAnswer = (v: string) => { for (const d of v) fireEvent.keyDown(window, { key: d }); fireEvent.keyDown(window, { key: 'Enter' }); };
const rightKey = () => typeAnswer(sp().question!.answer);
const wrongKey = () => typeAnswer(String(Number(sp().question!.answer) + 1));

// The skin on the real session, as SpelScreen wires it, with the shell's 250 ms clock (tick + a fresh render).
function Wired({ reducedMotion = false }: { reducedMotion?: boolean }) {
    const st = useSpelStore();
    const [, setNow] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => { setNow(Date.now()); useSpelStore.getState().tick(); }, 250);
        return () => window.clearInterval(id);
    }, []);
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Voetbal question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={st.meta.chosen ?? {}} events={st.events} reducedMotion={reducedMotion}
            runKey="voetbal:test" onFinish={st.finish} onReport={st.report} onHold={on => st.hold(on)} />
    );
}

describe('Voetbal: the registry and the match logic', () => {
    test('keypad, timed, 3 or 5 minutes (default 3), a hidden cap, numbers only', () => {
        const meta = skinById('voetbal')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: true, round: { seconds: 180, cap: VOETBAL.cap } });
        expect(meta.accepts).toEqual({ kinds: ['number'] });
        expect(skinAccepts(meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(meta.options![0]).toMatchObject({ id: 'tijd', default: '3' });
        expect(resolveMeta(meta, { tijd: '5' }).round.seconds).toBe(300);
        expect(resolveMeta(meta).round.seconds).toBe(180);
        expect(skinById('voetbal')!.Component).toBeDefined();
        expect(skinById('voetbal')!.Ending).toBeDefined();
    });

    test('passes advance only on right answers and reset on a wrong one; the fifth sum is the shot', () => {
        let m = newMatch();
        m = playOf(m, true);
        m = playOf(m, true);
        expect(m).toMatchObject({ passes: 2, last: 'pass' });
        m = playOf(m, false);
        expect(m).toMatchObject({ passes: 0, last: 'tap', goals: 0 });
        for (let i = 0; i < 4; i++) m = playOf(m, true);
        expect(isShot(m)).toBe(true);
        const goal = playOf(m, true);
        expect(goal).toMatchObject({ passes: 0, goals: 1, last: 'goal' });
        const save = playOf(m, false);
        expect(save).toMatchObject({ passes: 0, goals: 0, saves: 1, last: 'save' });
        expect(goalsLine(1)).toBe('IJsberen 1 doelpunt');
        expect(goalsLine(4)).toBe('IJsberen 4 doelpunten');
    });

    test('half time is due once, after half the match clock', () => {
        const m = newMatch();
        expect(halfTimeDue(m, 100_000, 180_000)).toBe(false);
        expect(halfTimeDue(m, 90_000, 180_000)).toBe(true);
        expect(halfTimeDue({ ...m, half: 2 }, 60_000, 180_000)).toBe(false);
        expect(halfTimeDue(m, null, null)).toBe(false);
    });

    test('the best match per key; blocked storage is fine', () => {
        expect(loadBest('k')).toBe(0);
        saveBest('k', 3);
        saveBest('k', 2);
        expect(loadBest('k')).toBe(3);
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(loadBest('k')).toBe(0);
        expect(() => saveBest('k', 9)).not.toThrow();
    });
});

describe('Voetbal on the session (fake clock)', () => {
    beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] }); });
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const dots = (c: HTMLElement) => c.querySelectorAll('.vb-dot.is-on').length;

    test('passes on right answers, a tap-away resets them, the shot shows its ring', () => {
        start();
        const { container } = render(<Wired />);
        expect(sp().result).toMatchObject({ title: 'Wat een wedstrijd!', lead: 'IJsberen 0 doelpunten' });
        rightKey(); wait(800);
        rightKey(); wait(800);
        expect(dots(container)).toBe(2);
        wrongKey();
        expect(container.querySelector('.vb-bubble')!.textContent).toBe('Oeps!');
        wait(1700);
        expect(dots(container)).toBe(0);
        expect(sp().mistakes).toHaveLength(1);
        for (let i = 0; i < 4; i++) { expect(container.querySelector('.vb-ring')).toBeNull(); rightKey(); wait(800); }
        expect(dots(container)).toBe(4);
        expect(container.querySelector('.vb-ring')).not.toBeNull();
        expect(container.querySelector('.vb-tag.is-on')!.textContent).toBe('Schiet op doel!');
    });

    test('a shot in time is a goal; the score and the end lines go up', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(5_000);
        rightKey();
        expect(container.querySelector('.vb-shout.is-goal')!.textContent).toBe('GOAL!');
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 1 doelpunt');
        expect(sp().result).toMatchObject({ lead: 'IJsberen 1 doelpunt', detail: 'Nieuw record!' });
        wait(800);
        expect(dots(container)).toBe(0);
        expect(container.querySelector('.vb-ring')).toBeNull();
    });

    test('the shot uses the skin deadline: 10 s and the keeper catches it (a miss); a wrong shot is a save too', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(9_500);
        expect(sp().misses).toBe(0);
        wait(750);
        expect(sp().misses).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
        expect(sp().mistakes[0].given).toBe('');
        expect(container.querySelector('.vb-shout.is-save')!.textContent).toContain('Gevangen!');
        wait(1700);
        expect(dots(container)).toBe(0);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wrongKey();
        expect(container.querySelector('.vb-shout.is-save')).not.toBeNull();
        expect(sp().misses).toBe(1);
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 0 doelpunten');
    });

    test('help pauses the shot clock and the match clock', () => {
        start();
        render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(4_000);
        const left = progressOf(sp()).msLeft!;
        act(() => sp().openHelp());
        wait(60_000);
        expect(sp().misses).toBe(0);
        expect(progressOf(sp()).msLeft).toBe(left);
        act(() => sp().closeHelp());
        wait(5_500);
        expect(sp().misses).toBe(0);
        wait(1_000);
        expect(sp().misses).toBe(1);
    });

    test('half time: a whistle and "Rust!", the match clock and the keypad held for 2 s, then the second half', () => {
        start();
        const { container } = render(<Wired />);
        wait(89_000);
        expect(container.querySelector('.vb-rust')).toBeNull();
        wait(1_250);
        expect(container.querySelector('.vb-rust')!.textContent).toContain('Rust!');
        expect(container.querySelector('.vb-rust-art')).not.toBeNull();
        expect(sp().held).toBe(true);
        const left = progressOf(sp()).msLeft!;
        expect(left).toBeLessThanOrEqual(90_000);
        // The keypad waits during the break.
        rightKey();
        expect(sp().history).toHaveLength(0);
        wait(1_500);
        expect(progressOf(sp()).msLeft).toBe(left);
        wait(600);
        expect(container.querySelector('.vb-rust')).toBeNull();
        expect(sp().held).toBe(false);
        expect(container.querySelector('.vb-half')!.textContent).toBe('2e helft');
        wait(1_000);
        expect(progressOf(sp()).msLeft).toBeLessThan(left);
        rightKey();
        expect(sp().history).toHaveLength(1);
    });

    test('help during the break keeps the clock held until both are over', () => {
        start();
        render(<Wired />);
        wait(90_250);
        expect(sp().held).toBe(true);
        const left = progressOf(sp()).msLeft!;
        act(() => sp().openHelp());
        wait(3_000);
        expect(sp().held).toBe(false);
        expect(progressOf(sp()).msLeft).toBe(left);
        act(() => sp().closeHelp());
        wait(1_000);
        expect(progressOf(sp()).msLeft).toBeLessThan(left);
    });

    test('reduced motion: the break is a plain card', () => {
        start();
        const { container } = render(<Wired reducedMotion />);
        wait(90_250);
        expect(container.querySelector('.vb-rust')!.textContent).toContain('Rust!');
        expect(container.querySelector('.vb-rust-art')).toBeNull();
    });

    test('the final whistle ends the round with the goals as its lines; 5 minutes is 300 s', () => {
        start({ tijd: '5' });
        render(<Wired />);
        expect(progressOf(sp()).msTotal).toBe(300_000);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        rightKey();
        wait(310_000);
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('done');
        expect(sp().result).toMatchObject({ title: 'Wat een wedstrijd!', lead: 'IJsberen 1 doelpunt' });
        expect(loadBest('voetbal:test|5')).toBe(1);
    });

    test('the question cap ends the round too', () => {
        start();
        for (let i = 0; i < VOETBAL.cap; i++) {
            if (sp().phase === 'end') break;
            act(() => sp().answer(sp().question!.answer));
            act(() => sp().next());
        }
        expect(sp().phase).toBe('end');
        expect(sp().history).toHaveLength(VOETBAL.cap);
    });

    test('the ending: the cup and the team', () => {
        const { container } = render(<VoetbalEnding outcome="done" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.vb-cup')).not.toBeNull();
        expect(container.querySelectorAll('.vb-bear.is-ijs')).toHaveLength(3);
    });
});
