// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { MathBlock, PlaatswaardeExercise } from '../services/math/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInstructionOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { EXERCISE_UI } from '../config/exerciseUI';
import { flattenLeaves } from '../config/appstructure';
import { resolveInstruction } from '../config/instructionPresets';
import type { BlockConstraints } from '../services/math/constraintTypes';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { ViewerInteractionProvider, EMPTY_INTERACTION, type ViewerInteraction } from '../components/viewer/ViewerInteractionContext';
import { makeBlock } from './helpers/makeBlock';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import PlaatswaardeConfig from '../components/configurator/plugins/PlaatswaardeConfig';

// Plaatswaarde "plaats omcirkelen" / "plaats benoemen" (owner, kiosk triage 2026-10-10): with H T E
// in the digits' own order the pupil only counts. The leaf setting "Antwoord" (plaatsAnswer):
// 'plaats' = today (the sheet default), 'plaats-shuffle' = the places in a mixed order, 'waarde' =
// type the underlined digit's value (128 with the 2 underlined → 20). The oefen builder starts these
// rows on 'waarde'; the sheet default stays 'plaats'.

afterEach(cleanup);
const d = kioskFor('plaatswaarde')!;
const LEAF = Object.fromEntries(flattenLeaves().map(l => [l.id, l]));
const ex = (number: number, placeKey: string): PlaatswaardeExercise => ({ id: 'p', number, placeKey, isManuallyEdited: false });
const OMC = { subType: 'omcirkelen', maxGetal: 1000, decimalPlaces: 0 };
const PLAATS = { subType: 'plaats', maxGetal: 1000, decimalPlaces: 0 };

describe('the oefen builder starts plaats rows on "waarde"', () => {
    test.each([['plaatswaarde-omcirkelen', 'waarde'], ['plaatswaarde-plaats', 'waarde'], ['plaatswaarde-waarde', undefined], ['plaatswaarde-tabel', undefined]])('%s', (leafId, want) => {
        const leaf = listOefenLeaves().find(l => l.id === leafId)!;
        expect(leaf.constraints.plaatsAnswer).toBe(want);
        // The sheet leaf itself keeps its own default.
        expect(LEAF[leafId].defaultConstraints?.plaatsAnswer).toBeUndefined();
    });
});

describe('waarde: the digit\'s value, typed', () => {
    test.each([OMC, PLAATS])('%o', (base) => {
        const c = { ...base, plaatsAnswer: 'waarde' };
        expect(kioskInputOf(d, ex(128, 'T'), c)).toBe('number');
        expect(d.answerOf(ex(128, 'T'), c)).toEqual(['20']);
        expect(checkAnswer(d, ex(128, 'T'), c, '20')).toBe(true);
        expect(checkAnswer(d, ex(128, 'T'), c, '2')).toBe(false);
        expect(kioskInstructionOf('plaatswaarde', ex(128, 'T'), c, 'Omcirkel de plaats van het onderstreepte cijfer.')).toBe('Wat is de waarde van het onderstreepte cijfer?');
    });
    test('the sheet draws the value line, not the place chips, and says so in its title', () => {
        const block = makeBlock('plaatswaarde', { constraints: { ...OMC, plaatsAnswer: 'waarde' } });
        block.plaatswaardeExercises = [ex(128, 'T')];
        const { Viewer } = EXERCISE_UI.plaatswaarde;
        const { container } = render(<BlockWidthProvider value={680}><Viewer block={block} showSolutions /></BlockWidthProvider>);
        expect(container.textContent).toContain('20');
        expect(container.textContent).not.toMatch(/H\s*T\s*E/);
        for (const leafId of ['plaatswaarde-omcirkelen', 'plaatswaarde-plaats']) {
            const leaf = LEAF[leafId];
            expect(resolveInstruction(leaf.instruction, 'plaatswaarde', leaf.label, { ...leaf.defaultConstraints, plaatsAnswer: 'waarde' } as BlockConstraints)).toBe('Wat is de waarde van het onderstreepte cijfer?');
            expect(resolveInstruction(leaf.instruction, 'plaatswaarde', leaf.label, { ...leaf.defaultConstraints } as BlockConstraints)).not.toContain('waarde');
        }
    });
});

