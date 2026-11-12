import type { Equation, MathBlock } from '../math/types';
import { packText, unpackText } from './session';

type ItemNumberingMode = MathBlock['itemNumbering'];

// The tutor QR (stappenhulp): one page's hoofdrekenen sums, so tutor.html can list them and show
// their worked steps without reading any print. Exact numbers, never a seed: teachers edit
// operands by hand and generators change between releases.
//   wire: [1, groups]   group: [opdracht number | 0, title, numbering, items]
//   item: [a, b] for a plain a + b (most of a page, so it stays short), else
//         [ops, operands, missing index | -1, answer?], or 0 for a sum the QR cannot carry (a breuk).

export const TUTOR_HASH_PREFIX = '#t=';
// Served next to the editor, so every printed QR keeps working wherever the page is later hosted.
export const TUTOR_URL = 'https://rekenraak.be/tutor.html';
const TUTOR_VERSION = 1;
// Generous for one A4 page (≈ 50 sums ≈ 1 kB of JSON); the cap stops a hand-made deflate bomb.
const MAX_JSON = 20_000;
const MAX_TITLE = 60;
const OPS = new Set(['+', '-', 'x', ':']);

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

function itemOut(eq: Equation): unknown {
    if (!eq?.operands?.every(o => typeof o === 'number' && Number.isFinite(o))) return 0;
    const ops = eq.operators && eq.operators.length > 1 ? eq.operators.join('') : eq.operator;
    const missing = missingOf(eq);
    if (ops === '+' && eq.operands.length === 2 && missing < 0) return eq.operands;
    // The answer only travels for a puntoefening, where the tutor prints it as the given part.
    return missing >= 0 && typeof eq.answer === 'number' ? [ops, eq.operands, missing, eq.answer] : [ops, eq.operands, missing];
}

/** One page's blocks (with their printed opdracht number) → the QR payload, or null when none carries sums. */
export function encodeTutorPage(blocks: { block: MathBlock; n: number | null; title: string }[], hasSteps: (typeId: string) => boolean): string | null {
    const groups = blocks
        .filter(({ block }) => hasSteps(block.typeId) && (block.exercises?.length ?? 0) > 0)
        .map(({ block, n, title }) => [n ?? 0, title.slice(0, MAX_TITLE), block.itemNumbering ?? null, block.exercises.map(itemOut)]);
    return groups.length ? packText(JSON.stringify([TUTOR_VERSION, groups])) : null;
}

const bad = (why: string): never => { throw new Error(`Deze QR-code kan niet gelezen worden (${why}).`); };

function itemIn(raw: unknown): Equation | null {
    if (raw === 0) return null;
    if (!Array.isArray(raw)) return bad('oefening');
    const [ops, operands, missing, answer] = typeof raw[0] === 'number' && raw.length === 2 ? ['+', raw, -1, undefined] : raw;
    if (typeof ops !== 'string' || ops.length === 0 || ![...ops].every(o => OPS.has(o))) return bad('bewerking');
    if (!Array.isArray(operands) || operands.length < 2 || operands.length > 4 || !operands.every(o => typeof o === 'number' && Number.isFinite(o))) return bad('getallen');
    if (ops.length > 1 && ops.length !== operands.length - 1) return bad('bewerking');
    if (typeof missing !== 'number' || missing < -1 || missing >= operands.length) return bad('open plaats');
    const operator = ops[0] as Equation['operator'];
    const eq: Equation = {
        id: '', operands: operands as number[], operator, isManuallyEdited: false,
        // Only + needs a computed answer here (the steps build their own); others are never revealed.
        answer: typeof answer === 'number' ? answer : ops === '+' ? (operands as number[]).reduce((a, b) => a + b, 0) : 0,
        ...(ops.length > 1 && { operators: [...ops] as Equation['operator'][] }),
        ...(missing >= 0 && { missingIndex: missing }),
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
