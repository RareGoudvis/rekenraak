import { describe, test, expect, afterAll } from 'vitest';
import { constraintSpaceFor } from '../config/constraintSpace';
import { buildSessie, listOefenLeaves, rowYields, type BuilderRow, type BuilderSettings, type OefenLeaf } from '../components/oefenen/oefenBuild';
import { nextExercise } from '../services/oefenen/scheduler';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import { KIOSK_LEAF_TABLE_V1, kioskFor, kioskInputOf, kioskInteractOf, kioskLabel, kioskSupports } from '../services/oefenen/kiosk';
import { checkAnswer, normaliseNumber } from '../services/oefenen/check';
import { emptyStats, expectedText, recordAnswer, summary } from '../services/oefenen/stats';
import { numberSpellings } from '../services/oefenen/kioskDescriptors';
import { INTERACT_SEP, type KioskAnswer, type KioskDescriptor, type KioskPiece, type OefenSessie } from '../services/oefenen/types';
import { EMPTY_INTERACTION, type BuildEntry, type InteractionState } from '../components/viewer/ViewerInteractionContext';
import { sanitizeAnswer } from '../oefenen/useOefenStore';
import { numValue } from '../services/math/answerKeys';
import type { OrdenenExercise } from '../services/math/types';
import { rightCells } from './helpers/fillCells';
import { mulberry32 } from './helpers/limitHarness';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';

// O24 end-to-end matrix: every KIOSK_LEAF_TABLE_V1 leaf × its constraintSpace one-option
// variants × SEEDS seeds, through the pupil's whole chain with no browser: the builder's
// buildSessie → the share link (encode → decode) → nextExercise → the descriptor's answer →
// the pupil can enter it (keypad keys / choices / taps / cells / tray / drag) → checkAnswer
// takes it and refuses a wrong one → recordAnswer → summary shows 1 juist (or 1 fout with a
// readable error row). Every break is collected per leaf, so one run lists them all.

const SEEDS = [1, 2, 3];

type Variant = { name: string; over: Record<string, unknown> };

const SETTINGS: BuilderSettings = { id: 'e2e', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };

// Breaks this matrix found, pinned until their fix (BUGS.md id): the main sweep skips a break
// whose leaf and message match, and the `test.fails` pin runs `sample` (it flips when fixed:
// then delete the entry here and its BUGS.md line in the same commit).
interface KnownBreak { bugId: string; leaf: RegExp; match: RegExp; sample: [leafId: string, variant: string] }
const KNOWN_BREAKS: KnownBreak[] = [
];

// Breaks fixed since: the sample that pinned each one runs as a plain test, so a fix stays fixed.
const FIXED: Array<Omit<KnownBreak, 'leaf'>> = [
    // A decimal divisor moves the komma: 742,4 : 0,7 = 1060,57 needs six quotient cells.
    { bugId: 'O25', match: /checkAnswer refuses the entered answer/, sample: ['cijferen-delen-dec', 'operand1Mask={"t":true}'] },
    // "Eigen sprong" 0,5 on a natural / gehele getallenrij: the keypad needs a komma.
    // "Tik aan door welke getallen … deelbaar is" with none: a wrong tap's Resultaten row had an empty Juist cell.
    { bugId: 'O27', match: /unreadable error row .*"expected":""/, sample: ['deelbaarheid-tabel', 'default'] },
    { bugId: 'O26', match: /fill-cells: cell \w+ = '[^']*,[^']*' not typeable/, sample: ['getalbegrip-getallenrijen-nat', 'step=0.5'] },
];

// constraintSpace is a flat union over a type's configs; these one-option variants are no
// setting a teacher can make for that leaf, so they never reach a pupil.
const UNREACHABLE: Array<{ leaf: RegExp; variant: RegExp; why: string }> = [
    { leaf: /^getalbegrip-(getallenassen|getallenrijen)-/, variant: /^numberType=/, why: 'the leaf pins numberType; the config has no picker' },
    { leaf: /^getalbegrip-getallenassen-(nat|geh)$/, variant: /^step=\d*\.\d/, why: 'GetallenasConfig offers decimal steps (and Eigen sprong) only for decimal' },
];

// A table leaf the builder never offers (kiosk-capable only off its defaults); a link can still carry it.
const NOT_IN_BUILDER = ['lengte-meten', 'omtrek'];

