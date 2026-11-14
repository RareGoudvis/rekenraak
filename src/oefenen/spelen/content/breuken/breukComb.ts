import type { BreukBewerkExercise } from '../../../../services/math/types';
import type { OefenType } from '../../../../services/oefenen/types';
import { exerciseKeyOf } from '../../../../services/generateDispatch';
import type { Rng } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import type { PackTarget } from '../../board/board';
import { BREUK_MAX_D } from './breukGeometry';
import { breukText, sameValue, type Breuk } from './breukQuestions';
import { BREUK_TIPS } from './breukHelp';

// Honingraat for Gelijkwaardige breuken (owner 2026-11-14): "Zoek alle breuken die gelijk zijn aan 1/2".
// 3–5 cells equal to the target (2/4, 3/6, 5/10) among near misses (4/9, 3/5, 4/10). Every cell is a
// vereenvoudigen question of the card itself ("Vereenvoudig: 4/9"), so a wrong cell is a logged sum that
// Nakijken asks again. Twaalfden at most, as the pictures: thirds need 4/12 to have three equal ones.

// The targets in board order: halves first, then the thirds.
export const COMB_TARGETS: readonly Breuk[] = [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }];
export const COMB_MATCHES = { min: 3, max: 5 } as const;

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lowest = ({ n, d }: Breuk): Breuk => ({ n: n / gcd(n, d), d: d / gcd(n, d) });

/** One comb around `target`: `size` breuken, 3–5 equal to it (never the target itself), the rest the nearest others. */
export function combBreuken(target: Breuk, size: number, rng: Rng): { breuk: Breuk; match: boolean }[] {
    const all: Breuk[] = [];
    for (let d = 2; d <= BREUK_MAX_D; d++) for (let n = 1; n < d; n++) all.push({ n, d });
    const t = target.n / target.d;
    const equal = shuffle(all.filter(b => sameValue(b, target) && b.d !== target.d), rng);
    const k = Math.min(equal.length, COMB_MATCHES.min + Math.floor(rng() * (COMB_MATCHES.max - COMB_MATCHES.min + 1)));
    // Near misses: the closest in value, a little shuffled so a comb is never the same twice.
    const near = shuffle(all.filter(b => !sameValue(b, target)), rng)
        .map(b => ({ b, score: Math.abs(b.n / b.d - t) + rng() * 0.06 }))
        .sort((x, y) => x.score - y.score)
        .slice(0, Math.max(0, size - k))
        .map(x => x.b);
    return [...equal.slice(0, k).map(breuk => ({ breuk, match: true })), ...near.map(breuk => ({ breuk, match: false }))];
}

/** A comb cell as a question of the vereenvoudigen card: "Vereenvoudig: 4/9 = ?" (4/9 when it does not simplify); its help shows it beside the target. */
export function combQuestion(type: OefenType, sample: SpelQuestion, b: Breuk, target: Breuk): SpelQuestion {
    const answer = lowest(b);
    const exercise: BreukBewerkExercise = { id: `comb-${b.n}-${b.d}`, subType: 'vereenvoudigen', inputs: [b], answers: [answer], isManuallyEdited: false };
    const text = breukText(b), right = breukText(answer);
    return {
        slot: sample.slot, exercise, constraints: sample.constraints, key: exerciseKeyOf(type.typeId, exercise), kind: 'choice',
        text: `Vereenvoudig: ${text} = ?`, answer: right, choices: [right],
        views: [{ text: right, label: right }], kioskAnswers: [right],
        help: { tip: BREUK_TIPS.gelijkwaardig, visual: { kind: 'breuk', n: b.n, d: b.d, shape: 'pizza', with: target } },
        pair: { sum: { text, label: text }, answer: { text: right, label: right } },
        same: right,
    };
}

/** The pack's Honingraat board `index` (content/pack.ts targetBoard). */
export function breukComb(type: OefenType, sample: SpelQuestion, size: number, index: number, rng: Rng): { cells: { question: SpelQuestion; match: boolean }[]; target: PackTarget } {
    const target = COMB_TARGETS[index % COMB_TARGETS.length];
    const t = breukText(target);
    return {
        cells: combBreuken(target, size, rng).map(c => ({ question: combQuestion(type, sample, c.breuk, target), match: c.match })),
        target: { kind: 'pack', lead: 'Zoek alle breuken die gelijk zijn aan', n: t, claim: `gelijk aan ${t}` },
    };
}
