// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { useConstraints } from '../components/configurator/useConstraints';
import { ConstraintScopeContext } from '../components/configurator/ConstraintScope';
import type { BlockConstraints } from '../services/math/constraintTypes';

// The scope is what lets `hr-std-gemengd` mount the ordinary Addition/Multiplication
// plugins inside a per-variant tab: the plugin reads shared ∪ override and writes only
// the override, so a tab that was never touched keeps following the shared settings.
const blockNow = () => useWorksheetStore.getState().blocks[0];

function seed() {
    useWorksheetStore.getState().clearBlocks();
    useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
    useWorksheetStore.getState().updateBlockSettings(blockNow().id, {
        constraints: { ...blockNow().constraints, maxGetal: 1000, numberType: 'natural' },
    });
}

/** Renders the hook fresh against the store's current block, optionally inside a scope. */
function read(variant?: string) {
    const wrapper = variant
        ? ({ children }: { children: ReactNode }) => (
            <ConstraintScopeContext.Provider value={{ path: ['perVariant', variant as never], hidden: ['maxGetal'], fixedPreset: 'compenseren' }}>
                {children}
            </ConstraintScopeContext.Provider>
        )
        : undefined;
    return renderHook(() => useConstraints<BlockConstraints>(blockNow()), { wrapper });
}

describe('useConstraints without a scope', () => {
    beforeEach(seed);

    test('reads the block constraints and writes them back merged', () => {
        const { result } = read();
        expect(result.current[0].maxGetal).toBe(1000);
        act(() => result.current[1]({ maxGetal: 100 }));
        expect(blockNow().constraints.maxGetal).toBe(100);
        // Keys the patch never named survive.
        expect(blockNow().constraints.numberType).toBe('natural');
    });
});

describe('useConstraints inside a variant scope', () => {
    beforeEach(seed);

    test('reads shared settings with the variant overrides laid over them', () => {
        useWorksheetStore.getState().updateBlockSettings(blockNow().id, {
            constraints: { ...blockNow().constraints, perVariant: { '+:compenseren': { maxGetal: 20 } } },
        });
        const { result } = read('+:compenseren');
        expect(result.current[0].maxGetal).toBe(20);          // override wins
        expect(result.current[0].numberType).toBe('natural');  // shared is inherited
        expect(result.current[0].preset).toBe('compenseren');  // the variant owns its oefenvorm
    });

    test('writes only into its own bag and leaves the shared settings alone', () => {
        const { result } = read('+:compenseren');
        act(() => result.current[1]({ presetDistance: 2 }));
        const c = blockNow().constraints;
        expect(c.perVariant).toEqual({ '+:compenseren': { presetDistance: 2 } });
        expect(c.maxGetal).toBe(1000);
    });

    test('keeps other variants and earlier keys when patching', () => {
        useWorksheetStore.getState().updateBlockSettings(blockNow().id, {
            constraints: { ...blockNow().constraints, perVariant: { 'x': { maxGetal: 100 }, '+:compenseren': { presetDistance: 2 } } },
        });
        const { result } = read('+:compenseren');
        act(() => result.current[1]({ equationType: 'puntoefening' }));
        expect(blockNow().constraints.perVariant).toEqual({
            'x': { maxGetal: 100 },
            '+:compenseren': { presetDistance: 2, equationType: 'puntoefening' },
        });
    });

    test('a shared change reaches a variant that has not overridden that key', () => {
        const { result } = read('+:compenseren');
        act(() => result.current[1]({ presetDistance: 2 }));
        useWorksheetStore.getState().updateBlockSettings(blockNow().id, {
            constraints: { ...blockNow().constraints, maxGetal: 10000 },
        });
        expect(read('+:compenseren').result.current[0].maxGetal).toBe(10000);
    });
});
