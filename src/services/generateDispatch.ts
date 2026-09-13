import type { MathBlock } from './math/types';
import { REGISTRY } from '../config/exerciseRegistry';

// Generic exercise setter shape (the store's setExercises action).
export type SetExercises = (id: string, field: keyof MathBlock, data: unknown[]) => void;

// Prefix of the note written when a generator throws — the Inspector keys its
// warning colour off it, so both sides must agree on the wording.
export const GENERATION_FAILED = 'Kon geen oefeningen maken:';

// Optional sink for the teacher-facing note about the last generate (the store's
// setGenerationNote action). Callers that don't care may omit it.
export type SetGenerationNote = (id: string, note: string | null) => void;

// Extra regeneration rounds spent topping up a deduped pool before giving up and
// accepting a short result (small legitimate pools like "klok op het uur" stay short).
const DEDUPE_MAX_ROUNDS = 8;

// Stable content key for "Geen dubbele oefeningen": the registry row's own exerciseKey
// when the type needs one (e.g. random display-only fields that would make identical
// sums look different), else every `id`-shaped field stripped and the rest stringified.
// Nested ids are rare in this codebase (checked types.ts) but stripped defensively.
function stripIds(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripIds);
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (k === 'id') continue;
            out[k] = stripIds(v);
        }
        return out;
    }
    return value;
}

function defaultExerciseKey(ex: unknown): string {
    return JSON.stringify(stripIds(ex));
}

// Dedupe an exercise array by content key, re-running the generator to fill the
// shortfall. Generators use raw Math.random (no seed), so a re-call yields new draws.
// Returns the final items plus how many duplicates were dropped and never replaced
// (a small pool, e.g. 12 hours-only klok, legitimately runs out).
function dedupeWithTopUp(
    block: MathBlock,
    generate: (b: MathBlock) => unknown[],
    initial: unknown[],
    keyFn: (ex: unknown) => string,
    // Topping up an existing block: `exclude` are the keys already on the sheet, `pad`
    // the exercises a too-small pool may repeat from. Both empty on a first generate.
    opts: { wanted?: number; exclude?: Set<string>; pad?: unknown[] } = {},
): { items: unknown[]; shortBy: number } {
    const wanted = opts.wanted ?? initial.length;
    const seen = new Set<string>(opts.exclude ?? []);
    const kept: unknown[] = [];
    const take = (candidates: unknown[]) => {
        for (const ex of candidates) {
            if (kept.length >= wanted) break;
            const key = keyFn(ex);
            if (seen.has(key)) continue;
            seen.add(key);
            kept.push(ex);
        }
    };
    take(initial);
    for (let round = 0; kept.length < wanted && round < DEDUPE_MAX_ROUNDS; round++) {
        take(generate(block));
    }
    // The teacher asked for `wanted` exercises: a pool too small to fill them (12 hours-only
    // clock times for 15 questions) pads with repeats rather than handing back a short block.
    const shortBy = wanted - kept.length;
    for (const ex of [...initial, ...(opts.pad ?? [])]) {
        if (kept.length >= wanted) break;
        if (!kept.includes(ex)) kept.push(ex);
    }
    return { items: kept, shortBy };
}

/** A block's exercises the way every generate path produces them: the registry generator,
    deduped and topped up when the sheet says "Geen dubbele oefeningen". */
export function generateForBlock(block: MathBlock, uniqueExercises?: boolean): { items: unknown[]; note: string | null } {
    const def = REGISTRY[block.typeId];
    if (!def) return { items: [], note: null };
    const { items, note } = def.generateNoted ? def.generateNoted(block) : { items: def.generate(block), note: null };
    if (!uniqueExercises || items.length <= 1) return { items, note };
    const { items: deduped, shortBy } = dedupeWithTopUp(block, def.generate, items, def.exerciseKey ?? defaultExerciseKey);
    return { items: deduped, note: joinNotes(note, shortNote(shortBy)) };
}

// Teacher-facing wording for a pool too small to fill the block — one phrasing for both
// the first generate and a later count increase.
function shortNote(shortBy: number): string | null {
    if (shortBy <= 0) return null;
    return `Kleine reeks: ${shortBy} oefening${shortBy === 1 ? '' : 'en'} kom${shortBy === 1 ? 't' : 'en'} dubbel voor.`;
}

function joinNotes(a: string | null, b: string | null): string | null {
    return a && b ? `${a} ${b}` : (a ?? b);
}

/** The block's exercises after its count was raised: `existing` stays, the tail is generated
    under the same dedupe-and-pad policy as a first generate. Shrinking just cuts the tail. */
export function generateExtra(block: MathBlock, existing: unknown[], want: number, unique?: boolean): { items: unknown[]; note: string | null } {
    const def = REGISTRY[block.typeId];
    if (!def || want <= existing.length) return { items: existing.slice(0, Math.max(want, 0)), note: null };
    const need = want - existing.length;
    // Ask the generator for the shortfall only — the kept exercises already cover the rest.
    const sized = { ...block, numberOfExercises: need };
    const { items, note } = def.generateNoted ? def.generateNoted(sized) : { items: def.generate(sized), note: null };
    if (!unique) return { items: [...existing, ...items.slice(0, need)], note };
    const keyFn = def.exerciseKey ?? defaultExerciseKey;
    const { items: fresh, shortBy } = dedupeWithTopUp(sized, def.generate, items, keyFn, {
        wanted: need,
        exclude: new Set(existing.map(keyFn)),
        pad: existing,
    });
    return { items: [...existing, ...fresh], note: joinNotes(note, shortNote(shortBy)) };
}

/** Content key of one exercise, for callers that add to an existing set. */
export function exerciseKeyOf(typeId: string, ex: unknown): string {
    return (REGISTRY[typeId]?.exerciseKey ?? defaultExerciseKey)(ex);
}

// Single entry point for generating a block's exercises. Looks the type up in the
// registry, runs its generator, writes the result to the registry-declared field.
// Called by the per-block "Genereer" (Inspector) and "Genereer alles" (store).
// `uniqueExercises` is the sheet-wide DocSettings toggle ("Geen dubbele oefeningen"),
// threaded in by callers since generateDispatch (a plain service) has no store access.

export function regenerateBlock(block: MathBlock, setExercises: SetExercises, setGenerationNote?: SetGenerationNote, uniqueExercises?: boolean): void {
    const def = REGISTRY[block.typeId];
    if (!def) return;
    try {
        const { items, note } = generateForBlock(block, uniqueExercises);
        setExercises(block.id, def.exerciseField, items);
        setGenerationNote?.(block.id, note);
    } catch (err) {
        // A throwing generator used to leave the previous exercises in place with no hint
        // that Genereer had failed at all.
        console.warn(`[rekenraak] generator for ${block.typeId} threw`, err);
        setGenerationNote?.(block.id, `${GENERATION_FAILED} ${err instanceof Error ? err.message : String(err)}`);
    }
}
