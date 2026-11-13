import type { Equation, MathBlock } from '../math/types';
import { packText, unpackText } from './packText';
import { codecById, codecForType } from '../steps/tutorCodecs';

type ItemNumberingMode = MathBlock['itemNumbering'];

// The tutor QR (stappenhulp): one page's hoofdrekenen sums, so tutor.html can list them and show
// their worked steps without reading any print. Exact numbers, never a seed: teachers edit
// operands by hand and generators change between releases.
//   wire: [1, groups]   group: [opdracht number | 0, title, numbering, items]
//   item: [a, b] for a plain a + b (most of a page, so it stays short), [a, b, op] for another plain sum, else
//         [ops, operands, missing index | -1, answer?, variant?], or ['@', codec id, data] for any other
//         type (src/services/steps/codecs; breuk van een hoeveelheid used to travel as ['h', t, n, g],
//         still decoded). A sum without worked steps (a tafel, 983 + 2) is shown, never
//         opened: a string '983+2' / '36x?=144', or any item wrapped once ([['@', 'h', [2, 3, 10]]]).
//         0 = a sum the QR cannot carry (a breuk operand; every no-steps sum before 2026-11-13).
//         Steps are decided here, where the block's settings are known: the tutor page only sees
//         bare sums and would otherwise show rijgen for every one.

export const TUTOR_HASH_PREFIX = '#t=';
// The production stappenhulp; the fallback when the sheet is printed from a non-https origin (a dev server).
export const TUTOR_URL = 'https://rekenraak.be/tutor.html';

// The stappenhulp next to the editor that printed the sheet, so a Cloudflare Pages preview's QR
// opens that preview's tutor.html; localhost cannot be reached from a phone, so it prints production.
export function tutorUrlFor(origin: string): string {
    return origin.startsWith('https://') ? `${origin}/tutor.html` : TUTOR_URL;
}
const TUTOR_VERSION = 1;
// Generous for one A4 page (≈ 50 sums ≈ 1 kB of JSON); the cap stops a hand-made deflate bomb.
const MAX_JSON = 20_000;
const MAX_TITLE = 60;
const OPS = new Set(['+', '-', 'x', ':']);
const VARIANT_RE = /^[+\-x:](:compenseren)?$/;

// One operator throughout (a chain of the same op): fold left; mixed operators are never revealed.
function answerOf(ops: string, operands: number[]): number {
    if (![...ops].every(o => o === ops[0])) return 0;
    const fold = operands.reduce((acc, v) => (ops[0] === '+' ? acc + v : ops[0] === '-' ? acc - v : ops[0] === 'x' ? acc * v : acc / v));
    return Number(fold.toFixed(6));
}

// steps false: printed on the list, greyed, never opened (the sheet's own rule said no steps).
export type TutorItem =
    | { kind: 'sum'; eq: Equation; steps: boolean }
    // Any other type: `codec` is its TutorCodec id, `data` what that codec's `in` gave.
    | { kind: 'codec'; codec: string; data: unknown; steps: boolean };

export interface TutorGroup {
    n: number | null;
    title: string;
    numbering: ItemNumberingMode;
    // null: a placeholder that keeps the next sum on its printed label.
    items: (TutorItem | null)[];
}

export interface TutorSheet {
    groups: TutorGroup[];
}

const missingOf = (eq: Equation): number =>
    eq.missingIndex ?? (eq.missingTerm === 'operand1' ? 0 : eq.missingTerm === 'operand2' ? 1 : -1);

// A compenseren sum travels with its variant ('+:compenseren'), so the tutor shows the same strategy as
// the answer key; the block preset lives in the settings, which the QR does not carry.
function variantOf(block: MathBlock, eq: Equation): string | undefined {
    if (eq.variant?.includes(':')) return eq.variant;
    return (block.constraints as { preset?: string } | undefined)?.preset === 'compenseren' ? `${eq.operator}:compenseren` : undefined;
}

const CODEC = '@';
// The breuk van een hoeveelheid form before the codecs: ['h', t, n, g] = ['@', 'h', [t, n, g]].
const LEGACY_HOEVEELHEID = 'h';

const isSum = (ex: unknown): ex is Equation =>
    Array.isArray((ex as Equation | undefined)?.operands) && (ex as Equation).operands.every(o => typeof o === 'number' && Number.isFinite(o));

// The codec's data for this exercise, or null when it cannot travel; a type without a codec travels as a sum or not at all.
function codecOut(typeId: string, ex: unknown, constraints: unknown): unknown {
    const codec = codecForType(typeId);
    if (!codec) return null;
    const data = codec.out(ex, (constraints ?? {}) as Record<string, unknown>);
    return data === null || data === undefined ? null : [CODEC, codec.id, data];
}

