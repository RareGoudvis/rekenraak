import { APP_STRUCTURE, LEAF_BY_ID, flattenLeaves, type InstructionFn } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { OEFEN_VERSION, type OefenAttempts, type OefenMode, type OefenSessie, type OefenType } from '../../services/oefenen/types';
import { kioskCapableLeaves, kioskFor, kioskLabel, kioskSupports } from '../../services/oefenen/kiosk';
import { deadSlots, nextExercise, type Rng } from '../../services/oefenen/scheduler';
import { LEERJAREN, leafAllowedForGrade, type Leerjaar } from '../../config/gradePresets';

// A kiosk-capable sidebar leaf plus where it lives in the sidebar (for grouping).
export interface OefenLeaf {
    id: string;
    typeId: string;
    label: string;            // kioskLabel: the builder's name and the pupil's stats row
    context: string;          // subdomain label
    domainId: string;
    domainLabel: string;
    accentVar: string;
    constraints: Record<string, unknown>;
    instruction?: string | InstructionFn;
    // Lower-cased labels the catalogue search matches: kiosk + sidebar label, parent, subdomain, domain.
    searchText: string[];
    // First leerjaar the sidebar's filter shows this leaf in (leafAllowedForGrade).
    minGrade: Leerjaar;
}

// Case-insensitive substring match on the leaf's labels (the sidebar's search rule) + its leerjaar filter.
export function filterOefenLeaves(leaves: OefenLeaf[], query: string, grade: Leerjaar | null): OefenLeaf[] {
    const needle = query.trim().toLowerCase();
    return leaves.filter(l => (grade === null || l.minGrade <= grade) && (!needle || l.searchText.some(s => s.includes(needle))));
}

export function listOefenLeaves(): OefenLeaf[] {
    const capable = new Set(kioskCapableLeaves().map(l => l.id));
    const appLeaf = new Map(flattenLeaves().map(l => [l.id, l]));
    const out: OefenLeaf[] = [];
    for (const dom of APP_STRUCTURE) for (const sub of dom.subdomains) for (const t of sub.types) {
        for (const leaf of t.children ?? [t]) {
            const flat = appLeaf.get(leaf.id);
            if (!leaf.typeId || !flat || !capable.has(leaf.id)) continue;
            const label = kioskLabel(flat);
            out.push({
                id: leaf.id,
                typeId: leaf.typeId,
                label,
                context: sub.label,
                domainId: dom.id,
                domainLabel: dom.label,
                accentVar: dom.accentVar,
                constraints: leaf.defaultConstraints ?? {},
                instruction: leaf.instruction,
                searchText: [label, leaf.label, ...(t.children ? [t.label] : []), sub.label, dom.label].map(s => s.toLowerCase()),
                minGrade: LEERJAREN.find(g => leafAllowedForGrade(leaf, g)) ?? 6,
            });
        }
    }
    return out;
}

export interface BuilderRow {
    key: string;                              // stable row id; the draft block is `draft-oefen-<key>`
    leaf: OefenLeaf;
    constraints: Record<string, unknown>;     // the draft block's current constraints
    limit?: number;
    weight: number;                           // raw slider value 1-100, normalised on build
    exactForm?: boolean;                      // the teacher's "Antwoord" pick; absent = the descriptor default
}

/** The row's breuk-answer default (exactFormDefault), or undefined where the row asks no breuk. */
export const exactFormDefaultOf = (row: Pick<BuilderRow, 'leaf' | 'constraints'>): boolean | undefined =>
    kioskFor(row.leaf.typeId)?.exactFormDefault?.(row.constraints);

export interface BuilderSettings {
    id: string;
    createdAt: number;
    title: string;
    mode: OefenMode;
    allowRepeatType: boolean;
    timerMin?: number;
    testMode: boolean;
    statsLocked: boolean;
    // Kansen per oefening; absent = 1.
    attempts?: OefenAttempts;
}

// Slider 0-50; 0 is the left stop and means no cap (limit undefined).
export const LIMIT_MAX = 50;
export const TIMER_STEPS: (number | undefined)[] = [undefined, 5, 10, 15, 20, 30];

export const draftIdOf = (rowKey: string) => `draft-oefen-${rowKey}`;

// Whole percentages that sum to exactly 100 (largest remainder); all-zero input = equal split.
export function normaliseWeights(raw: number[]): number[] {
    if (raw.length === 0) return [];
    const clean = raw.map(w => (Number.isFinite(w) && w > 0 ? w : 0));
    const sum = clean.reduce((a, b) => a + b, 0);
    const shares = sum === 0 ? clean.map(() => 100 / clean.length) : clean.map(w => (w / sum) * 100);
    const floors = shares.map(Math.floor);
    let left = 100 - floors.reduce((a, b) => a + b, 0);
    const order = shares.map((s, i) => ({ i, rem: s - floors[i] })).sort((a, b) => b.rem - a.rem);
    for (const { i } of order) { if (left <= 0) break; floors[i]++; left--; }
    return floors;
}