const tally = { variants: 0, unreachable: 0, excluded: 0, dead: 0, chains: 0 };
// Chains per input kind (interactive ones by their interaction kind), for the summary line.
const kinds: Record<string, number> = {};

function variantsOf(leaf: OefenLeaf): Variant[] {
    const out: Variant[] = [{ name: 'default', over: {} }];
    for (const [key, options] of Object.entries(constraintSpaceFor(leaf.typeId))) {
        for (const v of options) out.push({ name: `${key}=${JSON.stringify(v)}`, over: { [key]: v } });
    }
    return out;
}

// The builder's max picker shows the registry's list for these settings: a max outside it is unreachable.
function reachable(leaf: OefenLeaf, v: Variant): boolean {
    if (UNREACHABLE.some(u => u.leaf.test(leaf.id) && u.variant.test(v.name))) return false;
    const def = REGISTRY[leaf.typeId];
    const c = { ...(def.defaultConstraints(leaf.typeId) as Record<string, unknown>), ...leaf.constraints, ...v.over };
    const range = def.maxPresets?.(c);
    return !range || !(range.key in v.over) || range.presets.includes(v.over[range.key] as number);
}

const bad = (s: string) => /undefined|NaN|\[object/.test(s);

// The pupil's spelling of a typed answer: the first accepted spelling the keypad can type.
function typeable(spellings: readonly string[], keys: readonly string[], kind: 'number' | 'missing-operand' | 'text' | 'time'): string | null {
    const same = (a: string, b: string) => (kind === 'text' ? a === b : a.replace(',', '.') === b.replace(',', '.'));
    for (const s of spellings) {
        const typed = sanitizeAnswer(s, keys, kind);
        if (same(typed, s)) return typed;
    }
    return null;
}

// A typed number or breuk that is NOT equal to `s` (one more, or one teller more).
function wrongOf(s: string): string {
    const frac = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(s.trim());
    if (frac) {
        const [, sign, w, n, d] = frac;
        return `${sign}${w !== undefined ? `${w} ` : ''}${Number(n) + 1}/${d}`;
    }
    const v = normaliseNumber(s);
    return v === null ? `${s}9` : numberSpellings(Number(v) + 1)[0];
}

// Fewest pieces worth exactly `target` within each piece's max (bounded change-making).
function makeUp(target: number, pieces: KioskPiece[]): BuildEntry[] | null {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const unit = pieces.reduce((g, p) => gcd(g, p.value), 0) || 1;
    if (target % unit || target < 0) return null;
    const n = target / unit;
    const best = new Array<number>(n + 1).fill(Infinity), via = new Array<number>(n + 1).fill(-1), from = new Array<number>(n + 1).fill(-1);
    best[0] = 0;
    pieces.forEach((p, i) => {
        const step = p.value / unit;
        const relax = (v: number) => { if (best[v - step] + 1 < best[v]) { best[v] = best[v - step] + 1; via[v] = i; from[v] = v - step; } };
        if (p.max === undefined) for (let v = step; v <= n; v++) relax(v);
        else for (let k = 0; k < p.max; k++) for (let v = n; v >= step; v--) relax(v);
    });
    if (best[n] === Infinity) return null;
    const counts = new Map<string, number>();
    for (let v = n; v > 0; v = from[v]) counts.set(pieces[via[v]].key, (counts.get(pieces[via[v]].key) ?? 0) + 1);
    return [...counts].map(([key, count]) => ({ key, count }));
}

function permutations<T>(xs: T[]): T[][] {
    if (xs.length <= 1) return [xs];
    return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}

interface Entered { right: KioskAnswer; wrong: KioskAnswer | null }

// What the pupil enters on the card for this exercise (right, and a wrong one), or a reason it cannot.
function enter(typeId: string, d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, exact: boolean | undefined): Entered | string {
    const input = kioskInputOf(d, ex, c);
    const keys = d.keys?.(c) ?? [];
    const check = (a: KioskAnswer) => checkAnswer(d, ex, c, a, exact);
    if (input === 'interactive') {
        const ia = kioskInteractOf(d, c);
        if (!ia) return 'interactive without an interact half';
        const want = ia.answerOf(ex, c);
        const partKeys = ia.keys?.(ex, c) ?? [];
        const from = (st: Partial<InteractionState>) => ia.fromState({ ...EMPTY_INTERACTION, ...st }, ex, c);
        if (ia.kind === 'tap') {
            const right = partKeys.find(k => check(from({ selected: [k] })));
            if (right === undefined) return `tap: no part gives ${want} (parts ${partKeys.join(',')})`;
            const wrong = partKeys.find(k => !check(from({ selected: [k] })));
            return { right: from({ selected: [right] }), wrong: wrong === undefined ? null : from({ selected: [wrong] }) };
        }
        if (ia.kind === 'tap-multi') {
            const parts = want.split(INTERACT_SEP).map(p => p.trim()).filter(Boolean);
            const byValue = partKeys.filter(k => parts.includes(from({ selected: [k] })));
            const byCount = /^\d+$/.test(want) ? partKeys.slice(0, Number(want)) : null;
            const sel = [byValue, byCount].find(s => s && check(from({ selected: s })));
            if (!sel) return `tap-multi: no set of parts gives ${want}`;
            const wrongSel = sel.length ? sel.slice(1) : partKeys.slice(0, 1);
            return { right: from({ selected: sel }), wrong: partKeys.length ? from({ selected: wrongSel }) : null };
        }
        if (ia.kind === 'order') {
            const o = ex as Partial<OrdenenExercise>;
            const bySort = o.display && o.operator
                ? [...partKeys].sort((a, b) => (numValue(o.display![Number(a)]) - numValue(o.display![Number(b)])) * (o.operator === '<' ? 1 : -1))
                : null;
            const tries = bySort ? [bySort] : partKeys.length <= 7 ? permutations(partKeys) : [];
            const seq = tries.find(s => check(from({ order: s })));
            if (!seq) return `order: no tap order gives ${want}`;
            const back = [...seq].reverse();
            return { right: from({ order: seq }), wrong: check(from({ order: back })) ? null : from({ order: back }) };
        }
        if (ia.kind === 'fill-cells') {
            const cells = rightCells(typeId, d, ex, c);
            for (const [k, v] of Object.entries(cells)) {
                if (sanitizeAnswer(v, keys) !== v) return `fill-cells: cell ${k} = '${v}' not typeable with keys [${keys}]`;
                const len = ia.cellOf?.(k, ex, c)?.length;
                if (len !== undefined && v.length > len) return `fill-cells: cell ${k} = '${v}' longer than its ${len} chars`;
            }
            const spoil = Object.keys(cells).find(k => /\d/.test(cells[k]));
            const wrong = spoil ? { ...cells, [spoil]: cells[spoil].replace(/\d(?!.*\d)/, x => String((Number(x) + 1) % 10)) } : null;
            return { right: from({ cells }), wrong: wrong ? from({ cells: wrong }) : null };
        }
        if (ia.kind === 'build') {
            const pieces = ia.pieces?.(ex, c) ?? [];
            const laid = makeUp(Number(want), pieces);
            if (!laid) return `build: the tray [${pieces.map(p => `${p.key}=${p.value}`)}] cannot make ${want}`;
            const smallest = [...pieces].sort((a, b) => a.value - b.value)[0];
            const more = laid.some(b => b.key === smallest.key)
                ? laid.map(b => (b.key === smallest.key ? { ...b, count: b.count + 1 } : b))
                : [...laid, { key: smallest.key, count: 1 }];
            return { right: from({ build: laid }), wrong: from({ build: more }) };
        }
        // drag: a clock face ('h:mm' on the h / m hands) or one number on one handle.
        const hm = /^(\d{1,2}):(\d{2})$/.exec(want);
        let drag: Record<string, number>;
        if (hm) drag = Object.fromEntries(partKeys.map(k => [k, k === 'h' ? Number(hm[1]) % 12 : Number(hm[2])]));
        else if (partKeys.length === 1 && normaliseNumber(want) !== null) drag = { [partKeys[0]]: Number(normaliseNumber(want)) };
        else return `drag: no recipe for ${want} on handles ${partKeys.join(',')}`;
        const tol = ia.tolerance?.(ex, c) ?? 0;
        const off = Object.fromEntries(Object.entries(drag).map(([k, v]) => [k, k === 'h' ? (v + 1) % 12 : k === 'm' ? (v + 1 + Math.floor(tol)) % 60 : v + tol + 1]));
        return { right: from({ drag }), wrong: from({ drag: off }) };
    }
    const accepted = d.answerOf(ex, c);
    if (input === 'choice') {
        const choices = d.choicesOf?.(ex, c) ?? d.choices ?? [];
        const right = accepted.find(a => choices.includes(a));
        if (right === undefined) return `choice: ${accepted} not among the buttons [${choices}]`;
        const wrong = choices.find(x => !accepted.includes(x));
        return { right, wrong: wrong ?? null };
    }
    if (input === 'number+rest') {
        const q = typeable([accepted[0]], keys, 'number'), r = typeable([accepted[1]], keys, 'number');
        if (q === null || r === null) return `number+rest: ${accepted} not typeable with keys [${keys}]`;
        return { right: [q, r], wrong: [q, wrongOf(r)] };
    }
    if (input === 'time') {
        const parts = accepted.map(a => a.split(':')).find(([h, m]) => typeable([h], keys, 'time') === h && typeable([m], keys, 'time') === m);
        if (!parts) return `time: ${accepted} not typeable as uur + minuten`;
        return { right: parts, wrong: [parts[0], String((Number(parts[1]) + 1) % 60).padStart(2, '0')] };
    }
    if (input === 'multi-number') {
        const fields = accepted.map(a => typeable(a.split('|'), keys, 'number'));
        const at = fields.findIndex(f => f === null);
        if (at >= 0) return `multi-number: field ${at + 1} '${accepted[at]}' not typeable with keys [${keys}]`;
        const right = fields as string[];
        return { right, wrong: right.map((f, i) => (i === right.length - 1 ? wrongOf(f) : f)) };
    }
    if (input === 'text') {
        const right = typeable(accepted, keys, 'text');
        if (right === null) return `text: none of ${accepted} survives the text field`;
        return { right, wrong: `${right}x` };
    }
    const right = typeable(accepted, keys, input === 'missing-operand' ? 'missing-operand' : 'number');
    if (right === null) return `${input}: none of [${accepted}] typeable with keys [${keys}]`;
    return { right, wrong: wrongOf(right) };
}

// One variant through the whole chain; returns the breaks (empty = every seed made it).
function runChain(leaf: OefenLeaf, v: Variant): string[] {
    tally.variants++;
    if (!reachable(leaf, v)) { tally.unreachable++; return []; }
    const row: BuilderRow = { key: 'r0', leaf, constraints: { ...leaf.constraints, ...v.over }, limit: 1, weight: 50 };
    // The builder ships neither: an unsupported row stays home, a dead one blocks Delen.
    if (!kioskSupports(leaf.typeId, row.constraints)) { tally.excluded++; return []; }
    if (!rowYields(row)) { tally.dead++; return []; }
    const { sessie: built } = buildSessie([row], SETTINGS);
    if (built.types.length !== 1) return ['buildSessie dropped a supported row'];
    const data = encodeSessie(built);
    if (data === null) return ['encodeSessie: no link'];
    let sessie: OefenSessie;
    try { sessie = decodeSessie(`#oefen=${data}`); } catch (e) { return [`decodeSessie: ${(e as Error).message}`]; }
    const type = sessie.types[0];
    const d = kioskFor(type.typeId);
    if (!d) return [`no descriptor for ${type.typeId}`];
    const breaks: string[] = [];
    for (const seed of SEEDS) {
        const at = `seed ${seed}`;
        const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 7919));
        // The pre-flight said it yields; one seed may still miss (a narrow space), that is not a chain break.
        if (!got) continue;
        tally.chains++;
        const { exercise: ex, constraints: c } = got;
        const input = kioskInputOf(d, ex, c);
        const kind = input === 'interactive' ? kioskInteractOf(d, c)?.kind ?? input : input;
        kinds[kind] = (kinds[kind] ?? 0) + 1;
        const shown = d.display(ex, c);
        if (bad(shown)) breaks.push(`${at}: display "${shown}"`);
        let entered: Entered | string;
        try { entered = enter(type.typeId, d, ex, c, type.exactForm); } catch (e) { entered = `threw ${(e as Error).message}`; }
        if (typeof entered === 'string') { breaks.push(`${at}: ${entered} — ${JSON.stringify(ex)}`); continue; }
        if (!checkAnswer(d, ex, c, entered.right, type.exactForm)) { breaks.push(`${at}: checkAnswer refuses the entered answer ${JSON.stringify(entered.right)}`); continue; }
        if (entered.wrong !== null && checkAnswer(d, ex, c, entered.wrong, type.exactForm)) breaks.push(`${at}: checkAnswer takes the wrong answer ${JSON.stringify(entered.wrong)}`);

        const right = summary(recordAnswer(emptyStats(sessie, 0), 0, type.typeId, ex, entered.right, true, 1000, c, 1000), sessie)[0];
        if (right.made !== 1 || right.correct !== 1 || right.wrong !== 0 || right.errors.length !== 0 || right.pct !== 100) {
            breaks.push(`${at}: summary after a right answer ${JSON.stringify(right)}`);
        }
        if (entered.wrong !== null) {
            const wrong = summary(recordAnswer(emptyStats(sessie, 0), 0, type.typeId, ex, entered.wrong, false, 1000, c, 1000), sessie)[0];
            const err = wrong.errors[0];
            if (wrong.made !== 1 || wrong.correct !== 0 || wrong.wrong !== 1 || !err) breaks.push(`${at}: summary after a wrong answer ${JSON.stringify(wrong)}`);
            else if (!err.expected.trim() || bad(err.expected) || bad(err.given) || bad(err.exercise)) breaks.push(`${at}: unreadable error row ${JSON.stringify(err)}`);
            else if (err.expected !== expectedText(d, ex, c)) breaks.push(`${at}: error row expected ${err.expected} ≠ ${expectedText(d, ex, c)}`);
        }
    }
    return breaks;
}

