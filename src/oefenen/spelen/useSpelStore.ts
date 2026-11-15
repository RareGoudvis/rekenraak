import { create } from 'zustand';
import type { Leerjaar } from '../../config/gradePresets';
import { fnv1a } from '../../services/oefenen/session';
import { madePerSlot, nextExercise, nextType } from '../../services/oefenen/scheduler';
import { checkAnswer } from '../../services/oefenen/check';
import { kioskFor } from '../../services/oefenen/kiosk';
import type { OefenHistoryEntry, OefenSessie } from '../../services/oefenen/types';
import type { HandigStrategy, StepLine } from '../../services/math/workedSteps';
import { handigFor, stepsFor } from '../../services/stepsAvailability';
import { buildZelfSessie, type ZelfChoice } from '../zelf/zelfSessie';
import { useOefenStore } from '../useOefenStore';
import { createSpelEvents, type SpelEvents, type SpelOutcome } from './events';
import { reviewOf } from './review';
import { kioskAnswerOf, spelChoiceOf, spelQuestionOf, type SpelQuestion } from './spelQuestion';
import type { SkinMeta, SkinProgress, SkinResult } from './skins/types';
import { boardOpenHelp, boardPickIn, nextBoardOf, type SpelBoard } from './board/session';
import { penalise } from './skins/bom/penalty';

// The Spelen session: a round of one Zelf oefenen choice behind a game skin. Runtime only: never in a
// link, a session hash or the device stats. One try per question, no steps during play, no lives
// (only a meta.canFail skin may end a round early, through fail()).

export type SpelPhase = 'idle' | 'play' | 'right' | 'wrong' | 'help' | 'end';

// right = the pop, wrong = long enough to read the right answer; then the next question comes by itself.
export const SPEL_FLASH_MS = { right: 700, wrong: 1600 } as const;
// A cleared board (board rounds) stays this long before the next one.
export const SPEL_BOARD_PAUSE_MS = 1600;
// Draws until a plain + / − sum turns up (every playable leaf yields one; this only bounds a bad card).
const MAX_DRAWS = 12;

export interface SpelMistake { question: SpelQuestion; given: string }

// Where the picker reopens after a game (Ander spel, Terug): the same choice, on the game tiles.
export interface SpelFrom { choice: ZelfChoice; grade: Leerjaar; topicId: string }

export interface SpelStart extends SpelFrom { meta: SkinMeta; now?: number }

interface SpelState {
    phase: SpelPhase;
    meta: SkinMeta | null;
    from: SpelFrom | null;
    sessie: OefenSessie | null;
    question: SpelQuestion | null;
    feedback: { given: string; expected: string; correct: boolean } | null;
    history: OefenHistoryEntry[];
    score: number;
    streak: number;
    bestStreak: number;
    // Questions on which "Hoe los ik dit op?" was opened: counted as met hulp, not as juist or fout.
    helped: number;
    helpedNow: boolean;
    // Goal rounds (meta.round.goal): the climb, +1 per right answer (met hulp too), −1 per mistake, never below 0.
    climb: number;
    mistakes: SpelMistake[];
    // Answers that were the skin's own deadline (onMiss), met hulp or not: a zombie got through.
    misses: number;
    // Set when the round ends.
    outcome: SpelOutcome | null;
    // The steps for the question on screen while paused; null lines = this sum has none.
    help: { lines: StepLine[] | null; handig: HandigStrategy[] } | null;
    // Timed rounds: the deadline, and what was left when the round paused.
    endsAt: number | null;
    pausedLeft: number | null;
    shownAt: number;
    // Set by leave / otherGame: the picker opens on the game tiles of this choice.
    pickerAt: SpelFrom | null;
    // Set when the skin's own finish ended the round (Race), or the end lines a skin reported (Voetbal).
    result: SkinResult | null;
    // A skin's own pause (Voetbal's half time): the clock stands still as under help; the skin holds its input.
    held: boolean;
    // Board rounds (meta.round.board): the sums on screen; question = the one picked last (for the help).
    board: SpelBoard | null;
    events: SpelEvents;

