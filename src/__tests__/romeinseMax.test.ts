import { describe, test, expect } from 'vitest';
import cards from '../config/eenvoudig/cards.json';
import { allVariants, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { generateRomeinseExercises } from '../services/romeinse/romeinseGenerator';
import type { MathBlock, RomeinseExercise } from '../services/math/types';
import { mulberry32 } from './helpers/limitHarness';

// Audit 2026-11-13: the card "Romeinse cijfers tot 2 500 lezen, ook jaartallen" (niveau 4) reached 3804.

const card = allVariants(cards as unknown as EenvoudigData).find(v => v.id === 'A:a-l6-romeinse-cijfers-tot-2-500-lezen-ook-jaartallen') as CardVariant;

function generate(constraints: Record<string, unknown>, count: number, seed: number): RomeinseExercise[] {
    const block = { id: 'r', typeId: 'romeinse-cijfers', numberOfExercises: count, constraints } as unknown as MathBlock;
    const real = Math.random;
    Math.random = mulberry32(seed);
    try { return generateRomeinseExercises(block); } finally { Math.random = real; }
}

describe('romeinse cijfers: a card max is a ceiling', () => {
    const c = resolveCard(card).constraints;

    test.each([[4, 400, 2500], [3, 60, 100]])('"tot 2 500" at niveau %i: %i exercises, none above %i', (niveau, count, max) => {
        const items = generate({ ...c, niveau }, count, 13);
        expect(items.length).toBe(count);
        expect(Math.max(...items.map(e => e.value))).toBeLessThanOrEqual(max);
    });

    test('niveau 4 without a card max still reaches past 2 500', () => {
        expect(Math.max(...generate({ subType: 'herkennen', niveau: 4 }, 400, 13).map(e => e.value))).toBeGreaterThan(2500);
    });
});
