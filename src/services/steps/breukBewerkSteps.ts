import type { StepLine, StepToken } from '../math/workedSteps';
import type { BreukBewerkExercise, Equation, Fraction } from '../math/types';

// Breuken vereenvoudigen and gelijknamig maken the way the owner teaches them: write the lists out
// (delers of teller and noemer, veelvouden of each noemer), mark what both lists share, then rewrite.
// Breuken bewerken asks them as questions (prose in the UI font, the answer in the math face); breuken
// optellen / aftrekken shows the same steps as plain lines. A line's `mark` tells the BreukLijsten visual what it reveals.

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const num = (v: number): StepToken => ({ t: 'num', v });
const word = (w: string): StepToken => ({ t: 'word', w });
const frac = (n: number, d: number): StepToken => ({ t: 'frac', n, d });
const eq: StepToken = { t: 'eq' };
// A whole result reads as the number itself (6/3 = 2), like the answer key.
const breuk = (n: number, d: number): StepToken => (n % d === 0 ? num(n / d) : frac(n, d));
const list = (vs: number[]): StepToken[] => vs.flatMap((v, i) => (i ? [{ t: 'sep' } as StepToken, num(v)] : [num(v)]));

// One step both ways: as a question (`answer` revealed under it, `statement` = the key's compact form) or as a plain line.
interface Step { kind: string; question: string; hint: string; answer: StepToken[]; statement: StepToken[]; mark: string }
const asQuestion = (s: Step): StepLine => ({ kind: `breuk.${s.kind}`, basis: true, aside: true, question: s.question, hint: s.hint, tokens: s.answer, compact: s.statement, mark: s.mark });
// As plain lines (breuken optellen / aftrekken) the lists are the optional Alle lines: the answer key prints
// steps unwrapped beside the sum, where a long veelvouden row would run past its column.
const asLine = (s: Step): StepLine => ({ kind: `breuk.${s.kind}`, basis: s.kind === 'schrijf', aside: true, tokens: s.statement, mark: s.mark });
const closing = (tokens: StepToken[]): StepLine => ({ kind: 'breuk.klaar', basis: true, aside: true, tokens, mark: 'klaar' });

// Delers lists stay readable up to this teller / noemer; veelvouden lists up to this many entries.
const MAX_DELERS_OF = 1000;
const MAX_VEELVOUDEN = 25;

export const delersOf = (x: number): number[] => Array.from({ length: x }, (_, i) => i + 1).filter(d => x % d === 0);
export const veelvoudenTot = (d: number, upto: number): number[] => Array.from({ length: Math.floor(upto / d) }, (_, i) => d * (i + 1));

const plain = (f: Fraction | undefined): f is Fraction =>
    !!f && !f.whole && [f.n, f.d].every(v => Number.isInteger(v) && v >= 1 && v <= MAX_DELERS_OF);

const delersStep = (x: number, mark: string): Step => ({
    kind: 'delers', mark, question: `Wat zijn de delers van ${x}?`, hint: `Welke getallen passen precies in ${x}?`,
    answer: list(delersOf(x)), statement: [word('Delers van '), num(x), word(': '), ...list(delersOf(x))],
});

// 12/18: delers of 12, delers of 18, the grootste gemeenschappelijke deler, both divided by it, = 2/3.
export function vereenvoudigSteps(f: Fraction): StepLine[] | null {
    if (!plain(f) || f.d < 2) return null;
    const { n, d } = f;
    const g = gcd(n, d);
    const steps: Step[] = [delersStep(n, 'teller'), delersStep(d, 'noemer')];
    if (g === 1) {
        steps.push({ kind: 'ggd', mark: 'ggd', question: 'Welke delers staan in beide rijen?', hint: 'Zoek de getallen die in beide rijen staan.', answer: [num(1)], statement: [word('Alleen 1 staat in beide rijen.')] });
        return [...steps.map(asQuestion), closing([frac(n, d), word(' kan je niet vereenvoudigen')])];
    }
    const deel: StepToken[] = [num(n), { t: 'op', op: ':' }, num(g), eq, num(n / g), { t: 'and' }, num(d), { t: 'op', op: ':' }, num(g), eq, num(d / g)];
    steps.push(
        { kind: 'ggd', mark: 'ggd', question: 'Wat is de grootste deler die in beide rijen staat?', hint: 'Zoek de getallen die in beide rijen staan. Neem de grootste.', answer: [num(g)], statement: [word('De grootste deler in beide rijen is '), num(g)] },
        { kind: 'deel', mark: 'deel', question: `Deel de teller en de noemer door ${g}.`, hint: 'Reken beide delingen uit.', answer: deel, statement: deel },
    );
    return [...steps.map(asQuestion), closing([frac(n, d), eq, breuk(n / g, d / g)])];
}

