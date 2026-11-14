// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { CONSTRAINT_SPACE } from '../config/constraintSpace';
import { QUICK_SETTINGS, type QuickPills } from '../config/quickSettings';
import { useWorksheetStore } from '../store/useWorksheetStore';
import Inspector from '../components/configurator/Inspector';

const generating = Object.entries(REGISTRY).filter(([, row]) => !row.isFurniture).map(([id]) => id);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

describe('QUICK_SETTINGS table', () => {
    test('every generating typeId has a row, furniture has none', () => {
        expect(generating.filter(id => !QUICK_SETTINGS[id] || QUICK_SETTINGS[id].length === 0)).toEqual([]);
        expect(Object.keys(QUICK_SETTINGS).filter(id => !REGISTRY[id] || REGISTRY[id].isFurniture)).toEqual([]);
    });

    test('every pill value is one the type really offers', () => {
        const bad: string[] = [];
        for (const [id, specs] of Object.entries(QUICK_SETTINGS)) {
            for (const spec of specs) {
                if (spec.kind !== 'pills' || spec.free) continue;
                const offered = CONSTRAINT_SPACE[id]?.[spec.key];
                if (!offered) { bad.push(`${id}.${spec.key}: key not in constraint space`); continue; }
                for (const o of spec.options) if (!offered.some(v => same(v, o.value))) bad.push(`${id}.${spec.key}=${JSON.stringify(o.value)}`);
            }
        }
        expect(bad).toEqual([]);
    });

    test('layout rows only on types whose viewer takes a layoutPreset', () => {
        const withLayout = Object.entries(QUICK_SETTINGS).filter(([, s]) => s.some(x => x.kind === 'layout')).map(([id]) => id).sort();
        expect(withLayout).toEqual(['hr-std-aftrekken', 'hr-std-delen', 'hr-std-gemengd', 'hr-std-optellen', 'hr-std-vermenigvuldigen', 'rekenvolgorde']);
    });
});

describe('Inspector quick block', () => {
    afterEach(cleanup);
    beforeEach(() => {
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.setState({ curriculum: null, sidebarTab: 'eenvoudig', inspectorScope: 'block', inspectorSections: { block: null, blad: 'koptekst' } });
        useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
        useWorksheetStore.setState({ activeBlockId: useWorksheetStore.getState().blocks[0].id });
    });

    test('shows in Eenvoudig as the open first section, the rest folded away', () => {
        render(<Inspector />);
        expect(screen.getByTestId('quick-block')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Snel aanpassen/ }).getAttribute('aria-expanded')).toBe('true');
        const look = screen.getByRole('button', { name: /Hoe staat het op het blad/ });
        expect(look.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Breedte op de pagina')).toBeNull();
        fireEvent.click(look);
        expect(screen.getByText('Breedte op de pagina')).toBeTruthy();
        expect(screen.queryByTestId('quick-block')).toBeNull();
    });

    test('vormleer shows its whole settings panel in the quick block', () => {
        expect(QUICK_SETTINGS['vormleer-hoeken']).toEqual([{ kind: 'full' }]);
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.getState().addBlockFromType('vormleer-hoeken', 'Hoeken');
        useWorksheetStore.setState({ activeBlockId: useWorksheetStore.getState().blocks[0].id });
        render(<Inspector />);
        const quick = screen.getByTestId('quick-block');
        expect(quick.querySelectorAll('button').length).toBeGreaterThan(3);
    });

    test('always offers the number of exercises, and changing it changes the block', () => {
        render(<Inspector />);
        const before = useWorksheetStore.getState().blocks[0].numberOfExercises || 10;
        fireEvent.click(screen.getByRole('button', { name: 'Meer oefeningen' }));
        expect(useWorksheetStore.getState().blocks[0].numberOfExercises).toBe(before + 1);
        fireEvent.click(screen.getByRole('button', { name: 'Minder oefeningen' }));
        fireEvent.click(screen.getByRole('button', { name: 'Minder oefeningen' }));
        expect(useWorksheetStore.getState().blocks[0].numberOfExercises).toBe(before - 1);
    });

    test.each(['oefeningen', 'overzicht'] as const)('is absent on the %s tab', (tab) => {
        useWorksheetStore.setState({ sidebarTab: tab });
        render(<Inspector />);
        expect(screen.queryByTestId('quick-block')).toBeNull();
        expect(screen.queryByRole('button', { name: /Snel aanpassen/ })).toBeNull();
        expect(screen.getByRole('button', { name: /Wat oefenen ze/ }).getAttribute('aria-expanded')).toBe('true');
    });

    test('is absent under a locked curriculum', () => {
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen' }] } });
        render(<Inspector />);
        expect(screen.queryByTestId('quick-block')).toBeNull();
    });

    test('a pill writes through the constraint path and marks the block stale', () => {
        render(<Inspector />);
        fireEvent.click(screen.getByRole('button', { name: '10.000' }));
        const b = useWorksheetStore.getState().blocks[0];
        expect(b.constraints?.maxGetal).toBe(10000);
        expect(useWorksheetStore.getState().staleBlocks[b.id]).toBe(true);
    });

    test('the layout control uses the block layout action', () => {
        render(<Inspector />);
        fireEvent.click(screen.getByRole('button', { name: 'Onder elkaar' }));
        expect(useWorksheetStore.getState().blocks[0].layoutPreset).toBe('stepped');
        expect(screen.getByText(/Aantal lijnen/)).toBeTruthy();
    });

    test('Aanpassen on a combo block opens the combination panel for that block', () => {
        const id = useWorksheetStore.getState().blocks[0].id;
        useWorksheetStore.getState().updateBlockSettings(id, { cardId: 'combo:x' } as never);
        useWorksheetStore.setState({ blocks: useWorksheetStore.getState().blocks.map(b => ({ ...b, cardId: 'combo:x' })) });
        render(<Inspector />);
        fireEvent.click(screen.getByRole('button', { name: 'Aanpassen' }));
        expect(useWorksheetStore.getState().eenvoudigPanel).toEqual({ kind: 'combo', only: 'x', editBlockId: id });
    });

    test.each(['getallenas', 'getallenrijen'])('%s hides the single-jump pill when it could not take effect', (typeId) => {
        const step = QUICK_SETTINGS[typeId].find(s => s.kind === 'pills' && s.key === 'step') as QuickPills;
        expect(step.when?.({ step: 5 })).toBe(true);
        expect(step.when?.({ step: 5, jumps: [5, 10] })).toBe(false);
        expect(step.when?.({ step: 5, numberType: 'rational' })).toBe(false);
    });
});
