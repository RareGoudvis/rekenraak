import type { StepLine, StepToken } from '../math/workedSteps';
import type { HerleidingExercise, HerleidingPart } from '../math/types';
import { ladderFor, measureOfKeys } from '../herleidingen/herleidingLadders';
import { formatMathNumber } from '../math/formatters';

// Herleiden with the herleidingstabel (km hm dam m dm cm mm): put the given quantity in the table, count
// the steps to the asked unit, fill the empty boxes with 0, read the answer off. The table itself is the
// HerleidingsTabel visual; every line's `mark` says which of those steps it reveals there.

export interface HerlCol { key: string; alias?: string; low: number }
export interface HerlCell { pos: number; digit?: string; part?: number; zero?: boolean }
export interface HerlRead { key: string; lo: number; hi: number; value: number }
export interface HerlTabel {
    cols: HerlCol[];
    // Boxes per column: 1, or 2 for oppervlakte (each unit is × 100).
    width: number;
    // Every box of the table, the biggest place first; `part` = the given part a digit came from, `zero` = filled in with a 0.
    cells: HerlCell[];
    // The column the asked unit is in, and (number asked) what each answer part reads: boxes lo..hi, plus
    // the boxes after a komma down to fracLo when the answer has decimals.
    target: string[];
    reads: HerlRead[];
    fracLo?: number;
}

const log10 = (f: number) => Math.round(Math.log10(f));
const num = (v: number): StepToken => ({ t: 'num', v });
const word = (w: string): StepToken => ({ t: 'word', w });
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
// Up to 6 decimals (recomputeHerleiding rounds to that), never an exponent.
const MAX_VALUE = 1e15;

const quantity = (parts: HerleidingPart[]): StepToken[] =>
    parts.flatMap((p, i) => [...(i ? [word(' ')] : []), num(p.value), word(` ${p.key}`)]);
const unitList = (keys: string[]) => (keys.length < 2 ? keys.join('') : `${keys.slice(0, -1).join(', ')} en ${keys[keys.length - 1]}`);

// The table for this exercise with the given parts placed, the boxes up to the asked unit filled with 0
// and what the answer reads; null when the numbers do not fit one table or do not match the answer.
export function herleidTabel(ex: HerleidingExercise | undefined): HerlTabel | null {
    if (!ex?.fromParts?.length || !ex.toParts?.length) return null;
    const all = [...ex.fromParts, ...ex.toParts];
    if (!all.every(p => typeof p?.key === 'string' && typeof p.value === 'number' && Number.isFinite(p.value) && p.value >= 0 && p.value < MAX_VALUE)) return null;
    const measure = measureOfKeys(all.map(p => p.key));
    if (!measure) return null;
    const ladder = ladderFor(measure);
    const width = measure === 'oppervlakte' ? 2 : 1;
    // One column per place: an are-unit (ha, a, ca) is the alias of the square with its factor.
    const cols: HerlCol[] = [];
    for (const u of ladder) {
        const same = cols.find(c => c.low === log10(u.factor));
        if (same) same.alias = u.key; else cols.push({ key: u.key, low: log10(u.factor) });
    }
    const lowOf = (key: string) => log10(ladder.find(u => u.key === key)!.factor);
    const colOf = (key: string) => cols.find(c => c.low === lowOf(key))!.key;
    const maxPos = cols[0].low + width - 1;
    const cells = new Map<number, HerlCell>();

    // A part's last whole digit goes in its unit's last box; digits past the table's first box pile up in it.
    for (const [i, p] of ex.fromParts.entries()) {
        const [int, frac = ''] = String(p.value).split('.');
        const low = lowOf(p.key);
        if (low - frac.length < 0) return null;
        const room = maxPos - low + 1;
        const head = int.length > room ? int.slice(0, int.length - room + 1) : '';
        const digits = [...(head ? [head] : []), ...int.slice(head.length).split(''), ...frac.split('')];
        let pos = low + Math.min(int.length, room) - 1;
        for (const d of digits) {
            if (cells.has(pos)) return null;
            cells.set(pos, { pos, digit: d, part: i });
            pos--;
        }
    }

    const target = ex.blank === 'unit' ? [ex.toParts[0].key] : ex.toParts.map(p => p.key);
    if (ex.blank === 'unit' && (ex.toParts.length !== 1 || !Number.isInteger(ex.toParts[0].value))) return null;
    const occupied = [...cells.keys()];
    const lows = target.map(lowOf);
    const fillLo = Math.min(...occupied, ...lows);
    const fillHi = Math.max(...occupied, ...lows);
    for (let pos = fillLo; pos <= fillHi; pos++) if (!cells.has(pos)) cells.set(pos, { pos, digit: '0', zero: true });
    const digitAt = (pos: number) => cells.get(pos)?.digit ?? '';

    // Each asked part reads its boxes: the biggest from the table's top, the others up to the part before.
    const sorted = target.map(key => ({ key, low: lowOf(key) })).sort((a, b) => b.low - a.low);
    const reads: HerlRead[] = sorted.map(({ key, low }, k) => {
        const hi = k === 0 ? fillHi : sorted[k - 1].low - 1;
        let s = '';
        for (let pos = hi; pos >= low; pos--) s += digitAt(pos);
        return { key, lo: low, hi: Math.max(hi, low), value: Number(s || '0') };
    });
    const last = reads[reads.length - 1];
    let fracDigits = '';
    for (let pos = last.lo - 1; pos >= fillLo; pos--) fracDigits += digitAt(pos);
    fracDigits = fracDigits.replace(/0+$/, '');
    if (fracDigits) last.value = Number(`${last.value}.${fracDigits}`);

    if (ex.blank === 'unit') {
        if (!close(reads[0].value, ex.toParts[0].value)) return null;
    } else if (!ex.toParts.every(p => close(reads.find(r => r.key === p.key)!.value, p.value))) return null;
    const ordered = Array.from({ length: maxPos + 1 }, (_, i) => cells.get(maxPos - i) ?? { pos: maxPos - i });
    // A column shows the asked unit under its own name, an are-unit included.
    return { cols, width, cells: ordered, target: target.map(colOf), reads, ...(fracDigits ? { fracLo: last.lo - fracDigits.length } : {}) };
}

