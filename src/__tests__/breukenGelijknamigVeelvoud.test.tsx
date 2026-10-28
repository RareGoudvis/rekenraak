// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { generateBreukBewerkExercisesNoted } from '../services/fractions/breukBewerkGenerator';
import { kioskFor } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import BreukBewerkConfig from '../components/configurator/plugins/BreukBewerkConfig';
import { useWorksheetStore } from '../store/useWorksheetStore';
import type { BreukBewerkExercise, Fraction } from '../services/math/types';

// Teacher feedback 2026-10-28: "gelijknamig maken in het vierde alleen als de ene noemer een veelvoud
// is van de andere". denominatorRelation 'multiple' = that pair, the larger noemer is the common one.
const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; cleanup(); });
const seeded = <T,>(seed: number, fn: () => T): T => {
    Math.random = mulberry32(seed);
    try { return fn(); } finally { Math.random = realRandom; }
};
const SEEDS = [1, 7, 42, 1234, 99999];
const bew = (c: Record<string, unknown>) => makeBlock('breuken-bewerken', { constraints: { subType: 'gelijknamig', ...c }, block: { numberOfExercises: 60 } });
const draw = (c: Record<string, unknown>, seed: number) => seeded(seed, () => generateFor(bew(c)) as BreukBewerkExercise[]);
const proper = (f: Fraction) => f.n >= 1 && f.n < f.d;
const improperOk = (f: Fraction) => f.n >= 1 && f.n !== f.d && f.n < 2 * f.d;
const valueOk = (e: BreukBewerkExercise) => e.inputs.every((f, i) => f.n * e.answers[i].d === e.answers[i].n * f.d);

describe('multiple: one noemer a multiple of the other', () => {
    test.each([false, true])('pair relation, L = larger, inside the range (improper %s)', (improper) => {
        for (const s of SEEDS) {
            const exs = draw({ denominatorRelation: 'multiple', minDenominator: 2, maxDenominator: 12, allowImproper: improper }, s);
            for (const e of exs) {
                const [a, b] = e.inputs.map(f => f.d);
                const lo = Math.min(a, b), hi = Math.max(a, b);
                expect(lo).not.toBe(hi);
                expect(hi % lo).toBe(0);
                expect(lo).toBeGreaterThanOrEqual(2);
                expect(hi).toBeLessThanOrEqual(12);
                expect(e.answers.map(x => x.d)).toEqual([hi, hi]);
                expect(valueOk(e)).toBe(true);
                expect(e.inputs.every(improper ? improperOk : proper)).toBe(true);
            }
            if (improper) expect(exs.flatMap(e => e.inputs).some(f => f.n > f.d)).toBe(true);
        }
    });

    test('both orders occur, and more than one factor', () => {
        const exs = SEEDS.flatMap(s => draw({ denominatorRelation: 'multiple', minDenominator: 2, maxDenominator: 12 }, s));
        expect(exs.some(e => e.inputs[0].d < e.inputs[1].d)).toBe(true);
        expect(exs.some(e => e.inputs[0].d > e.inputs[1].d)).toBe(true);
        const factors = new Set(exs.map(e => Math.max(e.inputs[0].d, e.inputs[1].d) / Math.min(e.inputs[0].d, e.inputs[1].d)));
        expect(factors.size).toBeGreaterThan(2);
    });

    test('the min holds: van 4 tot 12 → 4&8, 4&12, 5&10, 6&12', () => {
        const pairs = new Set(SEEDS.flatMap(s => draw({ denominatorRelation: 'multiple', minDenominator: 4, maxDenominator: 12 }, s))
            .map(e => [...e.inputs.map(f => f.d)].sort((x, y) => x - y).join('&')));
        expect([...pairs].sort()).toEqual(['4&12', '4&8', '5&10', '6&12']);
    });

    test('a doelnoemer has no say', () => {
        for (const e of draw({ denominatorRelation: 'multiple', maxDenominator: 10, targetDen: 30 }, 3)) {
            expect(e.answers[0].d).toBe(Math.max(...e.inputs.map(f => f.d)));
        }
    });

    test('no pair in range: the closest pair under the cap, with a note', () => {
        const noted = (c: Record<string, unknown>) => seeded(5, () => generateBreukBewerkExercisesNoted(bew({ denominatorRelation: 'multiple', ...c })));
        const tight = noted({ minDenominator: 7, maxDenominator: 10 });
        expect(tight.note).toMatch(/geen noemer met een veelvoud/);
        for (const e of tight.items) expect([...e.inputs.map(f => f.d)].sort((x, y) => x - y)).toEqual([5, 10]);
        const small = noted({ minDenominator: 2, maxDenominator: 3 });
        expect(small.note).toMatch(/noemer 4 wordt ook gebruikt/);
        for (const e of small.items) expect([...e.inputs.map(f => f.d)].sort((x, y) => x - y)).toEqual([2, 4]);
        expect(noted({ minDenominator: 2, maxDenominator: 10 }).note).toBeNull();
    });
});

