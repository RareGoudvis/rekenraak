import { APP_STRUCTURE, LEAF_BY_ID, flattenLeaves, type InstructionFn } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { OEFEN_VERSION, type OefenAttempts, type OefenMode, type OefenSessie } from '../../services/oefenen/types';
import { kioskCapableLeaves, kioskLabel, kioskSupports } from '../../services/oefenen/kiosk';

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
}

export function listOefenLeaves(): OefenLeaf[] {
    const capable = new Set(kioskCapableLeaves().map(l => l.id));
    const appLeaf = new Map(flattenLeaves().map(l => [l.id, l]));
    const out: OefenLeaf[] = [];
    for (const dom of APP_STRUCTURE) for (const sub of dom.subdomains) for (const t of sub.types) {
        for (const leaf of t.children ?? [t]) {
            const flat = appLeaf.get(leaf.id);
            if (!leaf.typeId || !flat || !capable.has(leaf.id)) continue;
            out.push({
                id: leaf.id,
                typeId: leaf.typeId,
                label: kioskLabel(flat),
                context: sub.label,
                domainId: dom.id,
                domainLabel: dom.label,
                accentVar: dom.accentVar,
                constraints: leaf.defaultConstraints ?? {},
                instruction: leaf.instruction,
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
}

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
        rows.push({ key: `r${i}`, leaf, constraints: t.constraints, limit: t.limit, weight: Math.max(1, t.weight) });
    });
    return rows;
}
