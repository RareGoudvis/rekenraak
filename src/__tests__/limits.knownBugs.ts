import type { Leerjaar } from '../config/gradePresets';

// ── Known limit bugs ─────────────────────────────────────────────────────────
// One entry per still-open BUGS.md id ([Lx] limit, [Ex] other, [Nx] found by this harness).
// limits.matrix.test.ts accepts a violation only when an entry here names its typeId and
// rule AND its `match` holds for the block's constraints; anything else fails the gate.
// The same test runs every trigger case in scripts/limit-trigger-cases.json and fails when
// an entry no longer reproduces there, so a fix agent deletes the entry (and its BUGS.md
// line) in the commit that fixes the generator — from then on the gate enforces the fix.
//
// Matchers read the block's EFFECTIVE constraints (registry defaults → base → leaf →
// override, i.e. block.constraints), never the raw override. A gemengd rule carries the
// variant it came from after an '@' ('answer>max@x:tienvoud'); an entry's rule without '@'
// matches every variant.

type C = Record<string, unknown>;

export interface KnownBug {
    id: string;
    typeIds: string[];
    rules: string[];
    match: (typeId: string, c: C, grade?: Leerjaar | null) => boolean;
}

export interface KnownSkip {
    id: string;
    typeIds: string[];
    // 'hang' never runs anywhere; 'crash' is skipped by the generator matrix but run (and
    // caught) by the limit harness, so its entry still proves it reproduces.
    kind: 'hang' | 'crash';
    match: (typeId: string, c: C) => boolean;
}


// Empty since E1 (hang) and E2 (crash) were fixed; keep the list for the next one.
export const KNOWN_SKIPS: KnownSkip[] = [];

// Empty: every bug the 2026-10-07 limit audit logged is fixed. A new one gets an entry here plus
// a BUGS.md line and a case in scripts/limit-trigger-cases.json.
export const KNOWN_BUGS: KnownBug[] = [];

const ruleMatches = (entryRule: string, rule: string) => rule === entryRule || rule.startsWith(`${entryRule}@`);

/** The known bug a violation belongs to, or null when it is a NEW finding. */
export function knownBugFor(typeId: string, c: C, grade: Leerjaar | null, rule: string): KnownBug | null {
    return KNOWN_BUGS.find(b => b.typeIds.includes(typeId) && b.rules.some(r => ruleMatches(r, rule)) && b.match(typeId, c, grade)) ?? null;
}

/** A setting that must not run at all here: a hang (everywhere) or, for `includeCrashes`, a crash. */
export function skip(typeId: string, c: C, includeCrashes = true): KnownSkip | null {
    return KNOWN_SKIPS.find(s => s.typeIds.includes(typeId) && (includeCrashes || s.kind === 'hang') && s.match(typeId, c)) ?? null;
}
