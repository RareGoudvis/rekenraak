// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase, SkinProps } from '../oefenen/spelen/skins/types';
import { NUMBER_CONTENT, PICTURE_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { createSpelEvents, type SpelEventName } from '../oefenen/spelen/events';
import { soundFor } from '../oefenen/spelen/sound';
import { klokQuestion } from '../oefenen/spelen/content/klok/klokPack';
import { formatDigitalTime, formatTimeText } from '../services/clock/clockTypes';
import Zeehond from '../oefenen/spelen/skins/zeehond/Zeehond';
import { fishLeft, flightOf, ZEEHOND_ROUND } from '../oefenen/spelen/skins/zeehond/feed';
import { resetKiosk } from './helpers/oefenKiosk';

// Zeehondjes voeren: the registry entry and what it plays, the skin on the real session (right / wrong / help,
// keys 1–4, the bucket), the reduced-motion path and clock faces on the signs.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    log.length = 0;
    for (const name of ['correct', 'wrong', 'help', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); });

const start = () => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('zeehond')!.meta }));

function Wired({ reducedMotion = false }: { reducedMotion?: boolean }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Zeehond question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={reducedMotion} />
    );
}
const seals = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).getAllByRole('button') as HTMLButtonElement[];
const tapValue = (value: string) => fireEvent.click(seals().find(b => b.getAttribute('aria-label') === value)!);
const wrongOf = () => sp().question!.choices.find(c => c !== sp().question!.answer)!;
const names = () => log.map(l => l.name);
const bucket = (c: HTMLElement) => c.querySelector('.zh-bucket')!.getAttribute('aria-label');