const builderLeaves = listOefenLeaves();
const byId = new Map(builderLeaves.map(l => [l.id, l]));
// The table leaves the builder does not list, as a link would carry them.
for (const id of NOT_IN_BUILDER) {
    const flat = flattenLeaves().find(l => l.id === id)!;
    byId.set(id, { id, typeId: flat.typeId, label: kioskLabel(flat), context: '', domainId: '', domainLabel: '', accentVar: '', constraints: flat.defaultConstraints ?? {}, instruction: flat.instruction, searchText: [], minGrade: 1 });
}
const found: Record<string, string[]> = {};
const isKnown = (leafId: string, b: string) => KNOWN_BREAKS.some(k => k.leaf.test(leafId) && k.match.test(b));

describe('O24: the kiosk chain end to end, every kiosk leaf × constraintSpace option × 3 seeds', () => {
    test('every leaf of KIOSK_LEAF_TABLE_V1 is in the builder list, except the pinned ones', () => {
        expect(KIOSK_LEAF_TABLE_V1.filter(id => !builderLeaves.some(l => l.id === id))).toEqual(NOT_IN_BUILDER);
    });

    test.each(KIOSK_LEAF_TABLE_V1.map(id => [id]))('%s', (leafId) => {
        const leaf = byId.get(leafId)!;
        const breaks: string[] = [];
        for (const v of variantsOf(leaf)) for (const b of runChain(leaf, v)) if (!isKnown(leafId, b)) breaks.push(`${v.name}: ${b}`);
        if (breaks.length) found[leafId] = breaks;
        expect(breaks).toEqual([]);
    });

    for (const k of KNOWN_BREAKS) {
        test.fails(`${k.bugId} pinned: ${k.sample.join(' ')}`, () => {
            const leaf = byId.get(k.sample[0])!;
            const v = variantsOf(leaf).find(x => x.name === k.sample[1])!;
            expect(runChain(leaf, v).filter(b => k.match.test(b))).toEqual([]);
        });
    }

    for (const k of FIXED) {
        test(`${k.bugId} fixed: ${k.sample.join(' ')}`, () => {
            const leaf = byId.get(k.sample[0])!;
            const v = variantsOf(leaf).find(x => x.name === k.sample[1])!;
            expect(runChain(leaf, v).filter(b => k.match.test(b))).toEqual([]);
        });
    }

    afterAll(() => {
        for (const [leafId, list] of Object.entries(found)) for (const b of list) console.log(`[oefen e2e] BREAK ${leafId} ${b}`);
        const t = tally;
        console.log(`[oefen e2e] ${t.variants} variants: ${t.unreachable} unreachable in the builder, ${t.excluded} not kiosk-supported, ${t.dead} dead (pre-flight), ${t.chains} chains run ${JSON.stringify(kinds)}`);
    });
});
