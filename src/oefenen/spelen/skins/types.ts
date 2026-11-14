import type { ComponentType, LazyExoticComponent } from 'react';
import type { SpelEvents } from '../events';
import type { SkinSounds } from '../sound';
import type { SpelFrom } from '../useSpelStore';

// The skin contract. A skin is presentation only: the session decides what is asked, checks the
// answer, keeps score and runs the clock; the skin draws the question and hands back a given answer.

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
    round: { questions?: number; seconds?: number; goal?: number; cap?: number };
    // Its sounds for a right answer, a wrong one and its own deadline (sound.ts); absent = the defaults.
    sounds?: SkinSounds;
    // 2 = a game for two pupils on one screen (Touwtrekken): the picker says "2 spelers".
    players?: 2;
}

// What a skin hands back when its own finish ends the round (Race), for the end screen.
export interface SkinResult {
    title: string;
    lead: string;
    detail?: string;
    // Shown as a two-tap "Wis mijn scores" on the end screen.
    wipe?: () => void;
}

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
}

export interface SkinProps {
    question: SkinQuestion | null;
    // input 'choice' only: the answer and three distractors, in display order (plain digits, "12").
    choices: string[] | null;
    phase: SkinPhase;
    // Set during right / wrong: what was given and the right answer (a wrong flash shows it).
    feedback: { given: string; expected: string; correct: boolean } | null;
    // The pupil's answer (a choice or the keypad's number); ignored outside 'play'.
    onAnswer(given: string): void;
    // Opens "Hoe los ik dit op?" (the shell also has the button; a skin may add its own).
    onHelp(): void;
    // The skin's own deadline for this question ran out (a zombie at the door): a mistake without an answer.
    onMiss(): void;
    progress: SkinProgress;
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

export interface SkinEntry {
    meta: SkinMeta;
    // Absent = "binnenkort" in the picker. Lazy: each skin is its own chunk.
    Component?: LazyExoticComponent<ComponentType<SkinProps>>;
    // Instead of Component: the whole game screen, shell included.
    Screen?: LazyExoticComponent<ComponentType<SkinScreenProps>>;
}
