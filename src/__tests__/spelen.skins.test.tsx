// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, cleanup, screen, act, fireEvent } from '@testing-library/react';
import { SKINS } from '../oefenen/spelen/skins/registry';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import Pinguintoren from '../oefenen/spelen/skins/pinguintoren/Pinguintoren';
import { towerScale } from '../oefenen/spelen/skins/pinguintoren/tower';

// The skins as components: each registry entry renders, and the session's phase, progress and events
// drive what is drawn (blocks, wobble, the falling block, the paused look).

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, ...over,
});

function propsWith(over: Partial<SkinProps> = {}): SkinProps {
    return {
        question: { key: 'q1', text: '7 + 5 = ?', index: 0 },
        choices: ['12', '11', '13', '22'],
        phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(),
        progress: progressWith(), events: createSpelEvents(), reducedMotion: false,
        ...over,
    };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Spelen skins', () => {
    test('every registry entry renders its skin (lazy) with the sum and its input', async () => {
        expect(SKINS.filter(s => s.Component).map(s => s.meta.id)).toEqual(['pinguintoren', 'ballonnen']);
        for (const { meta, Component } of SKINS.filter(s => s.Component)) {
            const Skin = Component!;
            const p = propsWith({
                choices: meta.input === 'choice' ? ['12', '11', '13', '22'] : null,
                progress: progressWith({ goal: meta.round.goal ? { count: 0, target: meta.round.goal } : null, msLeft: meta.timed ? 60_000 : null }),
            });
            const { unmount } = render(<Suspense fallback={null}><Skin {...p} /></Suspense>);
            if (meta.input === 'keypad') expect(await screen.findByRole('group', { name: 'Cijfers' })).toBeTruthy();
            else expect(await screen.findByRole('group', { name: 'Kies het antwoord' })).toBeTruthy();
            expect(screen.getAllByText('7 + 5 = ?').length).toBeGreaterThan(0);
            unmount();
        }
    });

    test('Pinguïntoren: a block per climb step; right stacks with a drop-in, wrong wobbles and drops the top block', () => {
        const events = createSpelEvents();
        const at = (count: number, over: Partial<SkinProps> = {}) => propsWith({ events, choices: null, progress: progressWith({ goal: { count, target: 20 } }), ...over });
        const { container, rerender } = render(<Pinguintoren {...at(3)} />);
        const blocks = () => container.querySelectorAll('.pt-tower .pt-block').length;
        expect(blocks()).toBe(3);
        expect(container.querySelector('.is-new')).toBeNull();
        rerender(<Pinguintoren {...at(4, { phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
        expect(blocks()).toBe(4);
        expect(container.querySelector('.pt-block.is-new')).not.toBeNull();
        expect(container.querySelector('.pt-hop')).not.toBeNull();
        // The sign shows the sum with its answer during the flash.
        expect(container.querySelector('.pt-sign-answer')?.textContent).toBe('12');
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Pinguintoren {...at(3, { phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
        expect(blocks()).toBe(3);
        expect(container.querySelector('.pt-tower.is-wobble-1')).not.toBeNull();
        expect(container.querySelectorAll('.pt-fall .pt-block')).toHaveLength(1);
        expect(container.querySelector('.is-new')).toBeNull();
        // A second mistake restarts the wobble with the other copy of the animation.
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(container.querySelector('.pt-tower.is-wobble-0')).not.toBeNull();
        // Paused under "Hoe los ik dit op?"; still under reduced motion (no falling block).
        rerender(<Pinguintoren {...at(2, { phase: 'help', reducedMotion: true })} />);
        expect(container.querySelector('.pt-root.is-paused.is-still')).not.toBeNull();
        expect(container.querySelector('.pt-fall')).toBeNull();
    });

    test('Pinguïntoren: the keypad answers through the session, only while playing', () => {
        const onAnswer = vi.fn();
        const { rerender } = render(<Pinguintoren {...propsWith({ onAnswer, choices: null })} />);
        fireEvent.keyDown(window, { key: '1' });
        fireEvent.keyDown(window, { key: '2' });
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onAnswer).toHaveBeenCalledWith('12');
        rerender(<Pinguintoren {...propsWith({ onAnswer, choices: null, question: { key: 'q2', text: '8 + 5 = ?', index: 1 }, phase: 'help' })} />);
        fireEvent.keyDown(window, { key: '3' });
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    test('Pinguïntoren: the camera zooms out as the tower grows, and shows the goal line near the top', () => {
        expect(towerScale(0, 20)).toBe(1);
        expect(towerScale(5, 20)).toBe(1);
        expect(towerScale(12, 20)).toBeLessThan(1);
        // Near the goal the zoom also fits the flag; it never grows back while climbing.
        const scales = Array.from({ length: 21 }, (_, n) => towerScale(n, 20));
        expect(scales.every((s, i) => i === 0 || s <= scales[i - 1])).toBe(true);
    });
});
