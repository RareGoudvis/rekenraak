// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { CLOCK, CLOCK_ROWS, clockMs, clockSteps, nextClockStepAt } from '../oefenen/spelen/levels/clock';
import { DEFAULT_LEVEL, LEVELS, LEVEL_ID, levelOf, levelOption, migrateLevel } from '../oefenen/spelen/levels/levels';
import { OPTIONS_KEY, choicesOf, loadChoices, resolveMeta, saveChoices } from '../oefenen/spelen/skins/options';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import SpelOptions from '../oefenen/spelen/SpelOptions';

// The difficulty round (owner 2026-11-17): four levels, one clock rule, the "Hoe moeilijk?" row and old picks.

const s = (n: number) => n * 1000;

describe('The clock rule', () => {
    test('Makkelijk never has a clock', () => {
        for (const t of [0, s(30), s(600)]) expect(clockMs('makkelijk', t)).toBeNull();
        expect(nextClockStepAt('makkelijk', 0)).toBeNull();
    });

    test('12 s through the first minute, then -1 s per step at each level\'s pace, down to its floor', () => {
        for (const l of ['normaal', 'moeilijk', 'onmogelijk'] as const) {
            expect(clockMs(l, 0)).toBe(12_000);
            expect(clockMs(l, s(59.999))).toBe(12_000);
            // The first step comes when the minute is over.
            expect(clockMs(l, s(60))).toBe(11_000);
            expect(clockMs(l, s(3600))).toBe(CLOCK_ROWS[l].floorMs);
            expect(clockMs(l, -5)).toBe(CLOCK.startMs);
        }
        // Normaal: a step every 60 s, floor 8 s (at 4 minutes).
        expect([0, 60, 119, 120, 180, 240, 600].map(t => clockMs('normaal', s(t)))).toEqual([12_000, 11_000, 11_000, 10_000, 9_000, 8_000, 8_000]);
        // Moeilijk: every 45 s, floor 6 s.
        expect([60, 104, 105, 150, 195, 240, 285, 900].map(t => clockMs('moeilijk', s(t)))).toEqual([11_000, 11_000, 10_000, 9_000, 8_000, 7_000, 6_000, 6_000]);
        // Onmogelijk: every 30 s, floor 4 s.
        expect([60, 89, 90, 120, 240, 270, 900].map(t => clockMs('onmogelijk', s(t)))).toEqual([11_000, 11_000, 10_000, 9_000, 5_000, 4_000, 4_000]);
    });

    test('steps and the next step: what a game ties its own tempo to', () => {
        expect(clockSteps('normaal', s(30))).toBe(0);
        expect(clockSteps('normaal', s(130))).toBe(2);
        expect(clockSteps('onmogelijk', s(9999))).toBe(8);
        expect(nextClockStepAt('normaal', 0)).toBe(s(60));
        expect(nextClockStepAt('moeilijk', s(70))).toBe(s(105));
        expect(nextClockStepAt('normaal', s(250))).toBeNull();
    });

    test('never longer as the round goes on', () => {
        for (const l of LEVELS) {
            let prev = Infinity;
            for (let t = 0; t <= s(600); t += 500) {
                const ms = clockMs(l, t) ?? Infinity;
                expect(ms).toBeLessThanOrEqual(prev);
                prev = ms;
            }
        }
    });
});

describe('The levels and their option row', () => {
    test('four levels, Normaal preselected, a whole line, the clock icons', () => {
        const o = levelOption({ clock: true });
        expect(o).toMatchObject({ id: LEVEL_ID, label: 'Hoe moeilijk?', default: 'normaal', wide: true });
        expect(o.choices.map(c => [c.value, c.label])).toEqual([['makkelijk', 'Makkelijk'], ['normaal', 'Normaal'], ['moeilijk', 'Moeilijk'], ['onmogelijk', 'Onmogelijk']]);
        expect(o.choices.map(c => c.icon)).toEqual([{ clock: 'off' }, { clock: 'on' }, { clock: 'on', flames: 1 }, { clock: 'on', flames: 2 }]);
    });

    test('levels not about time: flames only (none, 1, 2, 3); a round patch per level', () => {
        const o = levelOption({ clock: false, rounds: { makkelijk: { questions: 8 }, onmogelijk: { questions: 20 } } });
        expect(o.choices.map(c => c.icon)).toEqual([{}, { flames: 1 }, { flames: 2 }, { flames: 3 }]);
        expect(o.choices.map(c => c.round)).toEqual([{ questions: 8 }, undefined, undefined, { questions: 20 }]);
        const meta = { id: 'x', label: 'X', input: 'choice', timed: false, round: { questions: 12 }, options: [o], accepts: {} } as unknown as SkinMeta;
        expect(resolveMeta(meta, { niveau: 'onmogelijk' }).round).toEqual({ questions: 20 });
        expect(resolveMeta(meta).round).toEqual({ questions: 12 });
    });

    test('levelOf reads the pick; absent or unknown = Normaal', () => {
        expect(levelOf({ niveau: 'onmogelijk' })).toBe('onmogelijk');
        expect(levelOf({})).toBe(DEFAULT_LEVEL);
        expect(levelOf({ niveau: 'super' })).toBe('normaal');
        expect(levelOf()).toBe('normaal');
    });
});

