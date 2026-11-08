// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ExercisePreview from '../components/shared/ExercisePreview';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import { DEFAULT_BASE } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { generateForBlock, GENERATION_FAILED } from '../services/generateDispatch';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { classifyUpdate } from '../store/blockRules';
import { parseWorksheetFile, WORKSHEET_FORMAT_VERSION } from '../services/persistence';
import type { MathBlock } from '../services/math/types';
import {
    loadEenvoudigData, listCards, rangesOf, kindsOf, allVariants, typesOf,
    type CardVariant, type EenvoudigData,
} from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV, COMBO_TOPIC_ID } from '../config/eenvoudig/nav';
import { resolveCard } from '../config/eenvoudig/resolveCard';

let data: EenvoudigData;
let variants: CardVariant[];
const MAX_KEYS = ['maxGetal', 'maxRange', 'maxNumber'];
const LEAVES = new Map(flattenLeaves().map(l => [l.id, l]));
const LJ = [1, 2, 3, 4, 5, 6] as const;
// Optional typed fields (constraintTypes.ts) that neither the type's defaults nor its option space list.
const OPTIONAL_TYPED_KEYS: Record<string, string[]> = {
    ordenen: ['minGetal'],
    getallenas: ['fractionStep', 'allowMixed', 'gelijknamig'],
    splitsen: ['decimalPlaces'],
    'hr-std-gemengd': ['selectedTables', 'tableLimit', 'multiplicationMode'],
};

beforeAll(async () => {
    data = await loadEenvoudigData();
    variants = allVariants(data);
    // ExercisePreview renders once scrolled into view and measures with ResizeObserver; jsdom has neither.
    vi.stubGlobal('IntersectionObserver', class {
        cb: (e: { isIntersecting: boolean }[]) => void;
        constructor(cb: (e: { isIntersecting: boolean }[]) => void) { this.cb = cb; }
        observe() { this.cb([{ isIntersecting: true }]); }
        disconnect() { }
        unobserve() { }
    });
    vi.stubGlobal('ResizeObserver', class { observe() { } disconnect() { } unobserve() { } });
});

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => { consoleError = vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); consoleError.mockRestore(); });

test('the data loads and every nav topic with cards has cards', () => {
    expect(variants.length).toBeGreaterThan(700);
    for (const s of EENVOUDIG_NAV) for (const t of s.topics) {
        if (t.id === COMBO_TOPIC_ID) { expect(t.hasCards).toBe(false); continue; }
        expect(typesOf(data, t.id).length, t.id).toBeGreaterThan(0);
    }
    // every card topic is on the nav
    const navIds = new Set(EENVOUDIG_NAV.flatMap(s => s.topics.map(t => t.id)));
    expect([...new Set(data.types.map(t => t.topic))].filter(t => !navIds.has(t))).toEqual([]);
});

