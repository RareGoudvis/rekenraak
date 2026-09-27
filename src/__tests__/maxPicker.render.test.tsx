// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import { makeBlock, isLayoutType } from './helpers/makeBlock';
import { pairwise } from './helpers/pairwise';

// Every config's max picker, rendered for every setting a teacher can reach, must list
// exactly REGISTRY[typeId].maxPresets for those settings — and show no picker where that
// is null. The grade seed floors into the registry list, so a config showing another list
// would floor the seed again on first open (silent difficulty change + undo step).

// The aria-labels of the base-seeded max pickers (maxGetal / maxRange / maxNumber).
const MAX_LABELS = new Set(['Maximum getal', 'Maximum uitkomst', 'Maximum deeltal']);
// Keys the registry's maxPresets functions branch on (SYNC: BRANCH_KEYS in generators.matrix.test.ts).
const BRANCH_KEYS = ['numberType', 'layout', 'subType', 'preset', 'multiplicationMode', 'viewMode', 'rasterVorm', 'operator'];
const PAIRWISE_CAP = 30;

const leaves = flattenLeaves();

// MAB's style previews lazy-mount on scroll; jsdom has no IntersectionObserver.
class IntersectionObserverStub { observe() { } unobserve() { } disconnect() { } }
const g = globalThis as unknown as Record<string, unknown>;
if (!g.IntersectionObserver) g.IntersectionObserver = IntersectionObserverStub;

function casesFor(typeId: string): Record<string, unknown>[] {
    const space = constraintSpaceFor(typeId);
    let branch: Record<string, unknown>[] = [{}];
    for (const k of BRANCH_KEYS.filter(k => (space[k]?.length ?? 0) > 0)) {
        branch = branch.flatMap(c => space[k].map(v => ({ ...c, [k]: v })));
    }
    const all = [
        {},
        ...leaves.filter(l => l.typeId === typeId).map(l => l.defaultConstraints ?? {}),
        ...branch,
        ...pairwise(space, PAIRWISE_CAP),
    ];
    return [...new Map(all.map(c => [JSON.stringify(c), c])).values()];
}

afterEach(cleanup);

const typeIds = Object.keys(REGISTRY).filter(t => !isLayoutType(t) && EXERCISE_UI[t]);

describe.each(typeIds)('%s', (typeId) => {
    test('the rendered max picker equals the registry list for every reachable setting', () => {
        const { Config } = EXERCISE_UI[typeId];
        const def = REGISTRY[typeId];
        for (const c of casesFor(typeId)) {
            const block = makeBlock(typeId, { constraints: c, id: 'b' });
            const { container, unmount } = render(<Config block={block} />);
            const triggers = [...container.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]')]
                .filter(b => MAX_LABELS.has(b.getAttribute('aria-label') ?? ''));
            const rendered = triggers.map(t => {
                fireEvent.click(t);
                const labels = [...container.querySelectorAll('[role="option"]')].map(o => o.textContent ?? '');
                fireEvent.click(t);
                return { aria: t.getAttribute('aria-label'), labels };
            });
            unmount();

            const range = def.maxPresets?.(block.constraints as Record<string, unknown>) ?? null;
            const where = `${typeId} ${JSON.stringify(c)}`;
            if (!range) {
                expect(rendered, `${where}: a picker without a registry list`).toEqual([]);
                continue;
            }
            expect(rendered.length, `${where}: expected one max picker`).toBe(1);
            // "Tot 1.000.000" → 1000000: the label is the only place the value shows.
            const values = rendered[0].labels.map(l => Number(l.replace(/\D/g, '')));
            expect(values, where).toEqual([...range.presets]);
        }
    });
});
