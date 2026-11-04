// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { EXERCISE_UI } from '../config/exerciseUI';
import { flattenLeaves } from '../config/appstructure';

// The fraction panels after the shared Breuken block (UX review 2026-10-28): every fraction
// leaf shows one "Breuken" block, and the owner calls on vereenvoudigen / ordenen hold.

afterEach(() => { cleanup(); useWorksheetStore.setState({ blocks: [] } as never); });

function mount(typeId: string, constraints: Record<string, unknown>) {
    const b = makeBlock(typeId, { id: 'cfg', constraints });
    useWorksheetStore.setState({ blocks: [b] } as never);
    const { Config } = EXERCISE_UI[typeId];
    render(<Config block={b} />);
    return () => useWorksheetStore.getState().blocks.find(x => x.id === 'cfg')!.constraints as Record<string, unknown>;
}
const pressed = () => screen.getAllByRole('button').filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);

const FRACTION_LEAVES = [
    'breuken-kleuren', 'breuken-herkennen', 'breuken-hoeveelheid', 'breuken-lijnstuk', 'breuken-veelhoek',
    'breuken-rangschikken', 'breuken-gemengd', 'breuken-gelijknamig', 'breuken-vereenvoudigen',
    'hr-std-optellen-rat', 'hr-std-aftrekken-rat', 'hr-std-vermenigvuldigen-rat', 'hr-std-delen-rat',
    'getalbegrip-ordenen-rat', 'getalbegrip-getallenassen-rat', 'getalbegrip-getallenrijen-rat',
    'vergelijken-representaties', 'verbanden-tabel', 'procenten-verbanden',
];

describe('every fraction leaf mounts the shared block', () => {
    const leaves = flattenLeaves();
    test.each(FRACTION_LEAVES)('%s', (id) => {
        const leaf = leaves.find(l => l.id === id)!;
        const { container } = (() => { const b = makeBlock(leaf.typeId, { id: 'x', constraints: leaf.defaultConstraints }); const { Config } = EXERCISE_UI[leaf.typeId]; return render(<Config block={b} />); })();
        expect(container.querySelector('[data-breuken-settings]'), id).not.toBeNull();
        // No title-only teller / noemer: the words are on screen.
        expect(container.querySelector('input[title="Max. teller"], input[title="Max. Teller"]')).toBeNull();
    });
});

describe('vereenvoudigen presets pick the structure, never the caps', () => {
    test('"Binnen de maaltafels" is lit exactly when tablesOnly is on and writes no caps', () => {
        const read = mount('breuken-bewerken', { subType: 'vereenvoudigen', tablesOnly: false, maxNumerator: 30, maxDenominator: 40 });
        expect(pressed()).toContain('Grotere breuken');
        fireEvent.click(screen.getByRole('button', { name: 'Binnen de maaltafels' }));
        expect(read()).toMatchObject({ tablesOnly: true, maxNumerator: 30, maxDenominator: 40 });
    });

    test('the default block lights the tables preset and keeps 10 / 10', () => {
        mount('breuken-bewerken', { subType: 'vereenvoudigen' });
        expect(pressed()).toContain('Binnen de maaltafels');
        expect(screen.getByRole('button', { name: 'Hoogste noemer' }).textContent).toBe('10');
        expect((screen.getByLabelText('Hoogste teller') as HTMLInputElement).value).toBe('10');
    });
});

describe('ordenen rat tri-state', () => {
    test('Ook writes mixedMode some and clears allowMixed; an old allowMixed sheet reads Alleen', () => {
        const read = mount('ordenen', { numberType: 'rational', allowMixed: true });
        expect(pressed()).toContain('Alleen');
        fireEvent.click(screen.getByRole('button', { name: 'Ook gemengde getallen' }));
        expect(read()).toMatchObject({ mixedMode: 'some', allowMixed: false });
    });
});

describe('getallenrijen rat: the sprong is the noemer, one Hoogste teller field', () => {
    test('no FractionMaxField, the teller field writes maxTeller', () => {
        const read = mount('getallenrijen', { numberType: 'rational', fractionStep: 6, maxTeller: 25 });
        expect(pressed()).toContain('1/6');
        fireEvent.change(screen.getByLabelText('Hoogste teller'), { target: { value: '12' } });
        expect(read().maxTeller).toBe(12);
        expect(screen.queryByText('teller')).toBeNull();
    });
});

describe('hoofdrekenen + − rat', () => {
    test('the link is a Switch with words, gelijknamig / ongelijknamig sits in the block', () => {
        const read = mount('hr-std-optellen', { numberType: 'rational' });
        expect(screen.getByRole('switch', { name: 'Zelfde grenzen voor beide breuken' }).getAttribute('aria-checked')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Ongelijknamig (moeilijk)' }));
        expect(read().fractionDifficulty).toBe('multi_step');
        fireEvent.click(screen.getAllByRole('button', { name: 'Alleen gemengde getallen' })[0]);
        expect(read()).toMatchObject({ mixedNumber1: true, mixedNumber2: false });
    });
});