describe('any: unchanged', () => {
    test.each([false, true])('absent equals any, same draws (improper %s)', (improper) => {
        for (const s of SEEDS) {
            expect(draw({ denominatorRelation: 'any', allowImproper: improper, targetDen: 12 }, s).map(e => [e.inputs, e.answers]))
                .toEqual(draw({ allowImproper: improper, targetDen: 12 }, s).map(e => [e.inputs, e.answers]));
        }
    });

    test('any still draws non-multiple pairs (3 & 4)', () => {
        const exs = SEEDS.flatMap(s => draw({ maxDenominator: 10 }, s));
        expect(exs.some(e => { const [a, b] = e.inputs.map(f => f.d).sort((x, y) => x - y); return b % a !== 0; })).toBe(true);
    });
});

describe('kiosk', () => {
    const d = kioskFor('breuken-bewerken')!;
    test('multiple + improper: the larger noemer, a larger common one, and a lingering doelnoemer has no say', () => {
        const ex: BreukBewerkExercise = { id: 'k', subType: 'gelijknamig', isManuallyEdited: false, inputs: [{ n: 7, d: 4 }, { n: 5, d: 8 }], answers: [{ n: 14, d: 8 }, { n: 5, d: 8 }] };
        const c = { subType: 'gelijknamig', denominatorRelation: 'multiple', allowImproper: true, targetDen: 8 };
        expect(checkAnswer(d, ex, c, ['14/8', '5/8'])).toBe(true);
        expect(checkAnswer(d, ex, c, ['28/16', '10/16'])).toBe(true);
        expect(checkAnswer(d, ex, c, ['14/8', '10/16'])).toBe(false);
    });
});

describe('config: "Noemers"', () => {
    const configBlock = (c: Record<string, unknown>) => {
        const b = makeBlock('breuken-bewerken', { id: 'cfg', constraints: { subType: 'gelijknamig', ...c } });
        useWorksheetStore.setState({ blocks: [b] } as never);
        return b;
    };
    const pressed = () => screen.getAllByRole('button').filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);

    test('a new block shows Willekeurig and an open doelnoemer', () => {
        render(<BreukBewerkConfig block={configBlock({})} />);
        expect(pressed()).toContain('Willekeurig');
        expect((screen.getByLabelText('Doelnoemer') as HTMLInputElement).disabled).toBe(false);
        expect(screen.queryByText('Niet bij veelvoud-noemers.')).toBeNull();
    });

    test('a click sets multiple; the doelnoemer is then disabled, Ook onechte breuken stays', () => {
        render(<BreukBewerkConfig block={configBlock({})} />);
        fireEvent.click(screen.getByRole('button', { name: 'De ene een veelvoud van de andere' }));
        const after = useWorksheetStore.getState().blocks.find(x => x.id === 'cfg')!;
        expect((after.constraints as Record<string, unknown>).denominatorRelation).toBe('multiple');
        cleanup();
        render(<BreukBewerkConfig block={configBlock({ denominatorRelation: 'multiple', allowImproper: true })} />);
        expect(pressed()).toEqual(expect.arrayContaining(['De ene een veelvoud van de andere', 'Aan']));
        expect((screen.getByLabelText('Doelnoemer') as HTMLInputElement).disabled).toBe(true);
        expect(screen.getByText('Niet bij veelvoud-noemers.')).toBeTruthy();
    });

    test('vereenvoudigen has no Noemers row', () => {
        render(<BreukBewerkConfig block={configBlock({ subType: 'vereenvoudigen' })} />);
        expect(screen.queryByText('Willekeurig')).toBeNull();
    });
});
