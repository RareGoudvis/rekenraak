import type { CardVariant } from '../../../../config/eenvoudig/cards';
import { resolveCard } from '../../../../config/eenvoudig/resolveCard';
import { REGISTRY } from '../../../../config/exerciseRegistry';
import { withKioskSeed } from '../../../../components/oefenen/oefenBuild';
import { kioskFor } from '../../../../services/oefenen/kiosk';
import { formatMathNumber } from '../../../../services/math/formatters';
import { normaliseNumber } from '../../../../services/oefenen/check';
import type { SpelContent } from '../../accepts';
import { mulberry32, numberChoicesOf, seedOf } from '../../distractors';
import type { SpelPack, SpelPackQuestion } from '../pack';
import { TEKST_LEAVES, type NumberAsk, type TekstPlay, type WordAsk } from './tekstLeaves';

// The tekst pack (owner 2026-11-15): Zelf oefenen content that is no + − × : sum but still asks one number or one
// word, written on the sign (afronden, herleidingen, plaatswaarde, vergelijken, deelbaarheid …; tekstLeaves.ts).
// Numbers play in every game, typed or tapped (a comma or a minus: the keypad shows that key, the digit lock sits out);
// a word only in the tap games. The session, the check and Nakijken stay the kiosk's own.

// A variant's settings as its kiosk session gets them (registry defaults, the card, the kiosk's seed).
const settings = new Map<string, Record<string, unknown>>();
function settingsOf(v: CardVariant): Record<string, unknown> | null {
    let c = settings.get(v.id);
    if (!c) {
        try {
            const card = resolveCard(v);
            c = { ...(REGISTRY[card.typeId]?.defaultConstraints(card.typeId) as Record<string, unknown>), ...withKioskSeed(card.typeId, card.constraints) };
        } catch { return null; }
        settings.set(v.id, c);
    }
    return c;
}

const playOf = (v: CardVariant): TekstPlay => {
    const c = settingsOf(v);
    return c ? TEKST_LEAVES[v.leafId]?.playsAs(c) ?? null : null;
};

const keysOf = (leafId: string, c: Record<string, unknown>) => TEKST_LEAVES[leafId]?.keys?.(c) ?? [','];

/** What a tekst variant asks of a game: whole numbers, numbers with a comma or minus (and their keys), or tap-only words. */
export function tekstContentOf(v: CardVariant): SpelContent {
    const c = settingsOf(v) ?? {};
    const leaf = TEKST_LEAVES[v.leafId];
    const chars = leaf?.chars?.(c);
    const play = playOf(v);
    // boards: [] = no board round: their cards show a sum and its answer, not a sentence.
    if (play === 'number') return { kind: 'number', digitsOnly: true, answerChars: chars, boards: [] };
    if (play === 'typed') return { kind: 'number', keys: keysOf(v.leafId, c), answerChars: chars, boards: [] };
    return { kind: 'choice', ...(chars !== undefined && { answerChars: chars }), boards: [] };
}

// The options: count of them, the answer kept, the rest nearest to it in the list's own order (places, units, times).
function trim(options: readonly string[], answer: string, count: number, rng: () => number): string[] {
    const list = [...new Set(options)];
    if (list.length <= count) return list;
    const at = list.indexOf(answer);
    const others = list.map((o, i) => ({ o, d: Math.abs(i - at) + rng() * 0.5 })).filter(x => x.o !== answer).sort((a, b) => a.d - b.d).slice(0, count - 1).map(x => x.o);
    return list.filter(o => o === answer || others.includes(o));
}

