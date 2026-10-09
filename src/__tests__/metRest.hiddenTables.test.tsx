// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { EXERCISE_UI } from '../config/exerciseUI';
import { DEFAULT_BASE } from '../config/baseSettings';

// BUGS (first classroom test): a deeltafel picked in Deeltafels mode that Met rest does not list
// (1, 25, …) stayed selected but invisible, so tafels [1] made a dead session with no reason on
// screen. Met rest now shows those picks greyed, says that 0 and 1 give no rest, and warns when
// no deler is left.

afterEach(() => {
    cleanup();
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

function LiveConfig({ id }: { id: string }) {
    const block = useWorksheetStore((s) => s.blocks.find(b => b.id === id))!;
    const { Config } = EXERCISE_UI[block.typeId];
    return <Config block={block} />;
}

function delenWith(selectedTables: number[]) {
    const s = useWorksheetStore.getState();
    s.addBlockFromType('hr-std-delen', 'Natuurlijke getallen', { numberType: 'natural', selectedTables }, { leafId: 'hr-std-delen-nat' });
    const blocks = useWorksheetStore.getState().blocks;
    const id = blocks[blocks.length - 1].id;
    render(<LiveConfig id={id} />);
    fireEvent.click(screen.getByText('Met rest'));
    return () => useWorksheetStore.getState().blocks.find(b => b.id === id)!.constraints as Record<string, unknown>;
}

describe('Met rest shows the deeltafels it does not use', () => {
    test('tafels [1]: 1 shows greyed and the panel says no deler is usable', () => {
        const c = delenWith([1]);
        const one = screen.getByRole('button', { name: /^1\b/ }) as HTMLButtonElement;
        expect(one.disabled).toBe(true);
        expect(one.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByText('Ook gekozen bij Deeltafels: 1. Delen door 0 of 1 geeft geen rest.')).toBeTruthy();
        expect(screen.getByText(/Kies minstens één deler van 2 tot 12/)).toBeTruthy();
        // Picking a real deler clears the warning; the greyed pick stays shown.
        fireEvent.click(screen.getByRole('button', { name: '5' }));
        expect(c().selectedTables).toEqual([1, 5]);
        expect(screen.queryByText(/Kies minstens één deler/)).toBeNull();
        expect(screen.getByText(/Ook gekozen bij Deeltafels: 1\./)).toBeTruthy();
    });

    test('only met-rest delers picked: no greyed buttons, no note', () => {
        delenWith([2, 3, 4]);
        expect(screen.queryByText(/Ook gekozen bij Deeltafels/)).toBeNull();
        expect(screen.queryByText(/Kies minstens één deler/)).toBeNull();
    });
});