describe('Old remembered picks', () => {
    const meta = { id: 'demo', label: 'Demo', input: 'keypad', timed: true, round: { seconds: 180 }, options: [levelOption({ clock: true })], accepts: {} } as unknown as SkinMeta;
    afterEach(() => { localStorage.clear(); cleanup(); });

    test('the old values keep their name, anything else falls back to Normaal', () => {
        expect(migrateLevel('normaal')).toBe('normaal');
        expect(migrateLevel('moeilijk')).toBe('moeilijk');
        expect(migrateLevel('makkelijk')).toBe('makkelijk');
        expect(migrateLevel(' Moeilijk ')).toBe('moeilijk');
        for (const v of ['hard', '', null, undefined, 3, {}]) expect(migrateLevel(v)).toBe('normaal');
    });

    test('a device that remembered a two-level pick opens on that level', () => {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ demo: { niveau: 'moeilijk' }, zombies: { niveau: 'makkelijk' } }));
        expect(loadChoices(meta)).toEqual({ niveau: 'moeilijk' });
        expect(loadChoices({ ...meta, id: 'zombies' })).toEqual({ niveau: 'makkelijk' });
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ demo: { niveau: 'xx' } }));
        expect(loadChoices(meta)).toEqual({ niveau: 'normaal' });
        expect(choicesOf(meta, { niveau: 'MOEILIJK' })).toEqual({ niveau: 'moeilijk' });
        // A game whose row still has fewer levels keeps its own default for a level it lacks.
        const two = { ...meta, options: [{ ...levelOption({ clock: true }), choices: levelOption({ clock: true }).choices.slice(1, 3) }] };
        expect(choicesOf(two, { niveau: 'onmogelijk' })).toEqual({ niveau: 'normaal' });
    });

    test('the screen: the row a whole line wide with its icons; the pick is remembered', () => {
        const onStart = vi.fn();
        const withMore = { ...meta, options: [{ id: 'tijd', label: 'Hoe lang?', default: '3', choices: [{ value: '3', label: '3 minuten' }] }, levelOption({ clock: true }), { id: 'doel', label: 'Hoeveel?', default: '10', choices: [{ value: '10', label: '10' }] }] } as SkinMeta;
        const { container } = render(<SpelOptions meta={withMore} onStart={onStart} onBack={() => {}} />);
        expect(screen.getByRole('button', { name: 'Normaal' }).getAttribute('aria-pressed')).toBe('true');
        const row = container.querySelector('.kid-option.is-wide')!;
        expect(row.querySelectorAll('.kid-seg-btn')).toHaveLength(4);
        expect(row.querySelectorAll('.lv-clock')).toHaveLength(4);
        expect(row.querySelectorAll('.lv-slash')).toHaveLength(1);
        expect(row.querySelectorAll('.lv-flame')).toHaveLength(3);
        // Two half-line options pair up beside the wide row: none of them is left alone.
        expect(container.querySelector('.is-alone')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Onmogelijk' }));
        fireEvent.click(screen.getByRole('button', { name: 'Start spel' }));
        expect(onStart.mock.calls[0][0].chosen).toEqual({ tijd: '3', niveau: 'onmogelijk', doel: '10' });
        expect(loadChoices(withMore).niveau).toBe('onmogelijk');
        saveChoices('demo', { niveau: 'makkelijk' });
        expect(loadChoices(meta)).toEqual({ niveau: 'makkelijk' });
    });
});
