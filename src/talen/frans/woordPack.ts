import type { SpelPack } from '../../oefenen/spelen/content/pack';
import type { SpelContent } from '../../oefenen/spelen/accepts';
import { mulberry32, seedOf } from '../../oefenen/spelen/distractors';
import { woordLeaves } from './woordCards';
import { answersAreNumbers, listsOf, wordChoiceChars, type WordExercise, type WordSettings } from './woorden';

// The Frans word lists in the games: "mercredi = ?" on the sign, the exercise's own words on the targets, and a memory
// pair "woensdag" with "mercredi". The narrow games take a card only when its longest answer word fits (wordChars).
// Frans → cijfer answers a number: every game takes it, typed on a keypad or tapped.

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function contentOf(s: WordSettings): SpelContent {
    if (answersAreNumbers(s)) {
        const chars = Math.max(...listsOf(s.lists).flatMap(l => l.pairs.map(p => p.nl.length)));
        return { kind: 'number', digitsOnly: true, answerChars: chars, boards: ['pairs'] };
    }
    return { kind: 'choice', boards: ['pairs'], wordChars: wordChoiceChars(s) };
}

export const WOORD_PACK: SpelPack = {
    leaves: woordLeaves,
    maxGrade: 6,
    contentOf: v => contentOf(v.ov as unknown as WordSettings),
    boardsOf: () => ['pairs'],
    question: (_type, made, choiceCount) => {
        const ex = made.exercise as WordExercise;
        if (!ex?.choices?.includes(ex.answer)) return null;
        const rng = mulberry32(seedOf(made.key));
        const others = shuffle(ex.choices.filter(c => c !== ex.answer), rng).slice(0, Math.max(1, choiceCount - 1));
        const choices = shuffle([ex.answer, ...others], rng);
        const number = answersAreNumbers(made.constraints as unknown as WordSettings);
        return {
            text: `${ex.shown} = ?`,
            answer: ex.answer,
            choices,
            // A number is shown and checked as typed (no views), as the tekst pack's numbers.
            views: number ? [] : choices.map(c => ({ text: c, label: c })),
            kioskAnswers: number ? [] : choices,
            ...(number && { kind: 'number' as const }),
            pair: { sum: { text: ex.shown, label: ex.shown }, answer: { text: ex.answer, label: ex.answer } },
            // One word asked both ways (mercredi → woensdag, woensdag → mercredi) never shares a memory board.
            same: `${ex.list}:${ex.index}`,
        };
    },
};
