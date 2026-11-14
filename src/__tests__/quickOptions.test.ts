import { describe, test, expect } from 'vitest';
import cards from '../config/eenvoudig/cards.json';
import { allVariants, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { QUICK_SETTINGS, type QuickPills } from '../config/quickSettings';
import { offeredOptions } from '../config/quickOptions';
import { REGISTRY } from '../config/exerciseRegistry';
import { columnTargets } from '../services/afronden/afrondenGenerator';
import { OPPERVLAKTE_KIOSK } from '../services/oefenen/kioskDescriptors';
import type { MathBlock, MeetExercise, SchattendExercise } from '../services/math/types';
import type { AfrondenConstraints } from '../services/math/constraintTypes';
import { mulberry32 } from './helpers/limitHarness';

// Audit 2026-11-13: quick pills that gave 0 exercises (C:c231-l3 "Tot welk getal? 100") or did
// something else than their label (rooster "Rechthoekige driehoek", natural "Eenheden").

const variants = allVariants(cards as unknown as EenvoudigData);
const byId = (id: string) => variants.find(v => v.id === id) as CardVariant;

function cardBlock(v: CardVariant, patch: Record<string, unknown> = {}, count?: number): MathBlock {
    const r = resolveCard(v);
    return {
        id: v.id, typeId: r.typeId, instructionText: '', instructionMode: 'geen', layoutPreset: 'inline-short', steppedLines: 3,
        numberOfExercises: count ?? r.count, totalPoints: 5, verticalSpacing: 18, constraints: { ...r.constraints, ...patch }, exercises: [],
    } as unknown as MathBlock;
}

function generate(block: MathBlock, seed: number): { items: unknown[]; note: string | null } {
    const real = Math.random;
    Math.random = mulberry32(seed);
    try {
        const row = REGISTRY[block.typeId];
        return row.generateNoted ? row.generateNoted(block) : { items: row.generate(block), note: null };
    } finally {
        Math.random = real;
    }
}

// Every card × every pill row its block shows × every pill that row offers.
function* offeredPills() {
    for (const v of variants) {
        const block = cardBlock(v);
        for (const spec of QUICK_SETTINGS[block.typeId] ?? []) {
            if (spec.kind !== 'pills' || (spec.when && !spec.when(block.constraints as Record<string, unknown>))) continue;
            for (const o of offeredOptions(block, spec)) yield { v, spec, value: o.value, block: cardBlock(v, { [spec.key]: o.value }) };
        }
    }
}

const optionsOf = (v: CardVariant, key: string) => {
    const block = cardBlock(v);
    const spec = QUICK_SETTINGS[block.typeId].find(s => s.kind === 'pills' && s.key === key) as QuickPills;
    return offeredOptions(block, spec).map(o => o.label);
};

describe('quick pills offer only what the card can make', () => {
    test('no offered pill gives an empty block at the card count (all cards, two seeds)', () => {
        const empty: string[] = [];
        for (const { v, spec, value, block } of offeredPills()) {
            for (const seed of [3, 11]) if (generate(block, seed).items.length === 0) empty.push(`${v.id} ${spec.key}=${JSON.stringify(value)} seed ${seed}`);
        }
        expect(empty, empty.join('\n')).toEqual([]);
    }, 60_000);

    test('HTE − TE zonder brug does not offer "Tot welk getal? 100"', () => {
        expect(optionsOf(byId('C:c231-l3'), 'maxRange')).toEqual(['1.000', '10.000', '100.000']);
    });

    test('the value the block holds stays pressed, even one the card rules out', () => {
        const block = cardBlock(byId('C:c231-l3'), { maxRange: 100 });
        const spec = QUICK_SETTINGS[block.typeId][0] as QuickPills;
        expect(offeredOptions(block, spec).map(o => o.value)).toEqual([100, 1000, 10000, 100000]);
    });
});

// A berekenen block used to label a square 'l-figuur': the corners say what is really drawn.
const CORNERS: Record<string, number> = { rechthoek: 4, vierkant: 4, 'l-figuur': 6, 'rechthoekige-driehoek': 3 };

describe('oppervlakte: the shape pill draws the shape it names', () => {
    test('rooster cards offer the L-figuur, berekenen cards the rechthoekige driehoek', () => {
        expect(optionsOf(byId('B:opp-4-rooster-rechthoek'), 'shapes')).toEqual(['Rechthoek', 'Rechthoek en vierkant', 'L-figuur']);
        expect(optionsOf(byId('B:opp-5-berekenen'), 'shapes')).toEqual(['Rechthoek', 'Rechthoek en vierkant', 'Rechthoekige driehoek']);
    });

    test('every offered shape pill generates only the shapes it names', () => {
        const wrong: string[] = [];
        for (const { v, spec, value, block } of offeredPills()) {
            if (block.typeId !== 'oppervlakte' || spec.key !== 'shapes') continue;
            for (const ex of generate(block, 5).items as MeetExercise[]) {
                const drawn = ex.points?.length ?? 0;
                if (!(value as string[]).includes(ex.shape ?? '') || drawn !== CORNERS[ex.shape ?? '']) wrong.push(`${v.id} ${JSON.stringify(value)} gave ${ex.shape} with ${drawn} corners`);
            }
        }
        expect(wrong, wrong.join('\n')).toEqual([]);
    });

    test('a rechthoekige driehoek is a triangle and its key is b × h : 2', () => {
        const block = cardBlock(byId('B:opp-5-berekenen'), { shapes: ['rechthoekige-driehoek'] }, 12);
        for (const ex of generate(block, 9).items as MeetExercise[]) {
            const [a, , b] = ex.sides ?? [];
            expect(ex.points).toHaveLength(3);
            expect(ex.area).toBeCloseTo((a * b) / 2, 6);
            expect(OPPERVLAKTE_KIOSK.answerOf?.(ex, block.constraints as Record<string, unknown>)).toContain(String((a * b) / 2).replace('.', ','));
        }
    });
});

describe('afronden and schattend: the rounding pill rounds where it says', () => {
    test('naturals offer no Eenheden, kommagetallen no Tientallen', () => {
        expect(optionsOf(byId('A:a-l3-schatten-bij-en-min-rond-af-op-een-tiental-tot-1-000'), 'roundTargets')).toEqual(['Tientallen', 'Honderdtallen']);
        expect(optionsOf(byId('A:a-l4-schatten-met-kommagetallen-rond-af-op-eenheid'), 'roundTargets')).toEqual(['Eenheden', 'Tienden']);
    });

    test('every offered pill rounds only to the places it names, with no fallback note', () => {
        const wrong: string[] = [];
        for (const { v, spec, value, block } of offeredPills()) {
            if (spec.key !== 'roundTargets') continue;
            const want = value as string[];
            if (block.typeId === 'schattend') {
                const { items, note } = generate(block, 5);
                const off = (items as SchattendExercise[]).filter(ex => !want.includes(ex.targetKey));
                if (off.length || note) wrong.push(`${v.id} ${JSON.stringify(want)} gave ${off.map(ex => ex.targetKey).join(',')} ${note ?? ''}`);
            } else if (block.typeId === 'afronden') {
                const cols = columnTargets(block.constraints as AfrondenConstraints).map(t => t.key);
                if (cols.some(k => !want.includes(k))) wrong.push(`${v.id} ${JSON.stringify(want)} prints ${cols.join(',')}`);
            }
        }
        expect(wrong, wrong.join('\n')).toEqual([]);
    });
});