// The veelvouden of both noemers up to the common noemer L, L marked, both breuken rewritten to /L.
// Null when a list would be too long to read.
function gelijknamigSteps(a: Fraction, b: Fraction, L: number, kgv: boolean): Step[] | null {
    if (a.d === b.d || L % a.d !== 0 || L % b.d !== 0 || L / Math.min(a.d, b.d) > MAX_VEELVOUDEN) return null;
    const rij = (d: number, mark: string): Step => ({
        kind: 'veelvouden', mark, question: `Wat zijn de veelvouden van ${d}?`, hint: `Tel telkens ${d} erbij, tot ${L}.`,
        answer: list(veelvoudenTot(d, L)), statement: [word('Veelvouden van '), num(d), word(': '), ...list(veelvoudenTot(d, L))],
    });
    const rewrite = (f: Fraction, which: string, mark: string): Step => {
        const k = L / f.d;
        const tokens = [frac(f.n, f.d), eq, frac(f.n * k, L)];
        return {
            kind: 'schrijf', mark, question: `Hoe schrijf je de ${which} breuk met noemer ${L}?`,
            hint: k === 1 ? `Die breuk heeft al noemer ${L}.` : `${f.d} × ${k} = ${L}, dus ook de teller × ${k}.`,
            answer: tokens, statement: tokens,
        };
    };
    return [
        rij(a.d, 'rij0'),
        rij(b.d, 'rij1'),
        {
            kind: 'noemer', mark: 'noemer', question: 'Wat wordt de nieuwe noemer?',
            hint: kgv ? 'Zoek het kleinste getal dat in beide rijen staat.' : `De opdracht vraagt noemer ${L}. Die staat in beide rijen.`,
            answer: [num(L)], statement: [word('Nieuwe noemer: '), num(L)],
        },
        rewrite(a, 'eerste', 'schrijf0'),
        rewrite(b, 'tweede', 'schrijf1'),
    ];
}

const kgvOf = (x: number, y: number) => (x * y) / gcd(x, y);

export function breukBewerkSteps(ex: BreukBewerkExercise | undefined): StepLine[] | null {
    if (!ex) return null;
    if (ex.subType === 'vereenvoudigen') return ex.inputs?.length === 1 ? vereenvoudigSteps(ex.inputs[0]) : null;
    if (ex.subType !== 'gelijknamig' || ex.inputs?.length !== 2) return null;
    // The common noemer is the one the sheet asks for: the kgv, or the teacher's own noemer.
    const [a, b] = ex.inputs;
    const L = ex.answers?.[0]?.d;
    if (!plain(a) || !plain(b) || !Number.isInteger(L) || !L) return null;
    const steps = gelijknamigSteps(a, b, L, L === kgvOf(a.d, b.d));
    return steps && [...steps.map(asQuestion), closing([frac(a.n * (L / a.d), L), word(' en '), frac(b.n * (L / b.d), L)])];
}

const isFraction = (v: unknown): v is Fraction => typeof v === 'object' && v !== null && 'n' in v && 'd' in v;

// Breuken optellen / aftrekken (hoofdrekenen with breuken): gelijknamig via the kgv when the noemers
// differ, the tellers added or subtracted, then vereenvoudigd. Two plain breuken, the result asked.
export function breukSomSteps(eq: Equation | undefined): StepLine[] | null {
    if (!eq || (eq.operator !== '+' && eq.operator !== '-') || eq.operands?.length !== 2) return null;
    if (eq.operators && eq.operators.some(o => o !== eq.operator)) return null;
    if (eq.missingIndex !== undefined || (eq.missingTerm && eq.missingTerm !== 'result')) return null;
    const [a, b] = eq.operands;
    if (!isFraction(a) || !isFraction(b) || !plain(a) || !plain(b)) return null;
    const op = eq.operator;
    const L = kgvOf(a.d, b.d);
    const lines: StepLine[] = [];
    if (a.d !== b.d) {
        const steps = gelijknamigSteps(a, b, L, true);
        if (!steps) return null;
        lines.push(...steps.map(asLine));
    }
    const n1 = a.n * (L / a.d), n2 = b.n * (L / b.d);
    const t = op === '+' ? n1 + n2 : n1 - n2;
    if (t < 0) return null;
    const g = gcd(t, L);
    // Already gelijknamig: the sum itself is the first line, so it is not repeated.
    if (a.d !== b.d) lines.push({ kind: 'breuk.som', basis: true, tokens: [frac(n1, L), { t: 'op', op }, frac(n2, L)], mark: 'som' });
    lines.push({ kind: 'breuk.teller', basis: true, tokens: [t === 0 ? num(0) : frac(t, L)], mark: 'teller' });
    if (t > 0 && g > 1) lines.push({ kind: 'breuk.vereenvoudig', basis: true, tokens: [breuk(t / g, L / g)], mark: 'klaar' });
    // One line would only be the answer: nothing to explain.
    return lines.length > 1 ? lines : null;
}
