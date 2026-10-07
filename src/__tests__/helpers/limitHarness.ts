import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { DEFAULT_BASE } from '../../config/baseSettings';
import { GRADE_PRESETS, LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { flattenLeaves } from '../../config/appstructure';
import { constraintSpaceFor } from '../../config/constraintSpace';
import { floorToPreset } from '../../config/numberRanges';
import { makeBlock } from './makeBlock';
import { pairwise } from './pairwise';
import { checkLimits, generatingTypeIds, type Violation } from './limitRules';
import { knownBugFor, skip } from '../limits.knownBugs';

// Shared runner for limits.matrix.test.ts (the gate) and audit/limits.audit.test.ts (the
// full diagnosis): build a block exactly as the store does, generate under a seeded
// Math.random, check it against the rule book and label every violation with its known bug.

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface LimitCase {
    typeId: string;
    leafId?: string;
    // The whole override handed to makeBlock (a leaf case carries the leaf's defaultConstraints).
    constraints: Record<string, unknown>;
    grade: Leerjaar | null;
    seed: number;
    // Exercises asked for; undefined = the registry's defaultCount, as a sidebar click.
    count?: number;
    tag: string;
}

export interface LabelledViolation extends Violation { bugId: string | null }

export interface CaseResult {
    cs: LimitCase;
    block: MathBlock;
    items: unknown[];
    violations: LabelledViolation[];
    ms: number;
    // Known-hang id when the case was not run at all.
    skipped: string | null;
    // The generation note (generateNoted), and whether the block came up short under it.
    note: string | null;
    notedUnderfill: boolean;
}

// A generator that needs longer than this per 10 exercises is as good as frozen on the sheet.
export const SLOW_MS = 2000;

export const gradeBase = (grade: Leerjaar | null) => (grade ? { ...DEFAULT_BASE, ...GRADE_PRESETS[grade] } : DEFAULT_BASE);

export function buildBlock(cs: LimitCase): MathBlock {
    return makeBlock(cs.typeId, {
        constraints: cs.constraints,
        base: gradeBase(cs.grade),
        grade: cs.grade,
        leafId: cs.leafId,
        id: 'limit',
        block: cs.count !== undefined ? { numberOfExercises: cs.count } : undefined,
    });
}

export function runCase(cs: LimitCase, slowMs = SLOW_MS): CaseResult {
    const block = buildBlock(cs);
    const c = block.constraints as Record<string, unknown>;
    const hang = skip(cs.typeId, c, false);
    if (hang) return { cs, block, items: [], violations: [], ms: 0, skipped: hang.id, note: null, notedUnderfill: false };

    const realRandom = Math.random;
    // Plain replacement, not a spy: a spy records every call and runs out of heap on big sweeps.
    Math.random = mulberry32(cs.seed);
    let items: unknown[] = [];
    let note: string | null = null;
    let threw: string | null = null;
    const def = REGISTRY[cs.typeId];
    const t0 = performance.now();
    try {
        // The noted entry point is what the store calls; its note can excuse a short block.
        if (def.generateNoted) ({ items, note } = def.generateNoted(block));
        else items = def.generate(block);
    } catch (e) {
        threw = String((e as Error)?.message ?? e);
    } finally {
        Math.random = realRandom;
    }
    const ms = performance.now() - t0;

    const ctx = { typeId: cs.typeId, block, c, requested: block.numberOfExercises, grade: cs.grade, leafId: cs.leafId, note };
    const raw: Violation[] = threw ? [{ rule: 'threw', observed: threw, limit: 'no throw', example: threw }] : checkLimits(items, ctx);
    const budget = slowMs * Math.max(1, block.numberOfExercises / 10);
    if (ms > budget) raw.push({ rule: 'slow', observed: Math.round(ms), limit: Math.round(budget), example: `${Math.round(ms)} ms for ${block.numberOfExercises}` });
    const violations = raw.map(v => ({ ...v, bugId: knownBugFor(cs.typeId, c, cs.grade, v.rule)?.id ?? null }));
    return { cs, block, items, violations, ms, skipped: null, note, notedUnderfill: !threw && items.length < block.numberOfExercises && note !== null };
}

/** JSON with object keys sorted at every level, so equal data prints byte-identically. */
export function stableStringify(value: unknown): string {
    return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value === null || typeof value !== 'object') return value;
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(obj).sort().filter(k => obj[k] !== undefined).map(k => [k, sortKeys(obj[k])]));
}

