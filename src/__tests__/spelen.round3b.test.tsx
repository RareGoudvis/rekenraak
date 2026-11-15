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
import Prent, { PrentEnding, PrentPicture } from '../oefenen/spelen/skins/prent/Prent';
import { PRENTEN } from '../oefenen/spelen/skins/prent/prenten';
import { PRENT_KEY, TILES, flippedFor, lastPrent, pickPrent, tileOrder } from '../oefenen/spelen/skins/prent/pick';
import Schatkist, { SchatkistEnding } from '../oefenen/spelen/skins/schatkist/Schatkist';
import { CHESTS, codeOf, digitOf, newHunt, nextChest, reveal, tryCode } from '../oefenen/spelen/skins/schatkist/code';
import { NUMBER_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
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

// Schatkist with its own sound cues recorded.
function WiredSounds({ onFinish, onSound }: { onFinish(r: SkinResult): void; onSound(cue: string): void }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Schatkist question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={onSound} progress={progress} options={{}} events={st.events} reducedMotion={false} onFinish={onFinish} />
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
        // Since round 4 the garlands are one tinsel and two light strings (spelen.kerstboom.test.tsx has the rest).
        expect(DECOR.filter(d => d.kind === 'tinsel' || d.kind === 'lights')).toHaveLength(3);
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
        const hung = () => container.querySelectorAll('.kb-decor').length;
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
        expect(container.querySelector('.kb-scene.is-lit .kb-star-rays')).not.toBeNull();
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
        expect(container.querySelector('.kb-scene.is-lit .kb-star')).not.toBeNull();
        rerender(<KerstboomEnding outcome="done" progress={progress(6)} options={{}} reducedMotion />);
        expect(container.querySelector('.kb-scene.is-lit')).toBeNull();
        expect(container.querySelectorAll('.kb-decor')).toHaveLength(6);
        expect(container.querySelector('.kb-ending.is-still')).not.toBeNull();
    });
});

describe('Verborgen prent', () => {
    beforeEach(() => { localStorage.removeItem(PRENT_KEY); });

    test('registry: keypad, untimed, 16 tiles to flip (goalKeep), 30 questions at most, no season', () => {
        expect(skinById('prent')!.meta).toMatchObject({ input: 'keypad', timed: false, round: { questions: 30, goal: 16, goalKeep: true }, accepts: { kinds: ['number'] } });
        expect(skinById('prent')!.meta.season).toBeUndefined();
        expect(TILES).toBe(16);
    });

    test('eight funny animals, each its own picture', () => {
        expect(PRENTEN).toHaveLength(8);
        expect(new Set(PRENTEN.map(p => p.id)).size).toBe(8);
        for (const p of PRENTEN) {
            const { container, unmount } = render(<svg><p.Art /></svg>);
            expect(container.querySelector('.prent-art')).not.toBeNull();
            unmount();
        }
        const { container } = render(<PrentPicture prent={PRENTEN[0]} gone="all" label="De prent" />);
        expect(container.querySelectorAll('.pr-tile')).toHaveLength(0);
        expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('De prent');
    });

    test('the pick: random, never the last one; one picture stays itself; the tiles are a shuffle', () => {
        const ids = PRENTEN.map(p => p.id);
        for (const last of ids) {
            for (const r of [0, 0.2, 0.5, 0.8, 0.999]) {
                const id = pickPrent(ids, last, () => r);
                expect(ids).toContain(id);
                expect(id).not.toBe(last);
            }
        }
        expect(new Set(Array.from({ length: 40 }, (_, i) => pickPrent(ids, null, () => i / 40))).size).toBe(8);
        expect(pickPrent(['giraf'], 'giraf')).toBe('giraf');
        const order = tileOrder();
        expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
        expect(flippedFor(0, 16)).toBe(0);
        expect(flippedFor(7, 16)).toBe(7);
        expect(flippedFor(16, 16)).toBe(16);
        expect(flippedFor(9, 10)).toBeLessThan(16);
    });

    test('a tile flips per right answer (met hulp too), none comes back on a mistake; 16 end the round', () => {
        start('prent');
        const { container } = render(<Wired Skin={Prent} />);
        const gone = () => container.querySelectorAll('.pr-tile.is-gone').length;
        expect(container.querySelectorAll('.pr-tile')).toHaveLength(16);
        expect(gone()).toBe(0);
        right();
        expect(gone()).toBe(1);
        wrong();
        wrong();
        expect(gone()).toBe(1);
        helped();
        right();
        expect(gone()).toBe(2);
        for (let i = 0; i < 13; i++) right();
        expect(gone()).toBe(15);
        expect(gone()).toBe(sp().history.filter(h => h.correct).length);
        act(() => sp().answer(sp().question!.answer));
        expect(gone()).toBe(16);
        expect(container.querySelector('.pr-root.is-done')).not.toBeNull();
        act(() => sp().next());
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('won');
    });

    test('never the same picture twice in a row; the end screen shows the picture of the round', () => {
        const shown: string[] = [];
        for (let i = 0; i < 12; i++) {
            start('prent');
            const { container, unmount } = render(<Wired Skin={Prent} />);
            shown.push(container.querySelector('[data-prent]')!.getAttribute('data-prent')!);
            unmount();
            const end = render(<PrentEnding outcome="won" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
            expect(end.container.querySelector('[data-prent]')!.getAttribute('data-prent')).toBe(shown[i]);
            expect(end.container.querySelectorAll('.pr-tile')).toHaveLength(0);
            end.unmount();
        }
        for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1]);
        // The picture's own label is its id (prenten/index.ts).
        expect(lastPrent()).toBe(shown.at(-1));
    });

    test('without localStorage the game still picks and plays', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(lastPrent()).toBeNull();
        start('prent');
        const { container } = render(<Wired Skin={Prent} />);
        expect(container.querySelector('[data-prent]')).not.toBeNull();
        right();
        expect(container.querySelectorAll('.pr-tile.is-gone')).toHaveLength(1);
    });
});