describe('Zeehondjes voeren', () => {
    test('registry: a calm untimed choice skin, 15 sums, picture content, answers up to 5 characters, its own sounds', () => {
        const entry = skinById('zeehond')!;
        expect(entry.Component).toBeDefined();
        expect(entry.meta).toMatchObject({ label: 'Zeehondjes voeren', input: 'choice', timed: false, round: { questions: ZEEHOND_ROUND } });
        expect(entry.meta.season).toBeUndefined();
        expect(entry.meta.canFail).toBeUndefined();
        expect(entry.meta.accepts).toEqual({ kinds: ['number', 'choice'], pictures: true, maxAnswerChars: 5 });
        expect(skinAccepts(entry.meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, PICTURE_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, { kind: 'choice', answerChars: 5 })).toBe(true);
        expect(skinAccepts(entry.meta.accepts, { kind: 'choice', answerChars: 6 })).toBe(false);
        expect(skinAccepts(entry.meta.accepts, { kind: 'pair' })).toBe(false);
        expect(soundFor(entry.meta.sounds, 'correct', { given: '1', streak: 1 })).toBe('ork');
        expect(soundFor(entry.meta.sounds, 'wrong', { given: '2', expected: '1' })).toBe('plons');
    });

    test('the bucket holds one fish per sum; a fish leaves only when a seal eats it; the throw arcs above both ends', () => {
        expect(fishLeft({ total: 15, right: 0 })).toBe(15);
        expect(fishLeft({ total: 15, right: 4 })).toBe(11);
        expect(fishLeft({ total: 15, right: 20 })).toBe(0);
        expect(fishLeft({ total: null, right: 2 })).toBe(13);
        const box = { left: 10, top: 20, width: 1000, height: 700 };
        const f = flightOf('k', box, { left: 500, top: 600, width: 10, height: 10 }, { left: 100, top: 300, width: 10, height: 10 });
        expect(f).toMatchObject({ key: 'k', x: 495, y: 585, dx: -400, dy: -300 });
        expect(f.arc).toBeLessThan(f.dy);
    });

    test('a round: right feeds the seal (correct), wrong turns it away (wrong) and the right seal waves; 15 sums end it', () => {
        start();
        const { container } = render(<Wired />);
        expect(seals()).toHaveLength(4);
        expect(bucket(container)).toBe('Nog 15 vissen in de emmer');
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.zh-spot.is-fed')).not.toBeNull();
        expect(container.querySelector('.zh-fly')).not.toBeNull();
        expect(container.querySelector('.zh-fed-fish')).toBeNull();
        expect(bucket(container)).toBe('Nog 14 vissen in de emmer');
        // Every seal waits during the flash.
        expect(seals().every(b => b.disabled)).toBe(true);
        act(() => sp().next());
        expect(container.querySelector('.zh-fly')).toBeNull();

        const wrong = wrongOf();
        tapValue(wrong);
        expect(names()).toEqual(['correct', 'wrong']);
        expect(log[1].payload).toMatchObject({ given: wrong });
        expect(container.querySelector('.zh-spot.is-nope .zh-board')!.textContent).toBe(wrong);
        expect(container.querySelector('.zh-spot.is-answer .zh-board')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.zh-sign-answer')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.zh-fly')).toBeNull();
        expect(bucket(container)).toBe('Nog 14 vissen in de emmer');
        act(() => sp().next());

        // Help pauses the round: no seal takes a tap.
        act(() => sp().openHelp());
        expect(names()).toEqual(['correct', 'wrong', 'help']);
        expect(container.querySelector('.zh-root.is-paused')).not.toBeNull();
        expect(seals().every(b => b.disabled)).toBe(true);
        act(() => sp().closeHelp());
        tapValue(sp().question!.answer);
        act(() => sp().next());
        for (let i = 3; i < ZEEHOND_ROUND; i++) {
            tapValue(sp().question!.answer);
            act(() => sp().next());
        }
        expect(sp().phase).toBe('end');
        expect(names().filter(n => n === 'correct')).toHaveLength(14);
        expect(names().at(-1)).toBe('end');
    });

    test('keys 1–4 pick a seal; other keys do nothing', () => {
        start();
        render(<Wired />);
        fireEvent.keyDown(window, { key: '5' });
        fireEvent.keyDown(window, { key: 'a' });
        expect(names()).toEqual([]);
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(names()).toEqual(['correct']);
        act(() => sp().next());
        const q2 = sp().question!;
        const w = q2.choices.findIndex(c => c !== q2.answer);
        fireEvent.keyDown(window, { key: String(w + 1) });
        expect(names()).toEqual(['correct', 'wrong']);
    });

    test('reduced motion: no flying fish, the fish is simply at the seal', () => {
        start();
        const { container } = render(<Wired reducedMotion />);
        expect(container.querySelector('.zh-root.is-still')).not.toBeNull();
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.zh-fly')).toBeNull();
        expect(container.querySelector('.zh-bubbles')).toBeNull();
        expect(container.querySelector('.zh-spot.is-fed .zh-fed-fish')).not.toBeNull();
    });

    test('klok content: clock faces on the signs, named by their view; a tap hands back the value', () => {
        const exercise = { id: 'x', hours: 8, minutes: 15, timeText: formatTimeText(8, 15, false), digitalText: formatDigitalTime(8, 15), isManuallyEdited: false, clockType: 'analoog' as const, exerciseMode: 'tekenen' as const };
        const q = klokQuestion(exercise, { clockType: 'analoog', exerciseMode: 'tekenen', timeTypes: ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'] }, 'q1', 4)!;
        const onAnswer = vi.fn();
        const props: SkinProps = {
            question: { key: 'q1', text: q.text, index: 0, visual: q.visual }, choices: q.choices, views: q.views,
            phase: 'play', feedback: null, onAnswer, onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
            progress: { answered: 0, total: 15, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null },
            options: {}, events: createSpelEvents(), reducedMotion: false,
        };
        const { container } = render(<Zeehond {...props} />);
        expect(container.querySelector('.zh-root.has-pictures')).not.toBeNull();
        expect(container.querySelector('.zh-sign.spel-sign-has-pic')).not.toBeNull();
        expect(container.querySelectorAll('.zh-board.is-picture .spel-klok')).toHaveLength(4);
        const i = q.choices.indexOf(q.answer);
        fireEvent.click(screen.getByRole('button', { name: q.views[i].label }));
        expect(onAnswer).toHaveBeenCalledWith(q.answer);
    });
});