/** `<leafId|-><|tag|><stable constraints>`: identical across runs for the same case. */
export const comboKey = (cs: LimitCase) => `${cs.leafId ?? '-'}|${cs.tag}|${stableStringify(cs.constraints)}`;

// Random ids (and any future timestamps) differ between runs without the exercise changing.
const VOLATILE = new Set(['id', 'createdAt', 'updatedAt', 'timestamp']);

/** Exercises with volatile fields removed, for byte-comparable dumps. */
export function normalizeForDump(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalizeForDump);
    if (value === null || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => !VOLATILE.has(k)).map(([k, v]) => [k, normalizeForDump(v)]));
}

// ── Case enumerations ────────────────────────────────────────────────────────

export const leavesOf = (typeId?: string) => flattenLeaves().filter(l => REGISTRY[l.typeId] && !REGISTRY[l.typeId].isFurniture && (!typeId || l.typeId === typeId));

/** Every sidebar leaf at its defaults, without a leerjaar and under each Leerjaar 1-6. */
export function leafGradeCases(seed: number, typeId?: string, count?: number): LimitCase[] {
    const out: LimitCase[] = [];
    for (const leaf of leavesOf(typeId)) {
        for (const grade of [null, ...LEERJAREN] as Array<Leerjaar | null>) {
            out.push({ typeId: leaf.typeId, leafId: leaf.id, constraints: { ...(leaf.defaultConstraints ?? {}) }, grade, seed, count, tag: grade ? `leaf-L${grade}` : 'leaf' });
        }
    }
    return out;
}

// constraintSpace holds the UNION of every max list a type can show, so a flat combo can
// pair a max with settings whose picker never offers it (10 with 'andere' delen). Snap it
// into the list that combo's config shows, as the picker would: limits judge reachable states.
export function reachableMax(typeId: string, combo: Record<string, unknown>): Record<string, unknown> {
    const def = REGISTRY[typeId];
    const range = def?.maxPresets?.({ ...def.defaultConstraints(typeId), ...combo });
    const v = range ? combo[range.key] : undefined;
    if (!range || typeof v !== 'number' || range.presets.length === 0 || range.presets.includes(v)) return combo;
    return { ...combo, [range.key]: floorToPreset(v, range.presets) };
}

/** The generator matrix's pairwise rows over constraintSpace, on the registry defaults. */
export function pairwiseCases(typeId: string, seed: number, count?: number, cap = 200): LimitCase[] {
    return pairwise(constraintSpaceFor(typeId), cap).map(combo => ({ typeId, constraints: reachableMax(typeId, combo), grade: null, seed, count, tag: 'pairwise' }));
}

export interface TriggerCase {
    bugId: string;
    leafId: string | null;
    typeId: string;
    constraints: Record<string, unknown>;
    grade: Leerjaar | null;
    seed: number;
    note: string;
}

// SYNC: scripts/limit-trigger-cases.json is also read by the screenshot tool; keep its shape.
export function triggerCases(): TriggerCase[] {
    const path = fileURLToPath(new URL('../../../scripts/limit-trigger-cases.json', import.meta.url));
    return JSON.parse(readFileSync(path, 'utf8')) as TriggerCase[];
}

export const triggerToCase = (t: TriggerCase): LimitCase =>
    ({ typeId: t.typeId, leafId: t.leafId ?? undefined, constraints: t.constraints, grade: t.grade, seed: t.seed, tag: `trigger-${t.bugId}` });

export { generatingTypeIds };
