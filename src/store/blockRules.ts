import type { MathBlock } from '../services/math/types';
import type { BlockConstraints } from '../services/math/constraintTypes';

// Pure decision rules behind updateBlockSettings, kept store-free so they can be unit-tested.

// What of a settings patch survives a locked curriculum; null = nothing, drop the edit.
// prevConstraints = the target block's current constraints (undefined if it is not found).
export function filterLockedUpdates(updates: Partial<MathBlock>, prevConstraints: BlockConstraints | undefined): Partial<MathBlock> | null {
    const allowed: Partial<MathBlock> = {};
    if ('numberOfExercises' in updates) allowed.numberOfExercises = updates.numberOfExercises;
    if ('pageBreakBefore' in updates) allowed.pageBreakBefore = updates.pageBreakBefore;
    // Width is layout, not difficulty: a locked curriculum fixes what the child
    // practises, not how the sheet is arranged (and the picker stays enabled).
    if ('widthUnits' in updates) allowed.widthUnits = updates.widthUnits;
    // ...and for the shrink-to-fit-the-column switch that sits under it: it changes
    // how the block is rendered, never what it asks the child to do. Only that one
    // key is taken out of a constraints patch; the rest is difficulty.
    if ('constraints' in updates) {
        const prev: BlockConstraints = prevConstraints ?? {};
        const patch = (updates.constraints ?? {}) as BlockConstraints;
        if (patch.fitToWidth !== prev.fitToWidth) allowed.constraints = { ...prev, fitToWidth: patch.fitToWidth };
    }
    // Same reasoning for the opdracht title row: presentation, not difficulty.
    if ('showInstruction' in updates) allowed.showInstruction = updates.showInstruction;
    // And for leaving that block out of the opdracht numbering.
    if ('skipNumbering' in updates) allowed.skipNumbering = updates.skipNumbering;
    // And for the 1) / a) numbering in front of each exercise — same reasoning.
    if ('itemNumbering' in updates) allowed.itemNumbering = updates.itemNumbering;
    if (Object.keys(allowed).length === 0) return null;   // drop difficulty/wording/points edits
    return allowed;
}

// The exercise COUNT is the one setting people drag back and forth, and the only
// one that does not invalidate the exercises already on the sheet: shrinking drops
// the tail, growing appends fresh ones. Everything the teacher already liked stays.
// The count slider also clamps the score, so it sends two keys. totalPoints is a
// clamp rather than a content setting, so it does not make the exercises stale.
const COUNT_SAFE = new Set(['numberOfExercises', 'totalPoints']);
// Pure presentation keys: they change how the block prints, never what it asks of
// the child, so they must not raise the "verouderd" flag either.
// widthUnits: the exercises are unchanged, only the cell the packer places them in.
const PRESENTATION_SAFE = new Set(['itemNumbering', 'widthUnits']);

// countOnly = top up/trim the existing exercises; marksStale = raise the "verouderd" flag.
export function classifyUpdate(next: Partial<MathBlock>, prevConstraints: BlockConstraints | undefined): { countOnly: boolean; marksStale: boolean } {
    const countOnly = 'numberOfExercises' in next
        && Object.keys(next).every(k => COUNT_SAFE.has(k));
    // The width fit is presentation too: flipping it re-renders the block, it does not
    // make the exercises disagree with the settings, so it must not raise the
    // "verouderd" flag the way a difficulty edit does.
    const fitToWidthOnly = Object.keys(next).length === 1 && 'constraints' in next && (() => {
        const prev = (prevConstraints ?? {}) as Record<string, unknown>;
        const patch = (next.constraints ?? {}) as Record<string, unknown>;
        return [...new Set([...Object.keys(prev), ...Object.keys(patch)])]
            .every(k => k === 'fitToWidth' || prev[k] === patch[k]);
    })();
    const presentationOnly = Object.keys(next).length > 0
        && Object.keys(next).every(k => PRESENTATION_SAFE.has(k));
    // Any other setting means the exercises no longer match the settings — say so
    // rather than leaving the teacher to notice.
    return { countOnly, marksStale: !(countOnly || fitToWidthOnly || presentationOnly) };
}