// Every 3-digit number with each of its places asked: enough to see the order vary.
const SAMPLE = Array.from({ length: 120 }, (_, i) => ex(101 + i * 7, ['H', 'T', 'E'][i % 3])).filter(e => String(e.number).length === 3 && !String(e.number).includes('0'));

describe('plaats-shuffle: the places in a mixed order', () => {
    test('plaats: the buttons are the three place names, never in the digits\' order for three places', () => {
        const c = { ...PLAATS, plaatsAnswer: 'plaats-shuffle' };
        const orders = new Set<string>();
        for (const e of SAMPLE) {
            expect(kioskInputOf(d, e, c)).toBe('choice');
            const choices = d.choicesOf!(e, c);
            expect([...choices].sort()).toEqual(['eenheden', 'honderdtallen', 'tientallen']);
            expect(choices).not.toEqual(['honderdtallen', 'tientallen', 'eenheden']);
            // The same exercise always shows the same order (a reload, the stats row).
            expect(d.choicesOf!(e, c)).toEqual(choices);
            expect(checkAnswer(d, e, c, d.answerOf(e, c)[0])).toBe(true);
            orders.add(choices.join());
        }
        expect(orders.size).toBeGreaterThan(2);
        // 'plaats' keeps today's order.
        expect(d.choicesOf!(ex(128, 'T'), PLAATS)).toEqual(['honderdtallen', 'tientallen', 'eenheden']);
    });

    test('omcirkelen: the chips on the card are shuffled; tapping the right letter is right', () => {
        const c = { ...OMC, plaatsAnswer: 'plaats-shuffle' };
        const ia = kioskInteractOf(d, c)!;
        const { Viewer } = EXERCISE_UI.plaatswaarde;
        const orders = new Set<string>();
        for (const e of SAMPLE.slice(0, 30)) {
            expect(kioskInputOf(d, e, c)).toBe('interactive');
            const block: MathBlock = { ...makeDraftBlock('plaatswaarde', c), plaatswaardeExercises: [e] } as MathBlock;
            const ctx: ViewerInteraction = { kind: 'tap', state: EMPTY_INTERACTION, activeCell: null, set: () => {}, focusCell: () => {}, typeCell: () => {} };
            const { container } = render(<BlockWidthProvider value={340}><ViewerInteractionProvider value={ctx}><Viewer block={block} showSolutions={false} /></ViewerInteractionProvider></BlockWidthProvider>);
            const chips = [...container.querySelectorAll('[data-kiosk-key]')].map(el => [el.getAttribute('data-kiosk-key')!, el.textContent!.trim()] as const);
            expect(chips.map(([, t]) => t).sort()).toEqual(['E', 'H', 'T']);
            expect(chips.map(([, t]) => t)).not.toEqual(['H', 'T', 'E']);
            for (const [key, letter] of chips) {
                const given = ia.fromState({ ...EMPTY_INTERACTION, selected: [key] }, e, c);
                expect(given).toBe(letter);
                expect(checkAnswer(d, e, c, given)).toBe(letter === e.placeKey);
            }
            orders.add(chips.map(([, t]) => t).join());
            cleanup();
        }
        expect(orders.size).toBeGreaterThan(2);
    });
});

describe('PlaatswaardeConfig: the Antwoord setting', () => {
    test('shown on the plaats leaves with three options, not on waarde / tabel', () => {
        render(<PlaatswaardeConfig block={makeDraftBlock('plaatswaarde', OMC)} />);
        expect(screen.getByLabelText('Antwoord')).toBeTruthy();
        cleanup();
        render(<PlaatswaardeConfig block={makeDraftBlock('plaatswaarde', { subType: 'waarde' })} />);
        expect(screen.queryByLabelText('Antwoord')).toBeNull();
    });
});
