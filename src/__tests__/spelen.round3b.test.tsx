// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase, SkinProps, SkinResult } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import Kerstboom, { KerstboomEnding } from '../oefenen/spelen/skins/kerstboom/Kerstboom';
import { DECOR, DECOR_ALL, hungFor } from '../oefenen/spelen/skins/kerstboom/tree';
import { resetKiosk } from './helpers/oefenKiosk';

// Spelen round 3B: Kerstboom versieren, Verborgen prent and Schatkist on the real session.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];
const names = () => log.map(l => l.name);

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
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = (id: string) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById(id)!.meta }));
const right = () => { act(() => sp().answer(sp().question!.answer)); act(() => sp().next()); };
const wrong = () => { act(() => sp().answer(String(Number(sp().question!.answer) + 1))); act(() => sp().next()); };
const helped = () => { act(() => sp().openHelp()); act(() => sp().closeHelp()); };

// A skin on the real session, the way SpelScreen wires it (without the lazy chunk and the shell).
function Wired({ Skin, onFinish }: { Skin: ComponentType<SkinProps>; onFinish?(r: SkinResult): void }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Skin question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={false}
            onFinish={onFinish ?? st.finish} />
    );
}

// Types a number on the physical keyboard and presses Enter (SpelKeypad listens on window).
const typeKeys = (value: string) => {
    for (const k of value) fireEvent.keyDown(window, { key: k });
    fireEvent.keyDown(window, { key: 'Enter' });
};

describe('Kerstboom versieren', () => {
    test('registry: Kerst, keypad, untimed, a climb to 15 that never drops, 30 questions at most', () => {
        expect(skinById('kerstboom')!.meta).toMatchObject({
            input: 'keypad', timed: false, season: 'kerst', round: { questions: 30, goal: 15, goalKeep: true }, accepts: { kinds: ['number'] },
        });
        expect(DECOR_ALL).toBe(15);
        expect(DECOR.filter(d => d.kind === 'tinsel')).toHaveLength(3);
    });

    test('hungFor: one decoration per right answer, the star at the goal; another goal is scaled', () => {
        expect(Array.from({ length: 16 }, (_, i) => hungFor(i, 15))).toEqual(Array.from({ length: 16 }, (_, i) => i));
        expect(hungFor(20, 15)).toBe(15);
        expect(hungFor(10, 10)).toBe(15);
        expect(hungFor(9, 10)).toBeLessThan(15);
        expect(hungFor(0, 0)).toBe(0);
    });

    test('a decoration per right answer (met hulp too), none lost on a mistake; the star and the lights at 15, then the round ends', () => {
        start('kerstboom');
        const { container } = render(<Wired Skin={Kerstboom} />);
        const hung = () => container.querySelectorAll('.kb-bauble, .kb-tinsel').length;
        expect(hung()).toBe(0);
        right();
        right();
        expect(hung()).toBe(2);
        wrong();
        expect(hung()).toBe(2);
        expect(sp().climb).toBe(2);
        // Help pauses the round; that answer still hangs one (met hulp), and the round goes on.
        helped();
        right();
        expect(hung()).toBe(3);
        expect(sp().helped).toBe(1);
        for (let i = 0; i < 11; i++) right();
        expect(hung()).toBe(14);
        expect(container.querySelector('.kb-star')).toBeNull();
        act(() => sp().answer(sp().question!.answer));
        expect(container.querySelector('.kb-star')).not.toBeNull();
        expect(container.querySelector('.kb-tree.is-lit .kb-light')).not.toBeNull();
        act(() => sp().next());
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('won');
        expect(sp().mistakes).toHaveLength(1);
    });

    test('keyboard answers; 30 wrong answers end the round without a star', () => {
        start('kerstboom');
        render(<Wired Skin={Kerstboom} />);
        typeKeys(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        act(() => sp().next());
        for (let i = 0; i < 29; i++) wrong();
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('done');
        expect(sp().climb).toBe(1);
    });

    test('the ending: the tree as far as it got, lit only when finished', () => {
        const progress = (count: number) => progressOf({ ...sp(), meta: skinById('kerstboom')!.meta, climb: count });
        const { container, rerender } = render(<KerstboomEnding outcome="won" progress={progress(15)} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.kb-tree.is-lit .kb-star')).not.toBeNull();
        rerender(<KerstboomEnding outcome="done" progress={progress(6)} options={{}} reducedMotion />);
        expect(container.querySelector('.kb-tree.is-lit')).toBeNull();
        expect(container.querySelectorAll('.kb-bauble, .kb-tinsel')).toHaveLength(6);
        expect(container.querySelector('.kb-ending.is-still')).not.toBeNull();
    });
});