// Rows the kiosk cannot check (e.g. afronden rooster) stay on screen with a hint but never ship.
export function buildSessie(rows: BuilderRow[], s: BuilderSettings): { sessie: OefenSessie; excluded: BuilderRow[] } {
    const shipped = rows.filter(r => kioskSupports(r.leaf.typeId, r.constraints));
    const excluded = rows.filter(r => !shipped.includes(r));
    const weights = normaliseWeights(shipped.map(r => r.weight));
    const sessie: OefenSessie = {
        v: OEFEN_VERSION,
        id: s.id,
        ...(s.title.trim() ? { title: s.title.trim() } : {}),
        createdAt: s.createdAt,
        types: shipped.map((r, i) => ({
            typeId: r.leaf.typeId,
            leafId: r.leaf.id,
            label: r.leaf.label,
            // Frozen to plain text now: a function-valued instruction cannot ride in the link.
            instruction: resolveInstruction(r.leaf.instruction, r.leaf.typeId, LEAF_BY_ID[r.leaf.id]?.label ?? r.leaf.label, r.constraints as BlockConstraints),
            constraints: r.constraints,
            ...(r.limit ? { limit: r.limit } : {}),
            weight: weights[i],
            // Only where the check reads it (exactFormOf ignores it without a default): keeps the link short.
            ...(r.exactForm !== undefined && exactFormDefaultOf(r) !== undefined ? { exactForm: r.exactForm } : {}),
        })),
        mode: s.mode,
        // Afwisselen never repeats a type by definition; only willekeurig can allow it.
        allowRepeatType: s.mode === 'willekeurig' && s.allowRepeatType,
        ...(s.timerMin ? { timerMin: s.timerMin } : {}),
        testMode: s.testMode,
        statsLocked: s.statsLocked,
        // A retry needs the juist/fout feedback testmodus hides, so testmodus ships one try.
        ...(s.attempts === 2 && !s.testMode ? { attempts: 2 as const } : {}),
    };
    return { sessie, excluded };
}

// Reopen a saved session in the builder; types whose leaf is gone are dropped.
export function rowsFromSessie(sessie: OefenSessie): BuilderRow[] {
    const leaves = new Map(listOefenLeaves().map(l => [l.id, l]));
    const rows: BuilderRow[] = [];
    sessie.types.forEach((t, i) => {
        const leaf = leaves.get(t.leafId);
        if (!leaf) return;
        rows.push({ key: `r${i}`, leaf, constraints: t.constraints, limit: t.limit, weight: Math.max(1, t.weight), ...(t.exactForm !== undefined ? { exactForm: t.exactForm } : {}) });
    });
    return rows;
}

// Pre-flight verdicts per draft constraints object: the store swaps the object on every edit, so identity = freshness.
const yieldCache = new WeakMap<object, Map<string, boolean>>();

/** The row's settings give the kiosk at least one exercise: one draw through the kiosk's own nextExercise. */
export function rowYields(row: Pick<BuilderRow, 'leaf' | 'constraints'>, rng?: Rng): boolean {
    const cacheKey = `${row.leaf.typeId}|${row.leaf.id}`;
    const cached = rng ? undefined : yieldCache.get(row.constraints)?.get(cacheKey);
    if (cached !== undefined) return cached;
    const type: OefenType = { typeId: row.leaf.typeId, leafId: row.leaf.id, label: row.leaf.label, constraints: row.constraints, weight: 100 };
    const probe: OefenSessie = { v: OEFEN_VERSION, id: 'preflight', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
    // Unseeded callers get the kiosk's own fixed-seed verdict (deadSlots), so dead/alive never depends on Math.random.
    const yields = rng ? nextExercise(probe, type, new Set(), rng) !== null : !deadSlots(probe).has(0);
    if (!rng) {
        const perRow = yieldCache.get(row.constraints) ?? new Map<string, boolean>();
        perRow.set(cacheKey, yields);
        yieldCache.set(row.constraints, perRow);
    }
    return yields;
}

/** Rows whose settings generate nothing: the kiosk would end a pupil's run on them, so Delen waits. */
export const deadRows = (rows: BuilderRow[]): BuilderRow[] => rows.filter(r => !rowYields(r));

/** A saved session's dead rows, so Delen outside the builder (Mijn bladen) runs the same pre-flight. */
export const deadRowsOf = (sessie: OefenSessie): BuilderRow[] => deadRows(rowsFromSessie(sessie));

// The builder's preview of a dead row: the viewers' own empty text asks for a Genereer button the builder has not.
export const EMPTY_PREVIEW = 'Geen oefeningen met deze instellingen';
