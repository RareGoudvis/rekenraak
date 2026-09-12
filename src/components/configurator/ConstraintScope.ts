import { createContext, useContext, useMemo } from 'react';
import type { MixedVariantId } from '../../services/math/constraintTypes';

/**
 * The nested constraint bag the config plugins below this provider edit.
 *
 * Without a scope a plugin reads and writes `block.constraints` itself (the normal case).
 * Inside one — the per-variant tabs of `hr-std-gemengd` — the same untouched plugin reads
 * the merged view `{...root, ...root.perVariant[id]}` and writes ONLY into
 * `perVariant[id]`, so a tab stores what it overrides and inherits the rest.
 */
export interface ConstraintScopeValue {
    /** Where the override bag lives inside `block.constraints`. */
    path: ['perVariant', MixedVariantId];
    /** Setting keys whose control stays on the shared panel — plugins skip rendering them. */
    hidden?: readonly string[];
    /**
     * The variant's oefenvorm. Forced into the scoped read (the plugin branches on
     * `preset`) and it makes HrPresetRow drop its picker: the variant IS the choice.
     */
    fixedPreset?: 'vrij' | 'compenseren' | 'tienvoud';
}

// Exported as the bare context (no wrapper component) so this file stays hook-only and
// React Fast Refresh keeps working for the plugins that import from it.
export const ConstraintScopeContext = createContext<ConstraintScopeValue | null>(null);

/** The active scope, or null when the plugin edits the block's own constraints. */
export function useConstraintScope(): ConstraintScopeValue | null {
    return useContext(ConstraintScopeContext);
}

/** Set of setting keys the surrounding scope renders itself; empty outside a scope. */
export function useHiddenControls(): ReadonlySet<string> {
    const scope = useContext(ConstraintScopeContext);
    const hidden = scope?.hidden;
    return useMemo(() => new Set(hidden ?? []), [hidden]);
}
