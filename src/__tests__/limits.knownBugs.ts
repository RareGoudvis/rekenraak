import type { Leerjaar } from '../config/gradePresets';
import { ladderFor } from '../services/herleidingen/herleidingenGenerator';
import { getMaskPlaces } from '../services/math/mathEngine';

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

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const masked = (m: unknown, keys?: string[]) =>
    !!m && typeof m === 'object' && Object.entries(m as Record<string, boolean>).some(([k, on]) => on && (!keys || keys.includes(k)));

export const KNOWN_SKIPS: KnownSkip[] = [
    {
        // [E2] CRASH: herleidingen units whose factors are all equal (m² + ca, hm² + ha,
        // dam² + a) leave gridUnits with one entry and pickPair reads index 1.
        id: 'E2', kind: 'crash', typeIds: ['herleidingen'],
        match: (_t, c) => {
            const ladder = ladderFor(str(c.measure, 'lengte'));
            const picked = ladder.filter(u => ((c.units as string[] | undefined) ?? []).includes(u.key));
            return picked.length >= 2 && new Set(picked.map(u => u.factor)).size === 1;
        },
    },
];

export const KNOWN_BUGS: KnownBug[] = [
    // ── WP1 Hoofdrekenen engine ──
    {
        // L19 list side (WP7): met rest has no max picker yet, so the Leerjaar max never reaches
        // the block; the generator already keeps every dividend within the block's own max.
        id: 'L19', typeIds: ['hr-std-delen'], rules: ['dividend>gradeMax'],
        match: (_t, c) => c.multiplicationMode === 'met_rest',
    },

    // ── WP6 Misc generators ──
    {
        id: 'E2', typeIds: ['herleidingen'], rules: ['threw'],
        match: (t, c) => KNOWN_SKIPS.find(s => s.id === 'E2')!.match(t, c),
    },
    {
        id: 'E4b', typeIds: ['ordenen', 'breuken-rangschikken', 'herleidingen', 'maateenheid', 'kalender', 'geld-teruggeven'],
        rules: ['underfill', 'empty-exercise', 'count-short', 'questions<questionCount'],
        match: (t, c) => {
            if (t === 'ordenen') return masked(c.numberMask);
            if (t === 'breuken-rangschikken') return c.fractionMode === 'gelijknamig-te-maken';
            if (t === 'maateenheid') return ((c.grootheden as string[] | undefined) ?? []).length <= 1;
            if (t === 'kalender') return !((c.questionTypes as string[] | undefined) ?? []).includes('dag-van-datum');
            if (t === 'geld-teruggeven') return ((c.payWithOptions as number[] | undefined) ?? []).length <= 1;
            return true;
        },
    },
    {
        id: 'E6', typeIds: ['verbanden'], rules: ['given-not-in-reps', 'target-not-in-reps'],
        match: (_t, c) => c.given !== 'random' && !((c.reps as string[] | undefined) ?? []).includes(str(c.given, 'random')),
    },
    {
        id: 'E8', typeIds: ['geld-herkennen', 'geld-tekenen'], rules: ['amount<=0', 'cents-in-euros', 'unpayable'],
        match: () => true,
    },

    // ── WP7 Grade lists ──
    {
        id: 'L20', typeIds: ['vergelijken', 'plaatswaarde'], rules: ['seeded-max>grade'],
        match: (_t, _c, grade) => grade === 1,
    },

    // ── Found by this harness (BUGS.md 'Limit audit 2026-10-07', harness section) ──
    {
        // A getalopbouw mask on only the top place (weight = max) admits one number.
        // afronden too; the retry loop that hunts for more numbers makes kiezen slow.
        id: 'N2', typeIds: ['plaatswaarde', 'vergelijken', 'afronden'], rules: ['underfill', 'slow'],
        match: (_t, c) => {
            const max = num(c.maxGetal, 1000);
            const on = getMaskPlaces(max, 'natural').filter(p => (c.numberMask as Record<string, boolean> | undefined)?.[p.key]);
            return on.length > 0 && on.every(p => p.weight === max);
        },
    },
];

const ruleMatches = (entryRule: string, rule: string) => rule === entryRule || rule.startsWith(`${entryRule}@`);

/** The known bug a violation belongs to, or null when it is a NEW finding. */
export function knownBugFor(typeId: string, c: C, grade: Leerjaar | null, rule: string): KnownBug | null {
    return KNOWN_BUGS.find(b => b.typeIds.includes(typeId) && b.rules.some(r => ruleMatches(r, rule)) && b.match(typeId, c, grade)) ?? null;
}

/** A setting that must not run at all here: a hang (everywhere) or, for `includeCrashes`, a crash. */
export function skip(typeId: string, c: C, includeCrashes = true): KnownSkip | null {
    return KNOWN_SKIPS.find(s => s.typeIds.includes(typeId) && (includeCrashes || s.kind === 'hang') && s.match(typeId, c)) ?? null;
}