test('variant ids are unique', () => {
    const ids = variants.map(v => v.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

describe('listing', () => {
    test('every card button is reachable through the listing helpers', () => {
        const unreachable: string[] = [];
        for (const t of data.types) {
            const ranges = rangesOf(data, t.topic);
            const kinds = [null, ...kindsOf(data, t.topic)];
            const ok = LJ.some(g => kinds.some(kind => (ranges.length ? ranges : [null]).some(max =>
                listCards(data, t.topic, { grade: g, max, kind }).includes(t))));
            if (!ok) unreachable.push(`${t.topic} / ${t.name} (max ${t.max}, grades ${t.grades}, kind ${t.kind})`);
        }
        expect(unreachable, `cards no leerjaar/range/kind combination lists:\n${unreachable.join('\n')}`).toEqual([]);
    });

    test('variants without a button are duplicates of a listed one or belong to the combination builder', () => {
        const listed = data.types.flatMap(t => t.vars);
        const sameBlock = new Set(listed.map(v => JSON.stringify([v.leafId, v.ov])));
        const sameLabel = new Set(listed.map(v => v.label));
        const orphans = data.unlisted
            .filter(u => !sameBlock.has(JSON.stringify([u.leafId, u.ov])) && !sameLabel.has(u.label))
            .filter(u => u.leafId !== 'hr-std-gemengd-nat')
            .map(u => `${u.id} (${u.label})`);
        expect(orphans, `variants with no button and no listed twin:\n${orphans.join('\n')}`).toEqual([]);
    });

    test('default range follows the leerjaar and keeps the data order', () => {
        const optellen = 'Hoofdrekenen · Optellen';
        expect(rangesOf(data, optellen).length).toBeGreaterThan(1);
        const names = (g: Leerjaar) => listCards(data, optellen, { grade: g }).map(t => t.name);
        expect(names(2).length).toBeGreaterThan(0);
        expect(listCards(data, optellen, { grade: 2 }).every(t => t.kind === null)).toBe(true);
        expect(listCards(data, optellen, { grade: 4, kind: 'komma' }).every(t => t.kind === 'komma')).toBe(true);
    });
});

describe('every variant', () => {
    test.each(LJ)('resolves independently of the base and leerjaar (leerjaar %i cards)', (lj) => {
        const pick = variants.filter(v => v.lj === lj);
        const before = pick.map(v => JSON.stringify(resolveCard(v)));
        for (const g of [null, 1, 6] as const) {
            useWorksheetStore.setState({
                selectedGrade: g,
                baseSettings: { ...DEFAULT_BASE, ...(g ? GRADE_PRESETS[g] : {}), baseMaxGetal: g === 1 ? 10 : 100000, baseDecimalPlaces: 3, baseNumberType: g === 6 ? 'decimal' : 'natural' },
            });
            expect(pick.map(v => JSON.stringify(resolveCard(v)))).toEqual(before);
        }
    });

    test('a card with a max resolves to exactly that max', () => {
        const wrong: string[] = [];
        for (const t of data.types) {
            if (t.max == null || t.kind) continue;
            for (const v of t.vars) {
                const c = resolveCard(v).constraints;
                const key = MAX_KEYS.find(k => typeof c[k] === 'number');
                // A block without a numeric max key (roman numerals) has nothing to compare.
                if (key && c[key] !== t.max) wrong.push(`${v.id}: card ${t.max}, block ${key}=${c[key]}`);
            }
        }
        expect(wrong, wrong.join('\n')).toEqual([]);
    });

    test('every override key is known to the type', () => {
        const unknown: string[] = [];
        for (const v of variants) {
            const { typeId } = resolveCard(v);
            // Optional keys some leaf pins (maxWaarde, minGetal...) are part of the type too, just not in its defaults.
            const leafKeys = flattenLeaves().filter(l => l.typeId === typeId).flatMap(l => Object.keys(l.defaultConstraints ?? {}));
            const known = new Set([...Object.keys(constraintSpaceFor(typeId)), ...Object.keys(REGISTRY[typeId].defaultConstraints(typeId)), ...leafKeys, ...(OPTIONAL_TYPED_KEYS[typeId] ?? [])]);
            for (const k of Object.keys(v.ov)) if (!known.has(k)) unknown.push(`${v.id}: ${k} (${typeId})`);
        }
        expect(unknown, unknown.join('\n')).toEqual([]);
    });

    test('count 1 generates exactly one exercise and no failure note', () => {
        const bad: string[] = [];
        for (const v of variants) {
            const r = resolveCard(v);
            const def = REGISTRY[r.typeId];
            const block = {
                id: v.id, typeId: r.typeId, instructionText: '', instructionMode: 'geen', layoutPreset: 'inline-short',
                steppedLines: 3, numberOfExercises: 1, totalPoints: 5, verticalSpacing: 18, constraints: r.constraints, exercises: [],
            } as unknown as MathBlock;
            try {
                const { items, note } = generateForBlock(block, true);
                if (def.isFurniture) continue;
                if (items.length !== 1) bad.push(`${v.id}: ${items.length} items`);
                if (note?.startsWith(GENERATION_FAILED)) bad.push(`${v.id}: ${note}`);
            } catch (e) {
                bad.push(`${v.id}: threw ${String(e)}`);
            }
        }
        expect(bad, bad.join('\n')).toEqual([]);
    });

    test('the one-exercise preview renders without tripping the error boundary', () => {
        const bad: string[] = [];
        for (const v of variants) {
            const r = resolveCard(v);
            const { container, unmount } = render(<ExercisePreview typeId={r.typeId} constraints={r.constraints} fitOne unclamped height={120} />);
            const text = container.textContent ?? '';
            if (text.includes('Voorbeeld niet beschikbaar') || text.includes('niet tekenen')) bad.push(`${v.id} (${r.typeId})`);
            unmount();
        }
        const errors = consoleError.mock.calls.map((a: unknown[]) => String(a[0]));
        expect(bad, `viewer fell back for:\n${bad.join('\n')}`).toEqual([]);
        expect(errors.slice(0, 5)).toEqual([]);
    });
});

describe('addBlockFromType with a card', () => {
    const store = () => useWorksheetStore.getState();
    beforeEach(() => { store().clearBlocks(); });

    test('exact keeps the max on gradeSetsMax leaves at leerjaar 6, even with a different base', () => {
        useWorksheetStore.setState({ selectedGrade: 6, baseSettings: { ...DEFAULT_BASE, ...GRADE_PRESETS[6] } });
        const cards = variants.filter(v => LEAVES.get(v.leafId)?.gradeSetsMax && v.lj < 6);
        expect(cards.length).toBeGreaterThan(0);
        for (const v of cards) {
            const r = resolveCard(v);
            store().addBlockFromType(r.typeId, r.label, r.constraints, { leafId: r.leafId, instruction: r.instruction, exact: true, count: r.count, cardId: v.id });
            const b = store().blocks[store().blocks.length - 1];
            expect(b.constraints, v.id).toEqual(r.constraints);
            expect(b.numberOfExercises).toBe(r.count);
            expect(b.cardId).toBe(v.id);
            expect(b.instructionText).toBe(r.instruction);
        }
    });

    test('without the new options a block is seeded as before and has no cardId', () => {
        useWorksheetStore.setState({ selectedGrade: null, baseSettings: DEFAULT_BASE });
        store().addBlockFromType('hr-std-optellen', 'Optellen');
        const b = store().blocks[0];
        expect(b).not.toHaveProperty('cardId');
        expect(b.numberOfExercises).toBe(REGISTRY['hr-std-optellen'].defaultCount);
    });

    test('cardId is bookkeeping: it never marks the block as outdated', () => {
        expect(classifyUpdate({ cardId: 'x' } as Partial<MathBlock>, {}).marksStale).toBe(false);
    });

    test('cardId survives the worksheet file round-trip without a format bump', () => {
        const r = resolveCard(variants[0]);
        useWorksheetStore.setState({ selectedGrade: null, baseSettings: DEFAULT_BASE });
        store().addBlockFromType(r.typeId, r.label, r.constraints, { leafId: r.leafId, exact: true, cardId: variants[0].id });
        const s = store();
        const parsed = parseWorksheetFile(JSON.stringify({
            version: WORKSHEET_FORMAT_VERSION, exportedAt: 'now', mode: 'full',
            blocks: s.blocks, header: s.header, footer: s.footer, docSettings: s.docSettings, baseSettings: s.baseSettings,
        }));
        expect(parsed.blocks[0].cardId).toBe(variants[0].id);
        expect(parsed.version).toBe(WORKSHEET_FORMAT_VERSION);
    });
});