// A zero part is no answer on the key ("71 dl", not "71 dl 0 cl"), so the steps leave it out too.
const answerParts = (ex: HerleidingExercise) => (ex.toParts.some(p => p.value !== 0) ? ex.toParts.filter(p => p.value !== 0) : ex.toParts);

const ask = (mark: string, question: string, hint: string, tokens: StepToken[]): StepLine =>
    ({ kind: `herleiden.${mark.split(':')[0]}`, basis: true, aside: true, question, hint, tokens, mark });

export function herleidingSteps(ex: HerleidingExercise | undefined): StepLine[] | null {
    const tabel = ex && herleidTabel(ex);
    if (!ex || !tabel) return null;
    const lines: StepLine[] = [];

    for (const [i, p] of ex.fromParts.entries()) {
        const int = String(Math.trunc(p.value));
        const lastDigit = int[int.length - 1];
        const tokens = int.length === 1 && Number.isInteger(p.value) ? [num(p.value), word(` onder ${p.key}`)] : [num(p.value), word(`: de ${lastDigit} onder ${p.key}`)];
        const hint = Number.isInteger(p.value) ? `Het laatste cijfer komt onder ${p.key}.` : `Het cijfer voor de komma komt onder ${p.key}.`;
        lines.push(ask(`plaats:${i}`, `Zet ${quantityText(p)} in de tabel.`, hint, tokens));
    }

    // "Van km naar m: 3 stappen naar rechts, dus × 1000": one given and one asked quantity, number asked.
    const from = ex.fromParts[0], to = ex.toParts[0];
    if (ex.blank === 'number' && ex.fromParts.length === 1 && ex.toParts.length === 1 && from.key !== to.key) {
        const colIdx = (key: string) => tabel.cols.findIndex(c => c.key === key || c.alias === key);
        const steps = colIdx(to.key) - colIdx(from.key);
        const factor = 10 ** (Math.abs(steps) * tabel.width);
        if (steps !== 0) {
            lines.push(ask('stappen', `Hoeveel stappen is het van ${from.key} naar ${to.key}?`, 'Tel de kolommen in de tabel.', [
                word(`Van ${from.key} naar ${to.key}: `), num(Math.abs(steps)), word(`${Math.abs(steps) === 1 ? ' stap' : ' stappen'} naar ${steps > 0 ? 'rechts' : 'links'}, dus`),
                { t: 'op', op: steps > 0 ? 'x' : ':' }, num(factor),
            ]));
        }
    }

    const zeroCols = tabel.cols.filter(c => tabel.cells.some(cell => cell.zero && cell.pos >= c.low && cell.pos < c.low + tabel.width)).map(c => c.key);
    if (zeroCols.length) {
        const hint = ex.blank === 'unit' ? `Tot je ${getal(to.value)} hebt.` : `Elk leeg vakje tot onder ${tabel.target[tabel.target.length - 1]}.`;
        lines.push(ask('nullen', 'Welke lege vakjes krijgen een 0?', hint, [word(`onder ${unitList(zeroCols)}`)]));
    }

    if (ex.blank === 'unit') {
        lines.push(ask('lees', `Onder welke eenheid staat het laatste cijfer van ${getal(to.value)}?`, `Lees ${getal(to.value)} in de tabel.`, [word(`onder ${to.key}`)]));
    } else if (ex.toParts.length === 1) {
        const hint = tabel.fracLo !== undefined ? `Na het vakje onder ${to.key} komt de komma.` : `Het laatste cijfer staat onder ${to.key}.`;
        lines.push(ask('lees', `Lees het getal af tot onder ${to.key}.`, hint, [num(to.value), word(` ${to.key}`)]));
    } else {
        lines.push(ask('lees', 'Lees per eenheid af.', 'Elk getal eindigt onder zijn eenheid.', quantity(answerParts(ex))));
    }

    lines.push({ kind: 'herleiden.klaar', basis: true, aside: true, tokens: [...quantity(ex.fromParts), { t: 'eq' }, ...quantity(answerParts(ex))], mark: 'klaar' });
    return lines;
}

// A number inside a question (UI prose), written as the sheet writes it.
const getal = (v: number) => formatMathNumber(v);
const quantityText = (p: HerleidingPart) => `${getal(p.value)} ${p.key}`;
