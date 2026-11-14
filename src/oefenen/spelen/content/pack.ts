import type { KioskAnswer, OefenType } from '../../../services/oefenen/types';
import type { OefenExercise } from '../../../services/oefenen/scheduler';

// Content packs: non-number game content (the klok now, breuken next). A pack turns a made kiosk exercise
// into a 'choice' question with pictures; the session, Nakijken and the kiosk check stay the kiosk's own.

// A picture a skin draws through <SpelVisual> (SpelVisual.tsx switches on kind). A new kind = one member
// here and one case there (breuken: { kind: 'breuk', … }).
export type SpelVisual =
    // An analoge klok at h:mm; mark = the grote wijzer and the cijfer it points at stand out (the help).
    | { kind: 'klok'; h: number; m: number; mark?: boolean }
    // A digitale klok display ("08:15").
    | { kind: 'digitaal'; text: string };

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
    // Per choice (same order): how it looks, and what the kiosk check gets for it.
    views: SpelChoiceView[];
    kioskAnswers: KioskAnswer[];
    help?: SpelHelp;
}

export interface SpelPack {
    // The sidebar leaves it plays (the picker's choiceCanPlay); leerjaar is checked by the caller.
    leaves: readonly string[];
    // The question for a made exercise, or null when this exercise has no game form (the session draws again).
    question(type: OefenType, made: OefenExercise, choiceCount: number): SpelPackQuestion | null;
}
