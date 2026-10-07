import { describe, test, expect } from 'vitest';
import {
    runCase, leafGradeCases, pairwiseCases, triggerCases, triggerToCase, comboKey, generatingTypeIds,
    type CaseResult,
} from './helpers/limitHarness';
import { KNOWN_BUGS, KNOWN_SKIPS } from './limits.knownBugs';
import { LIMIT_SPECS } from './helpers/limitRules';

// ── The limit gate ───────────────────────────────────────────────────────────
// Every generating type against the rule book in helpers/limitRules.ts: each sidebar leaf
// without a leerjaar and under Leerjaar 1-6, every pairwise row of constraintSpace, and every
// repro in scripts/limit-trigger-cases.json — one fixed seed, so a failure reproduces.
//
// A violation passes only when limits.knownBugs.ts names it. A trigger case whose known bug
// stopped reproducing fails too, so the entry is deleted in the commit that fixes the bug.
// The full diagnosis (more seeds, cartesian/random sweeps, dumps) is `npm run limits:audit`.

const SEED = 1234;
const MAX_LINES = 25;

function unknownLines(r: CaseResult): string[] {
    return r.violations.filter(v => v.bugId === null).map(v =>
        `${r.cs.typeId} ${comboKey(r.cs)} grade=${r.cs.grade ?? '-'} seed=${r.cs.seed}: ${v.rule} observed ${JSON.stringify(v.observed)} limit ${JSON.stringify(v.limit)} :: ${v.example}`);
}

const report = (lines: string[]) => [`${lines.length} violation(s) not covered by limits.knownBugs.ts:`, ...lines.slice(0, MAX_LINES)].join('\n');

test('every generating typeId has a rule book entry', () => {
    const missing = generatingTypeIds().filter(t => !LIMIT_SPECS[t]);
    expect(missing, `add these to LIMIT_SPECS in helpers/limitRules.ts: ${missing.join(', ')}`).toEqual([]);
});

describe.each(generatingTypeIds())('limits: %s', (typeId) => {
    test('sidebar leaves × leerjaar and the pairwise matrix hold their limits', () => {
        const cases = [...leafGradeCases(SEED, typeId), ...pairwiseCases(typeId, SEED)];
        const lines = cases.flatMap(cs => unknownLines(runCase(cs)));
        expect(lines, report(lines)).toEqual([]);
    });
});

describe('limits: trigger cases', () => {
    const triggers = triggerCases();

    test('every known bug and skip has a trigger case', () => {
        const ids = new Set(triggers.map(t => t.bugId));
        const missing = [...KNOWN_BUGS, ...KNOWN_SKIPS].map(b => b.id).filter(id => !ids.has(id));
        expect(missing, `known bugs without a case in scripts/limit-trigger-cases.json: ${missing.join(', ')}`).toEqual([]);
    });

    test('trigger cases show only known bugs, and every known bug still reproduces', () => {
        const reproduced = new Set<string>();
        const lines: string[] = [];
        for (const t of triggers) {
            const r = runCase(triggerToCase(t));
            // A known hang is never run; its skip predicate still matching is all that can be checked.
            if (r.skipped) reproduced.add(r.skipped);
            for (const v of r.violations) if (v.bugId) reproduced.add(v.bugId);
            lines.push(...unknownLines(r));
        }
        const stale = [...new Set([...KNOWN_BUGS, ...KNOWN_SKIPS].map(b => b.id))].filter(id => !reproduced.has(id))
            .map(id => `known bug ${id} no longer reproduces: delete its entry in limits.knownBugs.ts (and its BUGS.md line)`);
        // One assertion, so a run that both breaks a limit and fixes a bug reports both.
        expect([...stale, ...lines], [...stale, ...(lines.length ? [report(lines)] : [])].join('\n')).toEqual([]);
    });
});
