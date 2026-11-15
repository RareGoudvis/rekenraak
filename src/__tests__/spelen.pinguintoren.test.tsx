// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import Pinguintoren, { PinguintorenEnding } from '../oefenen/spelen/skins/pinguintoren/Pinguintoren';
import { crackedIds, towerStart, towerStep, type TowerState } from '../oefenen/spelen/skins/pinguintoren/climb';
import { blockLook, creatureOf, penguinMood } from '../oefenen/spelen/skins/pinguintoren/tower';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';

// Pinguïntoren round 4: the tower draws the session's climb with a crack in between (climb.ts), the blocks
// vary per round, the penguin's mood follows the height, and the skin voices its own mistakes.

// The session's rule (useSpelStore): right +1, a counted mistake −1, never below 0.
function play(moves: string, start = 0): TowerState[] {
    let count = start;
    let mistakes = 0;
    let s = towerStart(count, mistakes);
    const out = [s];
    for (const m of moves) {
        if (m === 'r') count += 1;
        else { count = Math.max(0, count - 1); mistakes += 1; }
        s = towerStep(s, count, mistakes);
        out.push(s);
    }
    return out;
}

describe('Pinguïntoren climb', () => {
    test('a mistake cracks the two lowest blocks, the next one breaks them: two blocks down at once', () => {
        const [, , , , , crack, brk] = play('rrrrww');
        expect(crack).toMatchObject({ change: 'crack', cracked: true, count: 3 });
        expect(crack.blocks).toEqual([0, 1, 2, 3]);
        expect(crackedIds(crack)).toEqual([0, 1]);
        expect(brk).toMatchObject({ change: 'break', cracked: false, count: 2, breaks: 1 });
        expect(brk.broken).toEqual([0, 1]);
        // The blocks above keep their ids (and so their look) while the tower drops.
        expect(brk.blocks).toEqual([2, 3]);
    });

    test('a right answer on cracked ice freezes the cracks shut instead of adding a block', () => {
        const states = play('rrrwr');
        const heal = states[5];
        expect(heal).toMatchObject({ change: 'heal', cracked: false, count: 3 });
        expect(heal.blocks).toEqual([0, 1, 2]);
        expect(towerStep(heal, 4, 1).change).toBe('up');
    });

    test('shown blocks are always the count plus the owed block, whatever the moves', () => {
        const moves = 'rrwwwrrrwrwwrrrrwrrwwwwwrrrr';
        for (const s of play(moves)) expect(s.blocks.length).toBe(s.count + (s.cracked ? 1 : 0));
        // Ids never repeat, so a new block never replays an old block's look by accident.
        const last = play(moves).at(-1)!;
        expect(new Set(last.blocks).size).toBe(last.blocks.length);
    });

    test('at the bottom: one cracked block breaks alone; an empty floe only shakes', () => {
        const [, , crack, brk, shake] = play('rwww');
        expect(crack).toMatchObject({ change: 'crack', count: 0, blocks: [0] });
        expect(brk).toMatchObject({ change: 'break', count: 0, blocks: [], broken: [0] });
        expect(shake).toMatchObject({ change: 'shake', count: 0, blocks: [] });
    });

    test('no change gives the same state; a jump (a new round) starts over from the count', () => {
        const s = play('rr').at(-1)!;
        expect(towerStep(s, 2, 0)).toBe(s);
        const fresh = towerStep(s, 0, 0);
        expect(fresh).toMatchObject({ change: null, blocks: [], cracked: false });
        expect(towerStep(towerStep(s, 5, 3), 6, 3).blocks).toHaveLength(6);
    });
});

describe('Pinguïntoren looks', () => {
    test('blocks vary in tint, width, offset and decoration, and one early block holds the creature', () => {
        const looks = Array.from({ length: 20 }, (_, i) => blockLook(i, 42));
        expect(new Set(looks.map(l => l.shade)).size).toBeGreaterThan(2);
        expect(new Set(looks.map(l => l.width)).size).toBeGreaterThan(3);
        expect(new Set(looks.map(l => l.deco)).size).toBeGreaterThan(2);
        expect(looks.every(l => l.width >= 88 && l.width <= 110 && Math.abs(l.dx) <= 5)).toBe(true);
        expect(looks.filter(l => l.creature)).toHaveLength(1);
        const { at, kind } = creatureOf(42);
        expect(at).toBeGreaterThanOrEqual(2);
        expect(at).toBeLessThanOrEqual(6);
        expect(looks[at].creature).toBe(kind);
        // The same id and seed always look the same.
        expect(blockLook(7, 42)).toEqual(blockLook(7, 42));
        const kinds = new Set(Array.from({ length: 40 }, (_, s) => creatureOf(s).kind));
        expect(kinds).toEqual(new Set(['fish', 'crab']));
    });

    test('the penguin gets happier the higher he gets; scared on a mistake, worried on cracks', () => {
        expect([0, 3, 4, 9, 10, 16, 17, 19].map(h => penguinMood(h, 20))).toEqual(['neutral', 'neutral', 'smile', 'smile', 'grin', 'grin', 'dance', 'dance']);
        expect(penguinMood(18, 20, { wrong: true })).toBe('scared');
        expect(penguinMood(18, 20, { cracked: true })).toBe('worried');
    });
});

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
});

