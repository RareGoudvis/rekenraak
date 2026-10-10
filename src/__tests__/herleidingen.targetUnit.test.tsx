// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { HerleidingExercise, MathBlock } from '../services/math/types';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import HerleidingenConfig from '../components/configurator/plugins/HerleidingenConfig';
import { generateHerleidingExercises, recomputeHerleiding, targetUnitOf } from '../services/herleidingen/herleidingenGenerator';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInstructionOf } from '../services/oefenen/kiosk';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { makeBlock } from './helpers/makeBlock';

// Decision 7 (2026-10-10): with "Leerling schrijft de eenheden zelf" each exercise names its
// target unit ("Zet om naar m"), so writing the unit is still the task but the task has a point.
// "Doeleenheid tonen" (showTargetUnit, absent = on) off = today's free choice.

afterEach(cleanup);

const ex = (from: Array<[number, string]>, to: Array<[number, string]>, format: HerleidingExercise['format'] = 'enkel-getal', blank: 'number' | 'unit' = 'number'): HerleidingExercise => ({
    id: 'h', format, blank, isManuallyEdited: false,
    fromParts: from.map(([value, key]) => ({ value, key })), toParts: to.map(([value, key]) => ({ value, key })),
});
const SINGLE = ex([[3, 'm']], [[300, 'cm']]);
const COMPOUND = ex([[235, 'cm']], [[2, 'm'], [35, 'cm']], 'enkel-samengesteld');
const LENGTE = { measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'] };
const block = (e: HerleidingExercise, extra: Record<string, unknown> = {}) =>
    ({ id: 'b', typeId: 'herleidingen', constraints: { ...LENGTE, ...extra }, herleidingExercises: [e] }) as unknown as MathBlock;

describe('generator: every single-quantity number blank names a target unit', () => {
    const MEASURES: Array<[string, Record<string, unknown>]> = [
        ['lengte', {}],
        ['inhoud', { measure: 'inhoud' }],
        ['massa', { measure: 'massa', compoundMode: 'volledig' }],
        ['oppervlakte', { measure: 'oppervlakte', formats: ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld', 'vierkant-are', 'are-vierkant'] }],
        ['oppervlakte are enkel', { measure: 'oppervlakte', formats: ['vierkant-are', 'are-vierkant'], areMode: 'enkel' }],
    ];
    test.each(MEASURES)('%s', (_name, over) => {
        for (let seed = 0; seed < 10; seed++) {
            const b = makeBlock('herleidingen', { constraints: { writeUnits: true, ...over }, block: { numberOfExercises: 12 } });
            for (const e of generateHerleidingExercises(b)) {
                const single = e.blank === 'number' && e.toParts.length === 1;
                expect(e.targetUnit, JSON.stringify(e)).toBe(single ? e.toParts[0].key : undefined);
                // A single given quantity never asks for its own unit back.
                if (single && e.fromParts.length === 1) expect(e.targetUnit).not.toBe(e.fromParts[0].key);
            }
        }
    });

    test('targetUnitOf: the stored target, legacy exercises fall back to the answer unit; none for a compound or a unit blank', () => {
        expect(targetUnitOf({ ...SINGLE, targetUnit: 'cm' })).toBe('cm');
        expect(targetUnitOf(SINGLE)).toBe('cm');
        expect(targetUnitOf(COMPOUND)).toBeUndefined();
        expect(targetUnitOf({ ...SINGLE, blank: 'unit' })).toBeUndefined();
    });

    test('a teacher edit keeps the target in step with the answer unit', () => {
        const edited = recomputeHerleiding('lengte', { ...SINGLE, targetUnit: 'cm', toParts: [{ key: 'dm', value: 300 }] });
        expect(edited.toParts).toEqual([{ key: 'dm', value: 30 }]);
        expect(edited.targetUnit).toBe('dm');
    });
});

describe('kiosk header names the target', () => {
    const header = (e: HerleidingExercise, c: Record<string, unknown>) => kioskInstructionOf('herleidingen', e, { ...LENGTE, ...c }, 'Zet om.');
    test('writeUnits + showTargetUnit (default on): "Zet om naar cm."', () => {
        expect(header(SINGLE, { writeUnits: true })).toBe('Zet om naar cm.');
        expect(header(SINGLE, { writeUnits: true, showTargetUnit: true })).toBe('Zet om naar cm.');
    });
    test('off, without writeUnits, a compound answer or a unit blank: the paper instruction', () => {
        expect(header(SINGLE, { writeUnits: true, showTargetUnit: false })).toBe('Zet om.');
        expect(header(SINGLE, { writeUnits: false })).toBe('Zet om.');
        expect(header(COMPOUND, { writeUnits: true })).toBe('Zet om.');
        expect(header({ ...SINGLE, blank: 'unit' }, { writeUnits: true })).toBe('Zet om.');
    });
    test('the pupil still taps the unit: value-equal counts, the given copied back is fout', () => {
        const d = kioskFor('herleidingen')!;
        const c = { ...LENGTE, writeUnits: true };
        expect(d.answerOf(SINGLE, c)).toEqual(['300', 'cm']);
        expect(checkAnswer(d, SINGLE, c, ['300', 'cm'])).toBe(true);
        expect(checkAnswer(d, SINGLE, c, ['3', 'm'])).toBe(false);
    });
});

describe('sheet', () => {
    const hint = (root: HTMLElement) => root.querySelector('[data-target-unit]')?.textContent ?? null;
    test('writeUnits on: the target unit is printed with the exercise', () => {
        const { container } = render(<HerleidingenViewer block={block({ ...SINGLE, targetUnit: 'cm' }, { writeUnits: true })} showSolutions={false} />);
        expect(hint(container)).toMatch(/\bcm\b/);
    });
    test('also in the key, and for a legacy exercise without the field', () => {
        const { container } = render(<HerleidingenViewer block={block(SINGLE, { writeUnits: true })} showSolutions />);
        expect(hint(container)).toMatch(/\bcm\b/);
    });
    test('showTargetUnit off, writeUnits off, a compound answer: no target printed', () => {
        for (const [e, c] of [[SINGLE, { writeUnits: true, showTargetUnit: false }], [SINGLE, {}], [COMPOUND, { writeUnits: true }]] as const) {
            const { container } = render(<HerleidingenViewer block={block(e, c)} showSolutions={false} />);
            expect(hint(container)).toBeNull();
            cleanup();
        }
    });
});

describe('config: "Doeleenheid tonen"', () => {
    const configBlock = (c: Record<string, unknown>) => {
        const b = makeBlock('herleidingen', { id: 'cfg', constraints: c });
        useWorksheetStore.setState({ blocks: [b] } as never);
        return b;
    };
    test('only with writeUnits; on by default, a click turns it off', () => {
        render(<HerleidingenConfig block={configBlock({ writeUnits: false })} />);
        expect(screen.queryByText('Doeleenheid tonen')).toBeNull();
        cleanup();
        const b = configBlock({ writeUnits: true });
        render(<HerleidingenConfig block={b} />);
        const sw = screen.getByRole('button', { name: 'Doeleenheid tonen' });
        expect(sw.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(sw);
        const after = useWorksheetStore.getState().blocks.find(x => x.id === 'cfg')!;
        expect((after.constraints as Record<string, unknown>).showTargetUnit).toBe(false);
    });
});
