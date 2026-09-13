// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import { generateWeegschaalExercises } from '../services/weegschaal/weegschaalGenerator';
import WeegschaalViewer from '../components/viewer/WeegschaalViewer';
import { generateClockExercises } from '../services/clock/clockGenerator';
import ClockExerciseItem from '../components/viewer/ClockExerciseItem';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { MathBlock } from '../services/math/types';
import type { WeegschaalConstraints } from '../services/math/constraintTypes';

// Own-data rule: an exercise renders from the fields it was generated with, and a later
// settings drift (before the teacher presses Genereer again) must not change what an
// already-generated exercise draws. See .claude/docs/BUGS.md "Stale settings draw the
// wrong picture" and the fix(plaatswaarde) pattern (ffcccdc) this mirrors.

afterEach(() => cleanup());

describe('weegschaal renders from its own bereik/step/notatie/mode', () => {
    test('a bereik drift after generation never sends the needle round a shrunken dial', () => {
        const block = makeBlock('weegschaal', {
            constraints: { mode: 'aflezen', bereikGram: 5000, stepGram: 250, notatie: 'g', exercisesPerRow: 2, boxHeight: 170 },
            block: { numberOfExercises: 3 },
        });
        const exercises = generateWeegschaalExercises(block);
        expect(exercises.length).toBeGreaterThan(0);
        // Every exercise remembers the dial it was drawn on.
        for (const ex of exercises) {
            expect(ex.bereikGram).toBe(5000);
            expect(ex.stepGram).toBe(250);
        }

        // Drift the block's settings to a much smaller dial WITHOUT regenerating —
        // exactly what updateBlockSettings does between a settings change and Genereer.
        const drifted: MathBlock = {
            ...block,
            constraints: { ...block.constraints, bereikGram: 1000, stepGram: 50 } as WeegschaalConstraints,
            weegschaalExercises: exercises,
        };

        render(
            <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                <WeegschaalViewer block={drifted} showSolutions={false} />
            </BlockWidthProvider>,
        );

        // The dial face still labels itself in kg (only bereik >= 2000 does), and the
        // needle still points at grams/5000 of a turn, not grams/1000 — the tell-tale
        // symptom from BUGS.md is the needle spinning past a full turn on a shrunken dial.
        const svgs = document.querySelectorAll('svg');
        expect(svgs.length).toBe(exercises.length);

        const first = exercises[0];

        // Unit label: bereik 5000 draws 'kg', the drifted 1000 would draw 'g'.
        const unitTexts = Array.from(document.querySelectorAll('svg text')).map(t => t.textContent);
        expect(unitTexts).toContain('kg');
        expect(unitTexts).not.toContain('g');

        // Needle endpoint follows bereik = 5000, not the drifted 1000: recompute the
        // expected angle from the exercise's own bereik and compare to what's drawn.
        const needleLine = document.querySelector('svg line[stroke="#000"][stroke-linecap="round"]');
        expect(needleLine).toBeTruthy();
        const size = Math.max(120, Math.min(220, 170));
        const rOuter = size / 2 - 6;
        const rn = rOuter - 16;
        const expectedAngle = (first.grams / first.bereikGram!) * 2 * Math.PI - Math.PI / 2;
        const expectedX2 = size / 2 + rn * Math.cos(expectedAngle);
        const expectedY2 = size / 2 + rn * Math.sin(expectedAngle);
        expect(Number(needleLine!.getAttribute('x2'))).toBeCloseTo(expectedX2, 3);
        expect(Number(needleLine!.getAttribute('y2'))).toBeCloseTo(expectedY2, 3);
    });
});

describe('klok renders from its own mode/clockType/is24hour/handChoice', () => {
    test('an exerciseMode drift after generation never prints the time it asks the pupil to draw', () => {
        const block = makeBlock('klok-kloklezen', {
            constraints: { clockType: 'digitaal', exerciseMode: 'lezen', is24hour: false, timeTypes: ['uren', 'halve_uren'], minuteDirection: 'beide', handChoice: 'beide' },
            block: { numberOfExercises: 3 },
        });
        const exercises = generateClockExercises(block);
        expect(exercises.length).toBeGreaterThan(0);
        for (const ex of exercises) {
            expect(ex.exerciseMode).toBe('lezen');
            expect(ex.clockType).toBe('digitaal');
        }

        const ex = exercises[0];

        // Drift the block to 'tekenen' WITHOUT regenerating — the item must still render
        // this exercise the way 'lezen' does (digital time shown, pupil fills in words),
        // never the 'tekenen' way (time in words shown, digital box left blank).
        const drifted: MathBlock = {
            ...block,
            constraints: { ...block.constraints, exerciseMode: 'tekenen' },
        };

        render(<ClockExerciseItem ex={ex} block={drifted} showSolutions={false} />);

        // 'lezen' always shows the digital time as the prompt.
        expect(screen.getByText(ex.digitalText)).toBeTruthy();
        // 'tekenen' + digitaal would instead print an empty '__:__' box for the pupil.
        expect(screen.queryByText('__:__')).toBeNull();
        // 'tekenen' would print the words prompt above the clock — 'lezen' never does.
        expect(screen.queryByText(ex.timeText)).toBeNull();
    });

    test('a clockType drift after generation keeps rendering the analog clock it was drawn with', () => {
        const block = makeBlock('klok-kloklezen', {
            constraints: { clockType: 'analoog', exerciseMode: 'lezen', is24hour: false, timeTypes: ['uren'], minuteDirection: 'beide', handChoice: 'beide' },
            block: { numberOfExercises: 3 },
        });
        const exercises = generateClockExercises(block);
        const ex = exercises[0];

        const drifted: MathBlock = {
            ...block,
            constraints: { ...block.constraints, clockType: 'digitaal' },
        };

        const { container } = render(<ClockExerciseItem ex={ex} block={drifted} showSolutions={false} />);

        // 'analoog' renders an SVG clock face; 'digitaal' would render a bordered digit box instead.
        expect(container.querySelector('svg')).toBeTruthy();
    });
});