    start(o: SpelStart): void;
    next(now?: number): void;
    answer(given: string, now?: number): void;
    // The skin's deadline for this question ran out (a zombie at the door): a mistake with no answer.
    miss(now?: number): void;
    // A canFail skin's friendly early end (the dam broke): the round ends now, as 'failed'.
    fail(now?: number): void;
    openHelp(now?: number): void;
    closeHelp(now?: number): void;
    tick(now?: number): void;
    // The skin's own goal was reached (Race's finish line): the round ends with its result.
    finish(result: SkinResult): void;
    // The skin's end lines for when the round ends (Voetbal: the goals); the round goes on.
    report(result: SkinResult): void;
    // The skin's own pause on (true) or off: the clock stops, the round and its answers wait on the skin.
    hold(on: boolean, now?: number): void;
    restart(): void;
    // Back to the picker on this choice's game tiles (Ander spel, Terug mid-round).
    otherGame(): void;
    // Nakijken: the mistakes as a review round in the Oefenen kiosk.
    nakijken(): void;
    takePickerAt(): SpelFrom | null;
    // Board rounds: a pick on one sum (the session checks it), and the sum the pupil looked at.
    boardPick(cell: number, given: string, strike?: boolean, now?: number): void;
    boardFocus(cell: number): void;
}

/** What the skins read as progress. */
export function progressOf(st: Pick<SpelState, 'meta' | 'history' | 'sessie' | 'score' | 'streak' | 'bestStreak' | 'climb' | 'endsAt' | 'pausedLeft' | 'mistakes' | 'misses'> & Partial<Pick<SpelState, 'board'>>, now = Date.now()): SkinProgress {
    const target = st.meta?.round.goal;
    const seconds = st.meta?.round.seconds;
    return {
        goal: target ? { count: st.climb, target } : null,
        answered: st.history.length, total: st.sessie?.total ?? null, score: st.score, streak: st.streak, bestStreak: st.bestStreak,
        msLeft: st.pausedLeft ?? (st.endsAt !== null ? Math.max(0, st.endsAt - now) : null),
        right: st.history.filter(h => h.correct).length, mistakes: st.mistakes.length, misses: st.misses,
        msTotal: seconds ? seconds * 1000 : null,
        board: st.meta?.round.board ? { index: st.board?.index ?? 0, total: st.meta.round.board.boards } : null,
    };
}

/** How a round ended (see SpelOutcome). */
export function outcomeOf(st: Pick<SpelState, 'meta' | 'climb'>, failed: boolean): SpelOutcome {
    if (failed) return 'failed';
    const goal = st.meta?.round.goal;
    if (goal) return st.climb >= goal ? 'won' : st.meta?.timed ? 'lost' : 'done';
    return st.meta?.canFail ? 'won' : 'done';
}

/** The game's session: the choice's Zelf oefenen types unchanged (a game never changes what is asked), its round from the skin. */
export const spelSessieOf = (o: SpelStart): OefenSessie => {
    const { questions, seconds, cap, board } = o.meta.round;
    // The part of the choice a game plays (spelVarsOf): a board round only the cards that fill that board.
    const played = spelChoiceOf(o.choice, o.grade, board?.kind);
    const base = buildZelfSessie(played.vars.length ? played : o.choice, { kind: 'count', n: 10 }, o.now ?? Date.now(), o.grade);
    // A board round counts what it asked (a honeycomb's sums to find vary).
    const s: OefenSessie = { ...base, id: `zelf-${fnv1a(`spel|${o.choice.key}|${o.meta.id}`)}`, total: seconds || cap || board ? undefined : questions ?? 20 };
    delete s.timerMin;
    return s;
};

const IDLE = {
    phase: 'idle' as SpelPhase, meta: null, from: null, sessie: null, question: null, feedback: null, history: [], score: 0, streak: 0, bestStreak: 0,
    helped: 0, helpedNow: false, climb: 0, mistakes: [], misses: 0, outcome: null as SpelOutcome | null, help: null, endsAt: null, pausedLeft: null, shownAt: 0, result: null,
    held: false, board: null as SpelBoard | null,
};