// Whether the stappenhulp can show this exercise at all: a type with a codec, else a hoofdrekenen sum.
export function tutorCarries(typeId: string, ex: unknown, constraints: unknown): boolean {
    return codecForType(typeId) ? codecOut(typeId, ex, constraints) !== null : isSum(ex);
}

function sumOut(eq: Equation, variant?: string): unknown {
    const ops = eq.operators && eq.operators.length > 1 ? eq.operators.join('') : eq.operator;
    const missing = missingOf(eq);
    if (!variant && eq.operands.length === 2 && missing < 0) return ops === '+' ? eq.operands : [...eq.operands, ops];
    // The answer only travels for a puntoefening, where the tutor prints it as the given part.
    const answer = missing >= 0 && typeof eq.answer === 'number' ? eq.answer : null;
    if (variant) return [ops, eq.operands, missing, answer, variant];
    return answer !== null ? [ops, eq.operands, missing, answer] : [ops, eq.operands, missing];
}

// A no-steps sum as it reads ('428-176', '36x?=144'): the shortest form, and most of such a page is these.
const NUM = String.raw`\d+(?:\.\d+)?`;
const SUM_STRING_RE = new RegExp(String.raw`^(?:${NUM}|\?)(?:[-+x:](?:${NUM}|\?)){1,3}(?:=${NUM})?$`);
const TERM_RE = new RegExp(String.raw`([-+x:])?(${NUM}|\?)`, 'g');

function sumString(eq: Equation): string | null {
    const ops = eq.operators && eq.operators.length > 1 ? eq.operators : eq.operands.slice(1).map(() => eq.operator);
    const missing = missingOf(eq);
    const text = eq.operands.map((o, i) => (i === missing ? '?' : String(o))).reduce((acc, t, i) => `${acc}${ops[i - 1]}${t}`)
        + (missing >= 0 ? `=${eq.answer}` : '');
    // Anything the string cannot say exactly (an exponent, a negative number) travels as a wrapped item instead.
    const back = sumFromString(text);
    return back && back.operands.every((o, i) => i === missing || o === eq.operands[i]) ? text : null;
}

function sumFromString(text: string): Equation | null {
    if (text.length > 40 || !SUM_STRING_RE.test(text)) return null;
    const [lhs, answer] = text.split('=');
    const terms = [...lhs.matchAll(TERM_RE)];
    const open = terms.flatMap((m, i) => (m[2] === '?' ? [i] : []));
    // Only a puntoefening has an open place, and it always carries its answer.
    if (open.length > 1 || (open.length === 1) !== (answer !== undefined)) return null;
    try {
        return sumIn([terms.slice(1).map(m => m[1]).join(''), terms.map(m => (m[2] === '?' ? 0 : Number(m[2]))), open[0] ?? -1, answer === undefined ? null : Number(answer)]);
    } catch { return null; }
}

function itemOut(block: MathBlock, ex: unknown, steps: boolean, greyed: boolean): { wire: unknown; steps: boolean } {
    if (!steps && !greyed) return { wire: 0, steps: false };
    if (!codecForType(block.typeId) && isSum(ex) && !steps) return { wire: sumString(ex) ?? [sumOut(ex)], steps: false };
    const wire = codecForType(block.typeId) ? codecOut(block.typeId, ex, block.constraints) ?? 0
        : isSum(ex) ? sumOut(ex, variantOf(block, ex))
        : 0;
    return { wire: wire !== 0 && !steps ? [wire] : wire, steps: wire !== 0 && steps };
}

/** One page's blocks (with their printed opdracht number) → the QR payload, or null when no sum on it has steps.
 *  `exercises` is the block's own list (its registry field); absent = the hoofdrekenen `exercises`.
 *  greyed false leaves the sums without steps out (a 0 each), for a page too full for the QR otherwise. */
export function encodeTutorPage(
    blocks: { block: MathBlock; n: number | null; title: string; exercises?: unknown[] }[],
    hasSteps: (block: MathBlock, ex: unknown) => boolean,
    { greyed = true }: { greyed?: boolean } = {},
): string | null {
    const groups = blocks
        .map(({ block, n, title, exercises }) => {
            // Placeholders keep each sum on its printed label (a, b, c ...) even when a neighbour has no steps.
            const items = (exercises ?? block.exercises ?? []).map(ex => itemOut(block, ex, hasSteps(block, ex), greyed));
            return items.some(it => it.steps) ? [n ?? 0, title.slice(0, MAX_TITLE), block.itemNumbering ?? null, items.map(it => it.wire)] : null;
        })
        .filter(g => g !== null);
    return groups.length ? packText(JSON.stringify([TUTOR_VERSION, groups])) : null;
}

const bad = (why: string): never => { throw new Error(`Deze QR-code kan niet gelezen worden (${why}).`); };

