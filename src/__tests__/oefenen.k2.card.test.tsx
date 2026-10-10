// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, KioskCardProvider, ScaffoldProvider } from '../components/viewer/BlockWidthContext';
import type { MathBlock } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';

// K2: the Oefenmodus card (KioskCardProvider) shows a typed leaf's answer as the "?" slot; the sheet is untouched.

afterEach(cleanup);

function blockOf(leafId: string, extra: Record<string, unknown> = {}): MathBlock {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const def = REGISTRY[leaf.typeId];
    const block = makeBlock(leaf.typeId, { constraints: { ...leaf.defaultConstraints, ...extra }, block: { numberOfExercises: 1 } });
    (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block).slice(0, 1);
    return block;
}

export function html(block: MathBlock, card: boolean): HTMLElement {
    const { Viewer } = EXERCISE_UI[block.typeId];
    const view = <Viewer block={block} showSolutions={false} />;
    const { container } = render(<BlockWidthProvider value={340}>{card ? <ScaffoldProvider value={false}><KioskCardProvider value={true}>{view}</KioskCardProvider></ScaffoldProvider> : view}</BlockWidthProvider>);
    return container;
}

const slots = (r: HTMLElement) => r.querySelectorAll('[data-kiosk-slot]').length;
const mercury = (r: HTMLElement) => r.querySelectorAll('rect[fill^="url(#merc"]').length;
const lines = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('div, span')]
    .filter(el => /solid/.test(el.style.borderBottom) && !el.style.borderTop && !el.style.border && el.children.length === 0 && !el.textContent?.trim()).length;

describe('temperatuur verschil on the card', () => {
    const block = () => {
        const b = blockOf('temperatuur-verschil');
        const ex = (b as unknown as { temperatuurExercises: Array<Record<string, unknown>> }).temperatuurExercises[0];
        Object.assign(ex, { celsius: 4, celsius2: 15, mode1: 'gekleurd', mode2: 'getal' });
        return b;
    };
    test('both thermometers show their temperature and value, one "?" slot, no writing lines', () => {
        const root = html(block(), true);
        expect(mercury(root)).toBe(2);
        expect(root.textContent).toContain('4 °C');
        expect(root.textContent).toContain('15 °C');
        expect(slots(root)).toBe(1);
        expect(lines(root)).toBe(0);
    });
    test('the sheet is unchanged: one empty tube, three writing lines, no slot', () => {
        const root = html(block(), false);
        expect(mercury(root)).toBe(1);
        expect(slots(root)).toBe(0);
        expect(lines(root)).toBe(2);
    });
});

// Every typed leaf: the card holds a "?" slot where the sheet draws its answer line; the sheet holds none.
const TYPED: Array<[string, Record<string, unknown>]> = [
    ['hr-std-optellen-nat', {}], ['hr-std-delen-nat', { multiplicationMode: 'met_rest' }], ['afronden-nat-simpel', {}], ['procenten-nemen', {}],
    ['romeinse-herkennen', {}], ['temperatuur-aflezen', {}], ['massa-weegschaal-aflezen', {}], ['oppervlakte-berekenen', {}],
    ['maateenheid-kiezen', { answerMode: 'schrijven' }], ['herleidingen-lengte', {}], ['plaatswaarde-waarde', {}],
    ['schattend-nat', {}], ['handig-rekenvolgorde', {}], ['geld-rekenen-korting', {}], ['breuken-vereenvoudigen', {}], ['breuken-hoeveelheid', { subType: 'hoeveelheid' }],
];
describe('typed leaves show the "?" slot on the card', () => {
    test.each(TYPED)('%s', (leafId, extra) => {
        const block = blockOf(leafId, extra);
        expect(slots(html(block, false)), 'sheet').toBe(0);
        cleanup();
        expect(slots(html(block, true)), 'card').toBeGreaterThan(0);
    });
});
