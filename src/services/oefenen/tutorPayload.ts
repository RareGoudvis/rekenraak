import type { Equation, MathBlock } from '../math/types';
import { packText, unpackText } from './session';

type ItemNumberingMode = MathBlock['itemNumbering'];

// The tutor QR (stappenhulp): one page's hoofdrekenen sums, so tutor.html can list them and show
// their worked steps without reading any print. Exact numbers, never a seed: teachers edit
// operands by hand and generators change between releases.
//   wire: [1, groups]   group: [opdracht number | 0, title, numbering, items]
//   item: [a, b] for a plain a + b (most of a page, so it stays short), else
//         [ops, operands, missing index | -1, answer?], or 0 for a sum without worked steps (a breuk,
//         a compenseren preset, a tafel). That is decided here, where the block's settings are known:
//         the tutor page only sees bare sums and would otherwise show rijgen for every one.

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

export interface TutorGroup {
    n: number | null;
    title: string;
    numbering: ItemNumberingMode;
    items: (Equation | null)[];
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

function itemOut(eq: Equation, variant?: string): unknown {
    if (!eq?.operands?.every(o => typeof o === 'number' && Number.isFinite(o))) return 0;
    const ops = eq.operators && eq.operators.length > 1 ? eq.operators.join('') : eq.operator;
    const missing = missingOf(eq);
    if (!variant && ops === '+' && eq.operands.length === 2 && missing < 0) return eq.operands;
    // The answer only travels for a puntoefening, where the tutor prints it as the given part.
    const answer = missing >= 0 && typeof eq.answer === 'number' ? eq.answer : null;
    if (variant) return [ops, eq.operands, missing, answer, variant];
    return answer !== null ? [ops, eq.operands, missing, answer] : [ops, eq.operands, missing];
}

/** One page's blocks (with their printed opdracht number) → the QR payload, or null when no sum on it has steps. */
export function encodeTutorPage(blocks: { block: MathBlock; n: number | null; title: string }[], hasSteps: (block: MathBlock, ex: Equation) => boolean): string | null {
    const groups = blocks
        .filter(({ block }) => (block.exercises?.length ?? 0) > 0)
        .map(({ block, n, title }) => {
            // Placeholders keep each sum on its printed label (a, b, c ...) even when a neighbour has no steps.
            const items = block.exercises.map(ex => (hasSteps(block, ex) ? itemOut(ex, variantOf(block, ex)) : 0));
            return items.some(it => it !== 0) ? [n ?? 0, title.slice(0, MAX_TITLE), block.itemNumbering ?? null, items] : null;
        })
        .filter(g => g !== null);
    return groups.length ? packText(JSON.stringify([TUTOR_VERSION, groups])) : null;
}

const bad = (why: string): never => { throw new Error(`Deze QR-code kan niet gelezen worden (${why}).`); };

function itemIn(raw: unknown): Equation | null {
    if (raw === 0) return null;
    if (!Array.isArray(raw)) return bad('oefening');
    const [ops, operands, missing, answer, variant] = typeof raw[0] === 'number' && raw.length === 2 ? ['+', raw, -1, undefined, undefined] : raw;
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
