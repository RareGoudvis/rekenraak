import type { ComponentType, LazyExoticComponent } from 'react';
import type { SpelEvents } from '../events';
import type { SoundCue, SkinSounds } from '../sound';
import type { SpelOutcome } from '../events';
import type { SpelFrom } from '../useSpelStore';
import type { SpelChoiceView, SpelVisual } from '../content/pack';

// The skin contract. A skin is presentation only: the session decides what is asked, checks the
// answer, keeps score and runs the clock; the skin draws the question and hands back a given answer.

// What a game answer looks like: a number (typed or tapped), one of the exercise's own choices
// (< = >, a clock), or a pair (quotient + rest). Content and skins both say which they have / take.
export type AnswerKind = 'number' | 'choice' | 'pair';

// The content a skin can play; the picker hides every skin that does not take the chosen content.
export interface SkinAccepts {
    kinds: readonly AnswerKind[];
    // The longest answer the skin's targets can show (an egg, a mole); absent = any length.
    maxAnswerChars?: number;
    // The skin works digit by digit (a code lock): only content whose answers are plain digits.
    digits?: boolean;
    // The skin draws picture questions and picture / phrase choices (SpelSign, SpelChoiceFace): content packs like the klok.
    pictures?: boolean;
}

export interface SkinMeta {
    id: string;
    // The tile's name in the game picker ("Ballonnen").
    label: string;
    // choice = the session hands the skin four options (choices); keypad = the skin shows <SpelKeypad>.
    input: 'choice' | 'keypad';
    // Timed skins get a clock icon in the picker and progress.msLeft.
    timed: boolean;
    // The round: a number of questions, or seconds (timed skins). goal = a climb (Pinguïntoren): a right
    // answer adds one, a mistake takes one off (never below 0); the round ends at goal, questions is then the cap.
    // cap = a limit the pupil never sees (Race ends at its finish): the bar counts without a total.
    // goalKeep: a mistake never takes one off the climb (Bom: a wrong answer only costs time).
    round: { questions?: number; seconds?: number; goal?: number; cap?: number; goalKeep?: boolean };
    // Its sounds per cue (sound.ts): session cues and the skin's own (props.sound); absent = the defaults.
    sounds?: SkinSounds;
    // A pre-start screen with these choices (big buttons, a default preselected); absent = no screen.
    options?: SkinOption[];
    // What was picked on that screen (the round already carries their patches); set by the picker.
    chosen?: SkinChoices;
    // Owner-approved early end (Bever, Zombies): the skin may call onFail; every other skin never ends early.
    canFail?: boolean;
    // The end screen's title when the round was won ("Ontmanteld!").
    winTitle?: string;
    // 2 = a game for two pupils on one screen (Touwtrekken): the picker says "2 spelers".
    players?: 2;
    // Which content the skin can play (accepts.ts).
    accepts: SkinAccepts;
    // input 'choice': how many options the session hands over (the answer included); absent = 4.
    choiceCount?: number;
    // A seasonal game: also shown on the picker's "Nu extra leuk" shelf in its season (seasons.ts).
    season?: Season;
}

export type Season = 'sinterklaas' | 'kerst' | 'valentijn' | 'pasen' | 'lente';

// What a skin hands back when its own finish ends the round (Race), for the end screen.
export interface SkinResult {
    title: string;
    lead: string;
    detail?: string;
    // Shown as a two-tap "Wis mijn scores" on the end screen.
    wipe?: () => void;
}

export interface SkinOptionChoice {
    value: string;
    // The button text ("3 minuten").
    label: string;
    // Merged into meta.round when picked.
    round?: Partial<SkinMeta['round']>;
}

export interface SkinOption {
    id: string;
    // The group's question ("Hoe lang?").
    label: string;
    choices: SkinOptionChoice[];
    default: string;
}

// Option id → picked value ({ tijd: '3', doel: '20' }).
export type SkinChoices = Record<string, string>;

// The game phase a skin sees: play = waiting for an answer; right / wrong = the short flash after one;
// help = paused under "Hoe los ik dit op?" (no input).
export type SkinPhase = 'play' | 'right' | 'wrong' | 'help';

export interface SkinQuestion {
    // Changes per question: remount or restart animations on it.
    key: string;
    // "7 + 5 = ?"
    text: string;
    // 0-based question number in the round.
    index: number;
    // A content pack's picture for the sign (the clock face): draw it with <SpelSign>.
    visual?: SpelVisual;
}

export interface SkinProgress {
    answered: number;
    // Questions in the round, null for a timed round.
    total: number | null;
    score: number;
    streak: number;
    bestStreak: number;
    // Timed rounds: what is left (frozen while paused); null when untimed.
    msLeft: number | null;
    // Goal rounds (round.goal): how high the climb is now; null otherwise.
    goal: { count: number; target: number } | null;
    // Right answers, met hulp included (a stick on the dam).
    right: number;
    // Counted mistakes (the end screen's Foutjes), and the skin's own deadlines among all answers (onMiss).
    mistakes: number;
    misses: number;
    // Timed rounds: the round's length; null when untimed.
    msTotal: number | null;
}

export interface SkinProps {
    question: SkinQuestion | null;
    // input 'choice' only: the answer and three distractors, in display order (plain digits, "12").
    choices: string[] | null;
    // Content packs: how each choice looks (same order as choices); null = plain numbers. Draw with <SpelChoiceFace>.
    views?: SpelChoiceView[] | null;
    phase: SkinPhase;
    // Set during right / wrong: what was given and the right answer (a wrong flash shows it).
    feedback: { given: string; expected: string; correct: boolean } | null;
    // The pupil's answer (a choice or the keypad's number); ignored outside 'play'.
    onAnswer(given: string): void;
    // Opens "Hoe los ik dit op?" (the shell also has the button; a skin may add its own).
    onHelp(): void;
    // The skin's own deadline for this question ran out (a zombie at the door): a mistake without an answer.
    onMiss(): void;
    // meta.canFail skins only: the friendly early end (the dam broke, everyone was caught).
    onFail(): void;
    // The skin's own sound cues (a barricade breaks); the registry entry maps them to sounds.
    sound(cue: SoundCue): void;
    progress: SkinProgress;
    // What was picked on the pre-start screen (empty without one).
    options: SkinChoices;
    // correct / wrong / help / streak / timeUp / end, for effects.
    events: SpelEvents;
    // prefers-reduced-motion: skip rising, floating and bursts.
    reducedMotion: boolean;
    // Stable per card + game: the key for a skin's own records on this device (Race's best time).
    runKey?: string;
    // The skin's own goal ended the round (Race: the finish line).
    onFinish?(result: SkinResult): void;
}

// A game that brings its own session and screen (Touwtrekken: two players, two question streams).
export interface SkinScreenProps {
    meta: SkinMeta;
    from: SpelFrom;
    // Back to the game tiles of this choice.
    onExit(): void;
}

// The end screen's picture for a skin (the bomb with a smiley, the PUF! cloud, the beaver on its log).
export interface SkinEndingProps {
    outcome: SpelOutcome;
    progress: SkinProgress;
    options: SkinChoices;
    reducedMotion: boolean;
}

export interface SkinEntry {
    meta: SkinMeta;
    // Absent = "binnenkort" in the picker. Lazy: each skin is its own chunk.
    Component?: LazyExoticComponent<ComponentType<SkinProps>>;
    // Instead of Component: the whole game screen, shell included.
    Screen?: LazyExoticComponent<ComponentType<SkinScreenProps>>;
    // Optional picture above the end screen's numbers (same chunk as the skin).
    Ending?: LazyExoticComponent<ComponentType<SkinEndingProps>>;
}
