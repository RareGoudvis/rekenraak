// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { cardTitle, cardDotColor } from '../board/cardTitle';
import { makeBoardBlock } from '../board/boardBlocks';
import { DEFAULT_BASE } from '../config/baseSettings';
import { flattenLeaves } from '../config/appstructure';
import { REGISTRY } from '../config/exerciseRegistry';
import type { BoardWidget } from '../board/boardTypes';

const card = (leafId: string, props: Record<string, unknown> = {}): BoardWidget => {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const block = makeBoardBlock(leaf.typeId, { override: leaf.defaultConstraints, leafId, base: DEFAULT_BASE, grade: null })!;
    return { id: 'e', kind: 'exercise', x: 0, y: 0, w: 660, z: 1, block, props };
};

describe('card titles', () => {
    test('a math card reads "<leaf> · tot <max>" and follows the max in its settings', () => {
        const w = card('hr-std-optellen-nat');
        expect(cardTitle(w)).toMatch(/^Optellen · natuurlijk · tot \d/);
        const key = REGISTRY[w.block!.typeId].maxPresets!(w.block!.constraints as Record<string, unknown>)!.key;
        const bigger = { ...w, block: { ...w.block!, constraints: { ...w.block!.constraints, [key]: 10000 } } };
        expect(cardTitle(bigger as BoardWidget)).toMatch(/· tot 10 000$/);
    });

    test('a type without a max picker is just its name; a typed title wins', () => {
        const w = card('klok-analoog-lezen');
        expect(cardTitle(w)).not.toMatch(/tot/);
        expect(cardTitle(card('hr-std-optellen-nat', { title: 'Sommen van vandaag' }))).toBe('Sommen van vandaag');
    });

    test('every leaf gets a real title, never undefined or NaN', () => {
        for (const leaf of flattenLeaves().filter(l => REGISTRY[l.typeId]).slice(0, 60)) {
            const t = cardTitle(card(leaf.id));
            expect(t, leaf.id).not.toMatch(/undefined|NaN/);
            expect(t.length, leaf.id).toBeGreaterThan(2);
        }
    });

    test('widgets keep their kind label; the dot is the domain hue for maths, the accent otherwise', () => {
        const klok: BoardWidget = { id: 'k', kind: 'klok', x: 0, y: 0, w: 300, z: 1, props: {} };
        expect(cardTitle(klok)).toBe('Klok');
        expect(cardDotColor(klok)).toBe('var(--accent)');
        expect(cardDotColor(card('hr-std-optellen-nat'))).toBe('var(--accent-bewerkingen)');
        expect(cardDotColor({ ...klok, props: { accent: '#1e40af' } })).toBe('#1e40af');
    });
});