function numberQuestion(ask: NumberAsk, play: TekstPlay, rng: () => number, count: number, chars?: number, keys: readonly string[] = []): SpelPackQuestion | null {
    const dp = ask.dp ?? 0;
    const scale = 10 ** dp;
    const units = Math.round(ask.answer * scale);
    // A 'number' variant asks whole numbers ≥ 0, a 'typed' one only what its keys can type: else another draw.
    if (play === 'number' && (dp > 0 || units < 0)) return null;
    if (play === 'typed' && ((dp > 0 && !keys.includes(',')) || (units < 0 && !keys.includes('-')))) return null;
    // A slip finer than the answer's grain (10 dl as 0,1 l) is no option at this many decimals.
    const near = (ask.near ?? []).map(f => f.filter(v => Math.abs(v * scale - Math.round(v * scale)) < 1e-6).map(v => Math.round(v * scale)));
    const step = Math.max(1, Math.round((ask.step ?? 1 / scale) * scale));
    // No option longer than the variant's answers can be (its targets were picked for that length).
    const max = chars === undefined ? Infinity : Math.max(units, 10 ** chars - 1);
    const values = numberChoicesOf(units, rng, count, near, step, Math.round((ask.min ?? 0) * scale), max).map(u => u / scale);
    const plain = (v: number) => (dp ? v.toFixed(dp).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',') : String(v));
    const choices = values.map(plain);
    const answer = plain(ask.answer);
    if (play === 'number') return { kind: 'number', text: ask.text, answer, choices, views: [], kioskAnswers: [], ...rest(ask) };
    const label = (v: number) => ask.show?.(v) ?? formatMathNumber(plain(v).replace(',', '.')).replace('-', '−');
    const tapped = {
        text: ask.text, answer, choices,
        views: values.map(v => ({ text: label(v), label: label(v) })),
        kioskAnswers: values.map(v => ask.kiosk?.(v) ?? plain(v)),
        ...rest(ask),
    };
    // Typed: the values as plain numbers ("1.5", "-3"), as the keypad skins read an answer; the views show "1,5", "−3".
    if (play === 'typed') return { ...tapped, kind: 'number', answer: normaliseNumber(answer)!, choices: choices.map(o => normaliseNumber(o)!) };
    return tapped;
}

function wordQuestion(ask: WordAsk, rng: () => number, count: number): SpelPackQuestion | null {
    const options = trim(ask.options, ask.answer, count, rng);
    if (options.length < 2 || !options.includes(ask.answer)) return null;
    return {
        text: ask.text, answer: ask.answer, choices: options,
        views: options.map(o => ({ text: o, label: ask.labels?.[o] ?? o })),
        kioskAnswers: options.map(o => ask.kiosk?.(o) ?? o),
        ...rest(ask),
    };
}

// The asked kiosk exercise, when it is a part of the made one, and the sign's picture of the question (a rij as tiles).
const rest = (ask: NumberAsk | WordAsk) => ({ ...(ask.exercise !== undefined && { exercise: ask.exercise }), ...(ask.constraints && { constraints: ask.constraints }), ...(ask.visual && { visual: ask.visual }) });

export const TEKST_PACK: SpelPack = {
    leaves: Object.keys(TEKST_LEAVES),
    // Every leerjaar Zelf oefenen offers the content in.
    maxGrade: 6,
    // A choice that mixes these with cards no game plays (an afronden rooster beside the simpel one) plays this part.
    partial: true,
    plays: v => playOf(v) !== null,
    contentOf: tekstContentOf,
    question: (type, made, choiceCount) => {
        const leaf = TEKST_LEAVES[type.leafId];
        const d = kioskFor(type.typeId);
        if (!leaf || !d) return null;
        const play = leaf.playsAs(made.constraints);
        if (!play) return null;
        const rng = mulberry32(seedOf(made.key));
        let ask;
        try { ask = leaf.ask(made.exercise, made.constraints, rng, d); } catch { return null; }
        if (!ask || !ask.text.includes('?')) return null;
        const q = ask.kind === 'number' ? numberQuestion(ask, play, rng, choiceCount, leaf.chars?.(made.constraints), keysOf(type.leafId, made.constraints)) : wordQuestion(ask, rng, choiceCount);
        // A word answer never reaches a keypad game.
        return q && (ask.kind === 'words' || play === 'tap' ? { ...q, kind: 'choice' } : q);
    },
};