describe('Pinguïntoren skin', () => {
    afterEach(() => { cleanup(); vi.useRealTimers(); });
    const events = createSpelEvents();
    const sound = vi.fn();
    const at = (count: number, mistakes: number, over: Partial<SkinProps> = {}): SkinProps => ({
        question: { key: `q${count}-${mistakes}`, text: '7 + 5 = ?', index: 0 },
        choices: null, phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound,
        progress: progressWith({ goal: { count, target: 20 }, mistakes }), options: {}, events, reducedMotion: false,
        ...over,
    });
    const wrong = { phase: 'wrong' as const, feedback: { given: '11', expected: '12', correct: false } };

    test('crack, break and splash: cracks in the two lowest, then halves fly and the tower settles', () => {
        vi.useFakeTimers();
        sound.mockClear();
        const { container, rerender } = render(<Pinguintoren {...at(4, 0)} />);
        const blocks = () => container.querySelectorAll('.pt-tower .pt-block').length;
        expect(blocks()).toBe(4);
        expect(container.querySelector('.pt-snow')).not.toBeNull();
        rerender(<Pinguintoren {...at(3, 1, wrong)} />);
        expect(blocks()).toBe(4);
        expect(container.querySelectorAll('.pt-tower .spel-cracks')).toHaveLength(2);
        expect(container.querySelector('.pt-happy-eye')).toBeNull();
        expect(container.querySelector('.pt-shiver')).not.toBeNull();
        expect(sound).toHaveBeenLastCalledWith('barricade');
        // The next question: still cracked, the penguin worried.
        rerender(<Pinguintoren {...at(3, 1, { question: { key: 'next', text: '8 + 5 = ?', index: 1 } })} />);
        expect(container.querySelector('.pt-brow')).not.toBeNull();
        rerender(<Pinguintoren {...at(2, 2, { ...wrong, question: { key: 'next', text: '8 + 5 = ?', index: 1 } })} />);
        expect(blocks()).toBe(2);
        expect(container.querySelectorAll('.pt-half')).toHaveLength(4);
        expect(container.querySelector('.pt-settle')).not.toBeNull();
        expect(container.querySelector('.pt-totter')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(1050); });
        expect(container.querySelectorAll('.spel-burst.is-splash')).toHaveLength(2);
        expect(sound.mock.calls.map(c => c[0])).toEqual(['barricade', 'barricade', 'hit']);
    });

    test('a wrong flash without a counted mistake (met hulp) only wobbles, with a soft plop', () => {
        sound.mockClear();
        const { container, rerender } = render(<Pinguintoren {...at(3, 0)} />);
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Pinguintoren {...at(3, 0, wrong)} />);
        expect(container.querySelector('.pt-tower.is-wobble-1')).not.toBeNull();
        expect(container.querySelectorAll('.pt-tower .spel-cracks')).toHaveLength(0);
        expect(sound).toHaveBeenCalledWith('miss');
    });

    test('reduced motion: no seals, no flying halves, the tower simply lower', () => {
        const { container, rerender } = render(<Pinguintoren {...at(4, 0, { reducedMotion: true })} />);
        expect(container.querySelector('.pt-seal')).toBeNull();
        rerender(<Pinguintoren {...at(3, 1, { ...wrong, reducedMotion: true })} />);
        rerender(<Pinguintoren {...at(2, 2, { ...wrong, reducedMotion: true, question: { key: 'n', text: '1 + 1 = ?', index: 1 } })} />);
        expect(container.querySelectorAll('.pt-tower .pt-block')).toHaveLength(2);
        expect(container.querySelector('.pt-half')).toBeNull();
        expect(container.querySelector('.pt-settle')).toBeNull();
        expect(container.querySelector('.pt-root.is-still')).not.toBeNull();
    });

    test('the sign sizes its font for the sum with its answer, so the flash never runs off the panel', () => {
        const { container } = render(<Pinguintoren {...at(2, 0, { question: { key: 'q', text: '810 × 10 = ?', index: 0 }, ...wrong, feedback: { given: '1', expected: '8100', correct: false } })} />);
        const sign = container.querySelector<HTMLElement>('.spel-sign-box > .pt-sign.spel-sign-fit')!;
        // The shared fit (SpelSignBox): the longer line, the sum with its answer in sheet notation, sets the font.
        expect(sign.style.getPropertyValue('--sign-chars')).toBe(String('810 × 10 = 8 100'.length));
        expect(sign.textContent).toBe('810 × 10 = 8 100');
    });

    test('the ending: a dance under the flag for the goal, a smile on a smaller tower otherwise', () => {
        const won = render(<PinguintorenEnding outcome="won" progress={progressWith({ goal: { count: 20, target: 20 } })} options={{}} reducedMotion={false} />);
        expect(won.container.querySelector('.pt-dance')).not.toBeNull();
        expect(won.container.querySelector('.pt-flag')).not.toBeNull();
        won.unmount();
        const done = render(<PinguintorenEnding outcome="done" progress={progressWith({ goal: { count: 8, target: 20 } })} options={{}} reducedMotion />);
        expect(done.container.querySelector('.pt-dance')).toBeNull();
        expect(done.container.querySelectorAll('.pt-block').length).toBeGreaterThan(0);
    });
});
