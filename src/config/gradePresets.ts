// ── Leerjaar (grade) starting point — SOFT ────────────────────────────────────
// Picking a leerjaar (a) seeds the global base difficulty and (b) hides exercise
// leaves that belong to a later grade from the sidebar. It is NOT a lock: the
// teacher can still clear it ("Alle leerjaren") and add/override anything. Pure
// data (no React) so the store can import it.

import type { BaseSettings } from './baseSettings';

export type Leerjaar = 1 | 2 | 3 | 4 | 5 | 6;

// Minimal shape both APP_STRUCTURE leaf kinds satisfy (LeafExercise + leaf ExerciseType).
interface GradeLeaf { label: string; typeId?: string; defaultConstraints?: Record<string, unknown>; minLeerjaar?: Leerjaar; }
export const LEERJAREN: Leerjaar[] = [1, 2, 3, 4, 5, 6];

// Per-grade base seed (Partial — only the keys a grade pins). Applied via
// updateBaseSettings, so it only affects NEW blocks (existing stay put).
// Number type stays 'natural' by default; we widen the max range as the grade climbs.
// Ceilings follow the leerplan (Natuurlijke getallen interpreteren-clusters per leerjaar):
//   L1 ≤20 · L2 ≤100 · L3 ≤1.000 · L4 ≤10.000 · L5 ≤1.000.000 · L6 ≤10 miljard
export const GRADE_PRESETS: Record<Leerjaar, Partial<BaseSettings>> = {
    1: { baseMaxGetal: 20 },
    2: { baseMaxGetal: 100 },
    3: { baseMaxGetal: 1000 },
    4: { baseMaxGetal: 10000, baseDecimalPlaces: 2 },
    5: { baseMaxGetal: 1000000, baseDecimalPlaces: 2 },
    6: { baseMaxGetal: 10000000000, baseDecimalPlaces: 2 },
};

// Earliest leerjaar each NUMBER TYPE is introduced (leerplan-grounded):
// natuurlijke always · rationale/breuken from L2 · gehele + decimale from L4.
function numberTypeGrade(nt: string): Leerjaar {
    if (nt === 'decimal' || nt === 'geheel') return 4;
    if (nt === 'rational') return 2;
    return 1;
}
// Same, inferred from a leaf label when defaultConstraints carries no numberType
// (e.g. visual breuken, leaves labelled "Gehele/Decimale getallen").
function labelGrade(lbl: string): Leerjaar {
    if (lbl.includes('decimal') || lbl.includes('komma')) return 4;
    if (lbl.includes('gehele') || lbl.includes('negatie')) return 4;
    if (lbl.includes('breuk') || lbl.includes('rationale')) return 2;
    return 1;
}
// Exercise-type → earliest leerjaar it's introduced (leerplan-grounded; substring
// match on typeId). Skills NOT listed are L1 (visible always; range grows via the
// seeded max). Multiple matches resolve by max() with the number-type/label grade.
const TYPE_MIN_LEERJAAR: Array<[string, Leerjaar]> = [
    ['cijferen', 3], ['afronden', 3], ['temperatuur', 3],
    ['getalpatronen', 2], ['vermenigvuldigen', 2], ['delen', 2],
    ['even-oneven', 2], ['herleidingen', 2],
    ['breuken-bewerken', 4], ['deelbaarheid', 3], ['romeinse', 5],
];
function typeGrade(typeId: string): Leerjaar {
    let g: Leerjaar = 1;
    for (const [key, lj] of TYPE_MIN_LEERJAAR) if (typeId.includes(key) && lj > g) g = lj;
    return g;
}

// Earliest leerjaar a leaf is introduced = the strictest of: an explicit tag, its
// number type, its label, and its exercise type. e.g. "cijferen decimale getallen"
// = max(cijferen L3, decimal L4) = L4.
export function leafMinLeerjaar(leaf: GradeLeaf): Leerjaar {
    const nt = (leaf.defaultConstraints?.numberType as string | undefined) ?? '';
    return Math.max(
        leaf.minLeerjaar ?? 1,
        numberTypeGrade(nt),
        labelGrade(leaf.label.toLowerCase()),
        typeGrade(leaf.typeId ?? ''),
    ) as Leerjaar;
}

export function leafAllowedForGrade(leaf: GradeLeaf, grade: Leerjaar | null): boolean {
    if (grade == null) return true;
    return leafMinLeerjaar(leaf) <= grade;
}
