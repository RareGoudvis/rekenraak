// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import Bever, { BeverEnding } from '../oefenen/spelen/skins/bever/Bever';
import { BEVER, damHeight, waterLevel } from '../oefenen/spelen/skins/bever/water';
import { FAMILY, actOf, beaverFace, dayOf, familyMood } from '../oefenen/spelen/skins/bever/family';

// Bever round 4: the family behind the dam (its mood follows the water), what the beaver does per stick,
// the light over the round, and the endings with the family (a party on the dam, or the raft and the swimmer).

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: 180_000, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: 180_000, ...over,
});
const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
    question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
    onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
    progress: progressWith(), options: {}, events: createSpelEvents(), reducedMotion: false, ...over,
});
const rootOf = (c: HTMLElement) => c.querySelector('.bv-root')!;

afterEach(() => { cleanup(); });

describe('Bever family', () => {
    test('the family plays while the dam is well above the water, watches as it comes closer, gets nervous near the top', () => {
        expect(familyMood(10, 1)).toBe('play');
        expect(familyMood(10, 10 - FAMILY.watch)).toBe('play');
        expect(familyMood(10, 10 - FAMILY.watch + 0.1)).toBe('watch');
        expect(familyMood(10, 10 - FAMILY.nervous)).toBe('watch');
        expect(familyMood(10, 10 - FAMILY.nervous + 0.1)).toBe('nervous');
        // At the start of a round they play; the nervous band starts before the splash over the top (1.5).
        expect(familyMood(damHeight(0), waterLevel('normaal', 0, 0))).toBe('play');
        expect(FAMILY.nervous).toBeGreaterThan(1.5);
        expect(FAMILY.watch).toBeGreaterThan(FAMILY.nervous);
    });

    test('per stick: a cheer on every third in a row, a wipe of the brow every fourth stick, else just placing it', () => {
        expect([1, 2, 3, 4, 5, 6, 7, 8].map(n => actOf(n, 1))).toEqual(['place', 'place', 'wipe', 'place', 'place', 'place', 'wipe', 'place']);
        expect(actOf(1, 3)).toBe('cheer');
        expect(actOf(3, 6)).toBe('cheer');
        expect(actOf(2, 4)).toBe('place');
        expect(beaverFace('play', false, false)).toBe('busy');
        expect(beaverFace('play', true, false)).toBe('worried');
        expect(beaverFace('nervous', false, false)).toBe('worried');
        expect(beaverFace('nervous', false, true)).toBe('happy');
    });

    test('the light goes from morning to evening with the clock, and stays morning untimed', () => {
        expect(dayOf(180_000, 180_000)).toBe(0);
        expect(dayOf(90_000, 180_000)).toBe(0.5);
        expect(dayOf(0, 180_000)).toBe(1);
        expect(dayOf(-500, 180_000)).toBe(1);
        expect(dayOf(null, null)).toBe(0);
    });

    test('the scene: the lodge and three babies behind the dam, their mood on the root; a streak cheers, a mistake ends it', () => {
        const { container, rerender } = render(<Bever {...propsWith()} />);
        expect(container.querySelectorAll('.bv-lodge')).toHaveLength(1);
        expect(container.querySelectorAll('.bv-baby')).toHaveLength(3);
        expect(rootOf(container).classList.contains('is-play')).toBe(true);
        // The family is no part of the dam: its count stays one stick per layer.
        expect(container.querySelectorAll('.bv-dam .bv-stick')).toHaveLength(BEVER.dam0);
        // Water two sticks under the top (normaal: wave 1 per mistake): nervous, the dam still holds.
        const close = BEVER.dam0 - BEVER.water0 - 1.5;
        rerender(<Bever {...propsWith({ progress: progressWith({ mistakes: close }) })} />);
        expect(rootOf(container).classList.contains('is-nervous')).toBe(true);
        expect(container.querySelector('.bv-baby .bv-eye-white')).not.toBeNull();
        // Three right in a row: the third stick is a cheer, and it lasts into the next question.
        rerender(<Bever {...propsWith({ progress: progressWith({ right: 3, streak: 3, mistakes: close }), phase: 'right' })} />);
        expect(container.querySelector('.bv-act.is-cheer')).not.toBeNull();
        rerender(<Bever {...propsWith({ progress: progressWith({ right: 3, streak: 3, mistakes: close }) })} />);
        expect(rootOf(container).classList.contains('is-cheer')).toBe(true);
        rerender(<Bever {...propsWith({ progress: progressWith({ right: 3, streak: 0, mistakes: close + 1 }), phase: 'wrong' })} />);
        expect(rootOf(container).classList.contains('is-cheer')).toBe(false);
        expect(rootOf(container).classList.contains('is-wrong')).toBe(true);
    });

    test('reduced motion: no bird, no dragonfly, no wave; the day light still follows the clock', () => {
        const { container } = render(<Bever {...propsWith({ reducedMotion: true, progress: progressWith({ msLeft: 90_000, mistakes: 1 }) })} />);
        expect(rootOf(container).classList.contains('is-still')).toBe(true);
        expect(container.querySelector('.bv-bird')).toBeNull();
        expect(container.querySelector('.bv-dfly')).toBeNull();
        expect(container.querySelector('.bv-wave')).toBeNull();
        expect((rootOf(container) as HTMLElement).style.getPropertyValue('--bv-day')).toBe('0.5');
    });

    test('the endings: held = the whole family partying on the dam; broken = three babies on a log and dad swimming after them', () => {
        const p = progressWith();
        const { container, rerender } = render(<BeverEnding outcome="won" progress={p} options={{}} reducedMotion={false} />);
        expect(container.querySelectorAll('.bv-party')).toHaveLength(4);
        expect(container.querySelectorAll('.bv-baby-art .bv-hat')).toHaveLength(3);
        expect(container.querySelector('.bv-lodge')).not.toBeNull();
        rerender(<BeverEnding outcome="failed" progress={p} options={{}} reducedMotion />);
        expect(container.querySelectorAll('.bv-raft .bv-baby-art')).toHaveLength(3);
        expect(container.querySelector('.bv-raft .bv-log')).not.toBeNull();
        expect(container.querySelector('.bv-swim .bv-beaver-art')).not.toBeNull();
        expect(container.querySelector('.bv-ending.is-still')).not.toBeNull();
    });
});
