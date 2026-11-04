// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { EXERCISE_UI } from '../config/exerciseUI';
import { NAT_CEILING } from '../config/numberRanges';
import { makeBlock } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// An old leerjaar-6 sheet / share link carries maxGetal / maxRange 1e10, which no picker
// lists. loadWorksheet floors it once: no history entry, no "verouderd", and a locked
// curriculum (whose store refuses the picker's own floor) shows a value instead of "—".

const OLD = 1e10;

function oldFile(locked: boolean) {
    const s = useWorksheetStore.getState();
    const blocks: MathBlock[] = [
        makeBlock('hr-std-optellen', { id: 'hr', constraints: { maxGetal: OLD } }),
        makeBlock('cijferen-optellen-nat', { id: 'cf', constraints: { operator: '+', maxRange: OLD } }),
        makeBlock('splitsen', { id: 'sp', constraints: { maxGetal: 10, layout: 'basic' } }),
        // Below its list (a leaf pin): flooring never raises, the picker keeps that call.
        makeBlock('getallenrijen', { id: 'gr', constraints: { numberType: 'decimal', maxGetal: 10 } }),
    ];
    return {
        blocks, header: s.header, footer: s.footer, docSettings: s.docSettings,
        baseSettings: { ...s.baseSettings, baseMaxGetal: OLD },
        selectedGrade: 6 as const,
        curriculum: locked
            ? { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen', lockedConstraints: { maxGetal: OLD } }] }
            : undefined,
    };
}

const constraintsOf = (id: string) =>
    useWorksheetStore.getState().blocks.find(b => b.id === id)!.constraints as Record<string, unknown>;

afterEach(() => {
    cleanup();
    useWorksheetStore.setState({ curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe('loadWorksheet normalises old maxes once', () => {
    test('every block lands inside its list, as one history entry, nothing stale', () => {
        useWorksheetStore.getState().loadWorksheet(oldFile(false));
        const st = useWorksheetStore.getState();
        expect(constraintsOf('hr').maxGetal).toBe(NAT_CEILING);
        expect(constraintsOf('cf').maxRange).toBe(NAT_CEILING);
        expect(constraintsOf('sp').maxGetal).toBe(10);
        expect(constraintsOf('gr').maxGetal).toBe(10);
        expect(st.baseSettings.baseMaxGetal).toBe(NAT_CEILING);
        expect(st._history).toHaveLength(1);
        expect(st._history[0]).toBe(st.blocks);
        expect(st.staleBlocks).toEqual({});
    });

    test('a locked curriculum shows a value, and opening the block changes nothing', () => {
        useWorksheetStore.getState().loadWorksheet(oldFile(true));
        expect(useWorksheetStore.getState().curriculum?.allowedTypes[0].lockedConstraints?.maxGetal).toBe(NAT_CEILING);
        const block = useWorksheetStore.getState().blocks.find(b => b.id === 'hr')!;
        const { Config } = EXERCISE_UI['hr-std-optellen'];
        const { container } = render(<Config block={block} />);
        const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"][aria-label="Maximum uitkomst"]');
        expect(trigger?.textContent).toMatch(/Tot 1.000.000.000/);
        const st = useWorksheetStore.getState();
        expect(st._history).toHaveLength(1);
        expect(st.staleBlocks).toEqual({});
    });
});
