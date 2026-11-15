import type { KioskAnswer, OefenType } from '../../../services/oefenen/types';
import type { OefenExercise } from '../../../services/oefenen/scheduler';
import type { CardVariant } from '../../../config/eenvoudig/cards';
import type { BreukKind } from './breuken/breukGeometry';
import type { SpelQuestion } from '../spelQuestion';
import type { PackTarget } from '../board/board';
import type { AnswerKind } from '../skins/types';
import type { SpelContent } from '../accepts';

// Content packs: non-number game content (the klok, the breuken). A pack turns a made kiosk exercise
// into a 'choice' question with pictures; the session, Nakijken and the kiosk check stay the kiosk's own.

// A picture a skin draws through <SpelVisual> (SpelVisual.tsx switches on kind). A new kind = one member
// here and one case there.
export type SpelVisual =
    // An analoge klok at h:mm; mark = the grote wijzer and the cijfer it points at stand out (the help).
    | { kind: 'klok'; h: number; m: number; mark?: boolean }
    // A digitale klok display ("08:15").
    | { kind: 'digitaal'; text: string }
    // A breuk as a picture (BreukPicture): n of d equal parts coloured; with = a second one beside it (the vergelijken help).
    | { kind: 'breuk'; n: number; d: number; shape: BreukKind; with?: { n: number; d: number } }
    // A getallenrij or patroon as number tiles, '?' = the tile to fill (the sign's whole question; spelFormat rijFoldOf).
    | { kind: 'rij'; items: string[] };

// How one choice is shown: a picture, or a phrase / time as text. label = its accessible name.
export interface SpelChoiceView {
    text?: string;
    visual?: SpelVisual;
    label: string;
}

// "Hoe los ik dit op?" for a pack question: a short tip and a picture; the kiosk's worked steps still follow.
export interface SpelHelp {
    tip: string;
    visual?: SpelVisual;
}

// What a pack adds to the question (spelQuestion.ts fills in slot, exercise, constraints, key).
export interface SpelPackQuestion {
    // The sign's line ("Hoe laat is het?", "kwart over 3 = ?").
    text: string;
    // The sign's picture (the clock face the question is about).
    visual?: SpelVisual;
    // The right choice's value: one of choices.
    answer: string;
    // Unique values, the answer included, in display order; what a skin hands back through onAnswer.
    choices: string[];
    // Per choice (same order): how it looks, and what the kiosk check gets for it; both empty for a tekst number (shown and checked as typed).
    views: SpelChoiceView[];
    kioskAnswers: KioskAnswer[];
    help?: SpelHelp;
    // The kiosk exercise behind the question when the game asks a part of the made one (breuken vergelijken:
    // two of its breuken); the session checks it and Nakijken replays it. Absent = the made exercise.
    exercise?: unknown;
    // The kiosk settings that go with that exercise (the tekst pack asks an afronden rooster as one simpel number). Absent = the made ones.
    constraints?: Record<string, unknown>;
    // 'number' = a whole number every game can take (typed or tapped); absent = 'choice' (tap games only).
    kind?: AnswerKind;
    // Memory boards (Hartjes): the two cards of this question, when they are not "sum" and its answer text.
    pair?: { sum: SpelChoiceView; answer: SpelChoiceView };
    // Questions with the same `same` count as one answer on a board ("2/4" and "1/2"): never two on one memory board.
    same?: string;
}

// The board rounds a pack's card can fill: memory pairs (Hartjes), a target to find (Honingraat).
export type SpelPackBoard = 'pairs' | 'target';

export interface SpelPack {
    // The sidebar leaves it plays (the picker's choiceCanPlay); leerjaar is checked by the caller.
    leaves: readonly string[];
    // The question for a made exercise, or null when this exercise has no game form (the session draws again).
    question(type: OefenType, made: OefenExercise, choiceCount: number): SpelPackQuestion | null;
    // A card variant of one of the leaves that still has no game form (the card's settings); absent = every variant plays.
    plays?(v: CardVariant): boolean;
    // The highest leerjaar it plays at; absent = PACK_MAX_GRADE (spelQuestion.ts).
    maxGrade?: number;
    // What a variant asks of a game when it is not pictures (the tekst pack: numbers or words on the sign); absent = pictures.
    contentOf?(v: CardVariant): SpelContent;
    // A choice that mixes this pack's cards with cards no game plays (breuken kleuren beside herkennen) plays this pack's part.
    partial?: boolean;
    // The board rounds a variant fills; absent = none (a board skin never gets it).
    boardsOf?(v: CardVariant): readonly SpelPackBoard[];
    // Its own target board (Honingraat), built around one drawn question of the card (its slot and settings):
    // the cells as questions of that card, the ones to find marked. Absent = the number boards.
    targetBoard?(type: OefenType, sample: SpelQuestion, size: number, index: number, rng: () => number): { cells: { question: SpelQuestion; match: boolean }[]; target: PackTarget } | null;
}