export const useSpelStore = create<SpelState>()((set, get) => {
    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    const clearFlash = () => { if (flashTimer !== null) clearTimeout(flashTimer); flashTimer = null; };

    const end = (failed = false) => {
        clearFlash();
        const { score, bestStreak, mistakes, helped, events } = get();
        const outcome = outcomeOf(get(), failed);
        set({ phase: 'end', feedback: null, help: null, outcome });
        events.emit('end', { score, bestStreak, mistakes: mistakes.length, helped, outcome });
    };

    const timeUp = (now: number) => {
        const { endsAt, pausedLeft } = get();
        return pausedLeft === null && endsAt !== null && now >= endsAt;
    };

    // One answer (or a miss) on the question on screen: log it, score it, flash, then the next question by itself.
    const settle = (given: string, correct: boolean, now: number, missed = false) => {
        const st = get();
        const { sessie: s, question: q, events } = st;
        if (!s || !q) return;
        if (timeUp(now)) { events.emit('timeUp', {}); end(); return; }
        const history = [...st.history, { slot: q.slot, typeId: s.types[q.slot].typeId, exerciseKey: q.key, correct, ms: Math.max(0, now - st.shownAt) }];
        // Met hulp: neither a point nor a mistake, and the streak neither grows nor breaks.
        const counts = !st.helpedNow;
        const streak = !counts ? st.streak : correct ? st.streak + 1 : 0;
        // The climb: met hulp still builds (asking is fine), only a counted mistake takes a block off.
        const drop = counts && !st.meta?.round.goalKeep;
        const climb = correct ? st.climb + 1 : drop ? Math.max(0, st.climb - 1) : st.climb;
        // A skin may charge time for a counted mistake (Bom: 3 s).
        const cost = counts && !correct ? st.meta?.round.wrongPenaltyMs : undefined;
        set({
            ...(cost && penalise({ endsAt: st.endsAt, pausedLeft: st.pausedLeft }, cost, now)),
            history, streak, bestStreak: Math.max(st.bestStreak, streak), climb, misses: st.misses + (missed ? 1 : 0),
            score: st.score + (counts && correct ? 1 : 0),
            mistakes: counts && !correct ? [...st.mistakes, { question: q, given }] : st.mistakes,
            feedback: { given, expected: q.answer, correct },
            phase: correct ? 'right' : 'wrong',
        });
        if (correct) events.emit('correct', { given, streak });
        else events.emit('wrong', { given, expected: q.answer });
        if (counts) events.emit('streak', { count: streak });
        flashTimer = setTimeout(() => { flashTimer = null; if (get().question === q) get().next(); }, correct ? SPEL_FLASH_MS.right : SPEL_FLASH_MS.wrong);
    };

    return {
        ...IDLE,
        pickerAt: null,
        events: createSpelEvents(),

        start(o) {
            clearFlash();
            const now = o.now ?? Date.now();
            const seconds = o.meta.round.seconds;
            set({ ...IDLE, meta: o.meta, from: { choice: o.choice, grade: o.grade, topicId: o.topicId }, phase: 'play', sessie: spelSessieOf(o), endsAt: seconds ? now + seconds * 1000 : null, pickerAt: null });
            get().next(now);
        },

        next(now = Date.now()) {
            clearFlash();
            const { sessie: s, history, phase } = get();
            if (!s || phase === 'idle' || phase === 'end' || phase === 'help') return;
            if (timeUp(now)) { get().events.emit('timeUp', {}); end(); return; }
            const boardRound = get().meta?.round.board;
            if (boardRound) {
                const board = nextBoardOf(s, boardRound, get().board, history, get().meta?.choiceCount);
                if (!board) { end(); return; }
                set({ board, question: null, phase: 'play', feedback: null, helpedNow: false, help: null, shownAt: now });
                return;
            }
            if (s.total !== undefined && history.length >= s.total) { end(); return; }
            const cap = get().meta?.round.cap;
            if (cap && history.length >= cap) { end(); return; }
            const goal = get().meta?.round.goal;
            if (goal && get().climb >= goal) { end(); return; }
            const seen = new Set(history.map(h => h.exerciseKey));
            const madeBy = madePerSlot(s, history);
            let question: SpelQuestion | null = null;
            for (let tries = 0; !question && tries < MAX_DRAWS; tries++) {
                const pick = nextType(s, history);
                const made = pick && nextExercise(s, pick.type, seen, undefined, madeBy[pick.slot]);
                question = pick && made ? spelQuestionOf(pick.type, pick.slot, made, get().meta?.choiceCount) : null;
            }
            if (!question) { end(); return; }
            set({ question, phase: 'play', feedback: null, helpedNow: false, help: null, shownAt: now });
        },

        answer(given, now = Date.now()) {
            const { phase, sessie: s, question: q } = get();
            if (phase !== 'play' || !s || !q) return;
            const type = s.types[q.slot];
            const d = kioskFor(type.typeId);
            if (!d || given.trim() === '') return;
            // A pack choice is checked in the kiosk's own answer form (a time as [uur, minuten], a wording's fields).
            const asKiosk = kioskAnswerOf(q, given);
            settle(given.trim(), checkAnswer(d, q.exercise, q.constraints, asKiosk, type.exactForm), now);
        },

        miss(now = Date.now()) {
            const { phase, sessie: s, question: q } = get();
            if (phase !== 'play' || !s || !q) return;
            settle('', false, now, true);
        },

        fail(now = Date.now()) {
            const { phase, meta, events } = get();
            if (!meta?.canFail || (phase !== 'play' && phase !== 'right' && phase !== 'wrong')) return;
            if (timeUp(now)) { events.emit('timeUp', {}); end(); return; }
            end(true);
        },

        openHelp(now = Date.now()) {
            const { phase, sessie: s, question: q, endsAt, pausedLeft, helpedNow, helped, events } = get();
            if (phase !== 'play' || !s || !q) return;
            const typeId = s.types[q.slot].typeId;
            // A board counts met hulp per open sum; help on a sum already settled only explains it.
            const onBoard = get().board ? boardOpenHelp(get().board!) : null;
            set({
                phase: 'help', helpedNow: true, helped: onBoard ? helped + (onBoard.counts ? 1 : 0) : helpedNow ? helped : helped + 1,
                ...(onBoard && { board: onBoard.board }),
                help: { lines: stepsFor(typeId, q.exercise, q.constraints), handig: handigFor(typeId, q.exercise, q.constraints, s.grade) },
                // The clock stops with the round (already stopped under a skin's hold).
                pausedLeft: pausedLeft ?? (endsAt !== null ? Math.max(0, endsAt - now) : null),
            });
            events.emit('help', {});
        },

        closeHelp(now = Date.now()) {
            const { phase, pausedLeft, held } = get();
            if (phase !== 'help') return;
            // Under a skin's hold the clock waits for the hold to end.
            set({ phase: 'play', help: null, ...(!held && { pausedLeft: null, ...(pausedLeft !== null && { endsAt: now + pausedLeft }) }), shownAt: now });
        },

        tick(now = Date.now()) {
            const { phase } = get();
            if ((phase === 'play' || phase === 'right' || phase === 'wrong') && timeUp(now)) { get().events.emit('timeUp', {}); end(); }
        },

        finish(result) {
            const { phase } = get();
            if (phase !== 'play' && phase !== 'right' && phase !== 'wrong') return;
            set({ result });
            end();
        },

        report(result) {
            const { phase } = get();
            if (phase !== 'idle' && phase !== 'end') set({ result });
        },

        hold(on, now = Date.now()) {
            const { phase, held, endsAt, pausedLeft } = get();
            if (on === held || phase === 'idle' || phase === 'end') return;
            if (on) set({ held: true, pausedLeft: pausedLeft ?? (endsAt !== null ? Math.max(0, endsAt - now) : null) });
            // Under help the clock stays stopped until the help closes.
            else set({ held: false, ...(phase !== 'help' && { pausedLeft: null, ...(pausedLeft !== null && { endsAt: now + pausedLeft }) }) });
        },

        restart() {
            const { meta, from } = get();
            if (meta && from) get().start({ ...from, meta });
        },

        otherGame() {
            clearFlash();
            const from = get().from;
            set({ ...IDLE, pickerAt: from });
        },

        nakijken() {
            const { sessie, mistakes, phase } = get();
            if (phase !== 'end' || !sessie || !mistakes.length) return;
            const { sessie: review, items } = reviewOf(sessie, mistakes.map(m => m.question));
            clearFlash();
            set({ ...IDLE, pickerAt: null });
            useOefenStore.getState().openReview(review, items);
        },

        takePickerAt() {
            const at = get().pickerAt;
            if (at) set({ pickerAt: null });
            return at;
        },

        boardPick(cell, given, strike = true, now = Date.now()) {
            const st = get();
            const round = st.meta?.round.board;
            if (st.phase !== 'play' || !st.sessie || !st.board || !round) return;
            const out = boardPickIn(st.sessie, st.board, round, cell, given.trim(), strike, now - st.shownAt);
            if (!out) return;
            const { board, entry, mistake, correct, cleared } = out;
            // Met hulp, as in a normal round: no point, no mistake, the streak waits.
            const counts = !st.board.cells[cell].helped;
            const streak = !entry || !counts ? st.streak : correct ? st.streak + 1 : 0;
            set({
                board, question: board.cells[cell].question, helpedNow: board.cells[cell].helped, shownAt: now,
                history: entry ? [...st.history, entry] : st.history,
                score: st.score + (entry && correct && counts ? 1 : 0),
                streak, bestStreak: Math.max(st.bestStreak, streak),
                mistakes: mistake ? [...st.mistakes, mistake] : st.mistakes,
                ...(cleared && { phase: 'right' as SpelPhase }),
            });
            if (correct) st.events.emit('correct', { given, streak });
            else if (mistake) st.events.emit('wrong', { given, expected: board.cells[cell].question.answer });
            if (entry && counts) st.events.emit('streak', { count: streak });
            // A cleared board stays a moment (the last pair sparkles, the bee lands), then the next one.
            if (cleared) flashTimer = setTimeout(() => { flashTimer = null; if (get().board === board) get().next(); }, SPEL_BOARD_PAUSE_MS);
        },

        boardFocus(cell) {
            const { phase, board } = get();
            const c = board?.cells[cell];
            if (phase !== 'play' || !board || !c) return;
            set({ board: { ...board, focus: cell }, question: c.question, helpedNow: c.helped });
        },
    };
});