describe('Schatkist', () => {
    test('registry: keypad, untimed, digits-only content, a hidden cap; its own finish ends the round', () => {
        const meta = skinById('schatkist')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: false, round: { cap: 60 }, accepts: { kinds: ['number'], digits: true } });
        expect(meta.round.goal).toBeUndefined();
        expect(skinAccepts(meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(skinAccepts(meta.accepts, { kind: 'number' })).toBe(false);
    });

    test('the hunt: digits are the last digits of the right answers, in order; the code is those four; three chests', () => {
        expect(digitOf('47')).toBe('7');
        expect(digitOf('100')).toBe('0');
        expect(digitOf('5')).toBe('5');
        expect(digitOf('1 047')).toBe('7');
        let h = newHunt();
        for (const a of ['47', '13', '90', '8']) h = reveal(h, a);
        expect(h.digits).toEqual(['7', '3', '0', '8']);
        expect(h.stage).toBe('code');
        expect(h.last).toEqual({ answer: '8', digit: '8' });
        // No more digits once the lock is up.
        expect(reveal(h, '55')).toBe(h);
        expect(codeOf(h)).toBe('7308');
        const miss = tryCode(h, '8037');
        expect(miss).toMatchObject({ stage: 'code', misses: 1, digits: ['7', '3', '0', '8'] });
        expect(tryCode(miss, '730')).toMatchObject({ stage: 'code', misses: 2 });
        const open = tryCode(miss, '7308');
        expect(open.stage).toBe('open');
        h = nextChest(open);
        expect(h).toMatchObject({ chest: 1, digits: [], stage: 'sums', misses: 0, last: null });
        h = nextChest(tryCode(['1', '2', '3', '4'].reduce(reveal, h), '1234'));
        expect(h.chest).toBe(CHESTS - 1);
        expect(nextChest(tryCode(['5', '6', '7', '8'].reduce(reveal, h), '5678')).stage).toBe('done');
    });

    describe('on the real session (fake clock)', () => {
        beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); });
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

        test('right answers reveal their last digit, wrong ones none; the code opens the chest; three chests finish', () => {
            start('schatkist');
            const finished: SkinResult[] = [];
            const sounds: string[] = [];
            const { container } = render(<WiredSounds onFinish={r => { finished.push(r); sp().finish(r); }} onSound={c => sounds.push(c)} />);
            const shown = () => [...container.querySelectorAll('.sk-digit')].map(d => d.textContent).join('');
            const note = () => container.querySelector('.sk-note')!.textContent;
            for (let chest = 0; chest < CHESTS; chest++) {
                const expected: string[] = [];
                expect(container.querySelector('.sk-chests')!.textContent).toBe(`Kist ${chest + 1} van 3`);
                for (let d = 0; d < 4; d++) {
                    if (chest === 0 && d === 1) {
                        // A wrong sum: no digit.
                        act(() => sp().answer(String(Number(sp().question!.answer) + 1)));
                        expect(note()).toBe('Geen cijfer deze keer.');
                        act(() => sp().next());
                        expect(shown()).toBe(expected.join(''));
                    }
                    if (chest === 1 && d === 2) helped();
                    const a = sp().question!.answer;
                    act(() => sp().answer(a));
                    expected.push(a.slice(-1));
                    expect(shown()).toBe(expected.join(''));
                    expect(note()).toBe(`Het antwoord was ${a}, dus het cijfer is ${a.slice(-1)}.`);
                    act(() => sp().next());
                }
                // The lock: the sum makes way for "Typ de code" (the shell hides its help button then).
                expect(container.querySelector('.sk-root.is-code')).not.toBeNull();
                expect(container.querySelector('.sk-sign')!.textContent).toBe('Typ de code');
                const code = expected.join('');
                if (chest === 0) {
                    const bad = code === '1234' ? '4321' : '1234';
                    typeKeys(bad);
                    expect(container.querySelector('.sk-root.is-code')).not.toBeNull();
                    expect(container.querySelector('.sk-lock.is-shake-1')).not.toBeNull();
                    expect(note()).toBe('Kijk nog eens goed naar de cijfers.');
                    expect(shown()).toBe(code);
                    expect(sounds).toEqual(['lost']);
                }
                // At most four digits go into the lock, shown as typed.
                for (const k of code + '9') fireEvent.keyDown(window, { key: k });
                expect([...container.querySelectorAll('.sk-window-num')].map(t => t.textContent).join('')).toBe(code);
                fireEvent.keyDown(window, { key: 'Enter' });
                expect(container.querySelector('.sk-chest.is-open .sk-coin')).not.toBeNull();
                expect(note()).toBe('De kist is open!');
                // Nothing typed reaches the session while the chest is open.
                const answered = sp().history.length;
                typeKeys(sp().question!.answer);
                expect(sp().history.length).toBe(answered);
                wait(2000);
            }
            expect(finished).toHaveLength(1);
            expect(finished[0].title).toBe('De schat is van jou!');
            expect(sp().phase).toBe('end');
            // The last chest's coins sound with the end screen; the first two opened with their own jingle.
            expect(sounds).toEqual(['lost', 'win', 'win']);
            expect(sp().score).toBe(11);
            expect(sp().helped).toBe(1);
            expect(sp().mistakes).toHaveLength(1);
            const end = render(<SchatkistEnding outcome="done" progress={progressOf(sp())} options={{}} reducedMotion />);
            expect(end.container.querySelector('.sk-ending.is-still .sk-chest.is-open')).not.toBeNull();
        });

        test('help mid-hunt keeps the digits; sums still answer by keyboard', () => {
            start('schatkist');
            const { container } = render(<Wired Skin={Schatkist} />);
            const a = sp().question!.answer;
            typeKeys(a);
            expect(names()).toEqual(['correct']);
            act(() => sp().next());
            act(() => sp().openHelp());
            expect(container.querySelector('.sk-root.is-paused')).not.toBeNull();
            act(() => sp().closeHelp());
            expect(container.querySelector('.sk-digit')!.textContent).toBe(a.slice(-1));
            typeKeys(sp().question!.answer);
            expect(container.querySelectorAll('.sk-digit:not(.is-empty)')).toHaveLength(2);
        });
    });
});