// A codec item; an id this page does not know (a QR from a newer release) keeps its place as a placeholder.
function codecIn(id: unknown, wire: unknown, steps: boolean): TutorItem | null {
    const codec = typeof id === 'string' ? codecById(id) : undefined;
    if (!codec) return null;
    const data = codec.in(wire);
    return data === null ? bad(codec.what) : { kind: 'codec', codec: codec.id, data, steps };
}

function itemIn(raw: unknown): TutorItem | null {
    if (raw === 0) return null;
    if (typeof raw === 'string') {
        const eq = sumFromString(raw);
        return eq ? { kind: 'sum', eq, steps: false } : bad('oefening');
    }
    if (!Array.isArray(raw)) return bad('oefening');
    // A sum without steps travels wrapped once: the list prints it, greyed.
    const steps = !(raw.length === 1 && Array.isArray(raw[0]));
    const inner = steps ? raw : raw[0] as unknown[];
    if (inner[0] === CODEC) return inner.length === 3 ? codecIn(inner[1], inner[2], steps) : bad('oefening');
    if (inner[0] === LEGACY_HOEVEELHEID) return codecIn(LEGACY_HOEVEELHEID, inner.slice(1), steps);
    return { kind: 'sum', eq: sumIn(inner), steps };
}

function sumIn(raw: unknown[]): Equation {
    // [a, b] is a plain a + b, [a, b, op] any other plain two-number sum (since 2026-11-13).
    const short = typeof raw[0] === 'number' && (raw.length === 2 || (raw.length === 3 && typeof raw[2] === 'string'));
    const [ops, operands, missing, answer, variant] = short ? [raw[2] ?? '+', raw.slice(0, 2), -1, undefined, undefined] : raw;
    if (variant !== undefined && (typeof variant !== 'string' || !VARIANT_RE.test(variant))) return bad('strategie');
    if (typeof ops !== 'string' || ops.length === 0 || ![...ops].every(o => OPS.has(o))) return bad('bewerking');
    if (!Array.isArray(operands) || operands.length < 2 || operands.length > 4 || !operands.every(o => typeof o === 'number' && Number.isFinite(o))) return bad('getallen');
    if (ops.length > 1 && ops.length !== operands.length - 1) return bad('bewerking');
    if (typeof missing !== 'number' || missing < -1 || missing >= operands.length) return bad('open plaats');
    const operator = ops[0] as Equation['operator'];
    // A whole a : d that does not go is a met-rest sum: only those get steps, so only those travel (no wire change).
    const [a, d] = operands as number[];
    if (ops === ':' && operands.length === 2 && missing < 0 && Number.isInteger(a) && Number.isInteger(d) && d > 1 && a % d !== 0) {
        return { id: '', operands: [a, d], operator, isManuallyEdited: false, answer: Math.floor(a / d), remainder: a % d };
    }
    const eq: Equation = {
        id: '', operands: operands as number[], operator, isManuallyEdited: false,
        // The steps build their own lines; the answer is worked out so every operator decodes truthfully.
        answer: typeof answer === 'number' ? answer : answerOf(ops, operands as number[]),
        ...(ops.length > 1 && { operators: [...ops] as Equation['operator'][] }),
        ...(missing >= 0 && { missingIndex: missing }),
        ...(typeof variant === 'string' && { variant: variant as Equation['variant'] }),
    };
    return eq;
}

/** The tutor link's hash → the page's sums; throws a Dutch message for a broken or future QR. */
export function decodeTutor(hash: string): TutorSheet {
    const data = hash.startsWith(TUTOR_HASH_PREFIX) ? hash.slice(TUTOR_HASH_PREFIX.length) : hash.replace(/^#/, '');
    if (!data) return bad('leeg');
    const json = unpackText(data, MAX_JSON);
    if (!json) return bad('beschadigd');
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { return bad('geen geldige inhoud'); }
    if (!Array.isArray(parsed) || typeof parsed[0] !== 'number') return bad('versie ontbreekt');
    if (parsed[0] > TUTOR_VERSION) throw new Error('Deze QR-code komt uit een nieuwere versie van RekenRaak. Vernieuw de pagina.');
    if (parsed[0] !== TUTOR_VERSION || !Array.isArray(parsed[1])) return bad('versie');
    const groups = parsed[1].map((g: unknown): TutorGroup => {
        if (!Array.isArray(g) || g.length !== 4 || !Array.isArray(g[3])) return bad('opdracht');
        const [n, title, numbering, items] = g;
        if (typeof n !== 'number' || typeof title !== 'string') return bad('opdracht');
        if (numbering !== null && numbering !== 'cijfer' && numbering !== 'letter' && numbering !== 'geen') return bad('nummering');
        return { n: n > 0 ? n : null, title, numbering: (numbering ?? undefined) as ItemNumberingMode, items: items.map(itemIn) };
    });
    return { groups };
}
