import { create } from 'zustand';
import { checkAnswer } from '../../../services/oefenen/check';
import { kioskFor } from '../../../services/oefenen/kiosk';
import { madePerSlot, nextExercise, nextType } from '../../../services/oefenen/scheduler';
import type { OefenHistoryEntry, OefenSessie } from '../../../services/oefenen/types';
import { kioskAnswerOf, spelQuestionOf, type SpelQuestion } from '../spelQuestion';
import { spelSessieOf, type SpelFrom } from '../useSpelStore';
import type { SkinMeta } from '../skins/types';
import { botTurn } from './bot';
import { createDuelEvents, type DuelEvents } from './events';
import { DUEL_TIMING, SHARED_TRIES, applyEffect, defaultRoundOver, freshSideView, leadOf, matchWinnerOf, sumLimitMs, wrongOf } from './rules';
import { SIDES, otherSide, type DuelConfig, type DuelCtx, type DuelEffect, type DuelEventMap, type DuelFlight, type DuelRule, type DuelSide, type DuelSideView, type Side } from './types';

// THE duel engine (DUEL.md): one match of two sides on one screen. Its own small session beside useSpelStore
// (which only holds the choice): two question streams (or one shared), lives and points per side, the game's
// rule for what an answer does, flights that land later, the Moeilijk clock per sum, the bot for 1 speler,
// rounds and best of. Runtime only: nothing stored, no help and no Nakijken.

// idle = nothing on; ready = the "Ronde N" banner; play; roundEnd = between rounds; matchEnd = the winner is known.
export type DuelPhase = 'idle' | 'ready' | 'play' | 'roundEnd' | 'matchEnd';
const MAX_DRAWS = 12;

export interface DuelBegin { meta: SkinMeta; from: SpelFrom; rule: DuelRule; config: DuelConfig; now?: number }

export interface DuelState {
    phase: DuelPhase;
    meta: SkinMeta | null;
    from: SpelFrom | null;
    sessie: OefenSessie | null;
    config: DuelConfig;
    rule: DuelRule;
    // 1-based.
    round: number;
    sides: Record<Side, DuelSide>;
    // Shared stream: the history of the shared sums (both sides' answers).
    shared: OefenHistoryEntry[];
    flights: DuelFlight[];
    roundEndsAt: number | null;
    roundWinner: Side | 'draw' | null;
    matchWinner: Side | null;
    // The round's win moment has played: the scoreboard (or the match card) is up.
    card: boolean;
    // Paused (a phone held upright, the "Draai je toestel" prompt): every clock stands still, answers wait.
    paused: boolean;
    events: DuelEvents;

    // A new match (fresh session) from the picked config; the first round starts with its banner.
    begin(o: DuelBegin): void;
    answer(side: Side, given: string, now?: number): void;
    // A game-driven effect outside an answer (a bug flies off, a hazard hits): applied as `by`'s.
    effect(by: Side, e: DuelEffect, now?: number): void;
    // "Volgende ronde" on the scoreboard card.
    nextRound(now?: number): void;
    // "Nog eens": the same match again.
    again(now?: number): void;
    // Freeze the round (ready / play only): the timers stop and keep what was left; resume shifts every deadline.
    pause(now?: number): void;
    resume(now?: number): void;
    stop(): void;
}

/** The next question of one stream: the session's scheduler, as useSpelStore draws it. */
export function drawFor(s: OefenSessie, history: readonly OefenHistoryEntry[]): SpelQuestion | null {
    const seen = new Set(history.map(h => h.exerciseKey));
    const madeBy = madePerSlot(s, history);
    for (let tries = 0; tries < MAX_DRAWS; tries++) {
        const pick = nextType(s, history);
        const made = pick && nextExercise(s, pick.type, seen, undefined, madeBy[pick.slot]);
        const q = pick && made ? spelQuestionOf(pick.type, pick.slot, made) : null;
        if (q) return q;
    }
    return null;
}

const DEFAULT_CONFIG: DuelConfig = { players: 2, level: 'normaal', lives: 5, bestOf: 3, stream: 'own' };

const freshSide = (lives: number, keep?: Pick<DuelSide, 'history' | 'wins' | 'totalRight'>): DuelSide => ({
    ...freshSideView(lives), question: null, history: keep?.history ?? [], feedback: null, locked: false, tries: 0, out: false,
    shownAt: 0, deadline: null, limitMs: null, wins: keep?.wins ?? 0, totalRight: keep?.totalRight ?? 0,
});

const viewOf = (s: DuelSide): DuelSideView => ({ lives: s.lives, points: s.points, streak: s.streak, right: s.right, wrong: s.wrong, flags: s.flags });

export const useDuelStore = create<DuelState>()((set, get) => {
    // Every engine timer, with when it is due (in the caller's clock) so a pause can keep what is left.
    // fn gets that due time: a pause shifts it, so a landing or a time-out after a pause is stamped right.
    interface Timer { t: ReturnType<typeof setTimeout>; due: number; fn: (at: number) => void }
    const timers = new Map<string, Timer>();
    // Paused: the timers that were running and the ms each had left.
    const frozen = new Map<string, { left: number; fn: (at: number) => void }>();
    let pausedAt = 0;
    const later = (id: string, ms: number, fn: (at: number) => void, from = Date.now()) => {
        clearTimeout(timers.get(id)?.t);
        const due = from + ms;
        timers.set(id, { due, fn, t: setTimeout(() => { timers.delete(id); fn(due); }, ms) });
    };
    const cancel = (id: string) => { clearTimeout(timers.get(id)?.t); timers.delete(id); frozen.delete(id); };
    const clearAll = () => { for (const t of timers.values()) clearTimeout(t.t); timers.clear(); frozen.clear(); };
    let flightId = 1;

    const rng = () => (get().config.rng ?? Math.random)();
    const playing = () => get().phase === 'play' && !get().paused;
    const patchSide = (side: Side, p: Partial<DuelSide>) => set(st => ({ sides: { ...st.sides, [side]: { ...st.sides[side], ...p } } }));
    const isBot = (side: Side) => get().config.players === 1 && side === 'right';

    const ctxOf = (side: Side): DuelCtx => {
        const { sides, config, round } = get();
        const other = otherSide(side);
        const me = viewOf(sides[side]);
        return { side, other, me, them: viewOf(sides[other]), streak: me.streak, level: config.level, round, config };
    };

    // ── Rounds ──
    const endRound = (winner: Side | 'draw') => {
        clearAll();
        const { sides, config, round, events, rule } = get();
        const wins = { left: sides.left.wins + (winner === 'left' ? 1 : 0), right: sides.right.wins + (winner === 'right' ? 1 : 0) };
        const match = matchWinnerOf(wins, config.bestOf);
        set(st => ({
            phase: match ? 'matchEnd' : 'roundEnd', paused: false, roundWinner: winner, matchWinner: match, flights: [], card: false, roundEndsAt: null,
            sides: {
                left: { ...st.sides.left, wins: wins.left, deadline: null, locked: true },
                right: { ...st.sides.right, wins: wins.right, deadline: null, locked: true },
            },
        }));
        events.emit('roundEnd', { winner, round, wins });
        if (match) events.emit('matchEnd', { winner: match, wins });
        later('card', rule.cardMs ?? DUEL_TIMING.cardMs, () => set({ card: true }));
    };

    const checkRound = (timeUp: boolean) => {
        if (!playing()) return;
        const { sides, config, rule } = get();
        const view = { sides: { left: viewOf(sides.left), right: viewOf(sides.right) }, config };
        const w = (rule.roundOver ?? defaultRoundOver)(view, timeUp) ?? (timeUp ? 'draw' : null);
        if (w) endRound(w);
    };

    // ── Effects and flights ──
    const apply = (by: Side, cause: DuelEventMap['effect']['cause'], e: DuelEffect, now: number) => {
        if (!playing()) return;
        const { sides, rule, config, events } = get();
        const before = { left: viewOf(sides.left), right: viewOf(sides.right) };
        const after = applyEffect(before, e, rule.maxLives?.(config));
        set(st => ({ sides: { left: { ...st.sides.left, ...after.left }, right: { ...st.sides.right, ...after.right } } }));
        events.emit('effect', { by, cause, effect: e });
        for (const s of SIDES) {
            const lost = before[s].lives - after[s].lives;
            if (lost) events.emit('damage', { side: s, by, amount: lost, lives: after[s].lives, tag: e.tag });
            const gained = after[s].points - before[s].points;
            if (gained) events.emit('points', { side: s, amount: gained, points: after[s].points, tag: e.tag });
        }
        if (e.launch && playing()) {
            const l = e.launch;
            const flight: DuelFlight = { id: flightId++, from: by, to: l.to ?? otherSide(by), tag: l.tag ?? 'shot', startedAt: now, landsAt: now + l.ms, data: l.data ?? {}, effect: l.effect ?? {} };
            set(st => ({ flights: [...st.flights, flight] }));
            events.emit('launch', { flight });
            later(`flight-${flight.id}`, l.ms, at => land(flight.id, at), now);
        }
        checkRound(false);
    };

    const land = (id: number, now: number) => {
        const flight = get().flights.find(f => f.id === id);
        if (!flight || !playing()) return;
        set(st => ({ flights: st.flights.filter(f => f.id !== id) }));
        get().events.emit('land', { flight });
        const { rule } = get();
        apply(flight.from, 'land', rule.land ? rule.land(ctxOf(flight.from), flight) : flight.effect, now);
    };

    // ── Sums ──
    const scheduleBot = () => {
        const me = get().sides.right;
        const q = me.question;
        if (!isBot('right') || !playing() || !q || me.feedback || me.locked || me.out) return;
        const { config, sides } = get();
        const turn = botTurn(config.level, leadOf(viewOf(sides.right), viewOf(sides.left), config.lives), q.answer.length, rng);
        later('bot', turn.delayMs, () => {
            const cur = get().sides.right;
            if (!playing() || cur.question?.key !== q.key || cur.feedback || cur.locked || cur.out) return;
            submit('right', turn.correct, turn.correct ? q.answer : wrongOf(q.answer, rng), Date.now());
        });
    };

    const pose = (side: Side, q: SpelQuestion | null, now: number) => {
        const { config, sides } = get();
        const limit = config.level === 'moeilijk' && q ? sumLimitMs(sides[side].right) : null;
        patchSide(side, { question: q, feedback: null, locked: false, tries: 0, out: false, shownAt: now, deadline: limit === null ? null : now + limit, limitMs: limit });
        if (limit !== null && q) later(`deadline-${side}`, limit, at => timeout(side, q.key, at), now);
        else cancel(`deadline-${side}`);
        if (isBot(side)) { cancel('bot'); scheduleBot(); }
    };

    const nextOwn = (side: Side, now = Date.now()) => {
        const { sessie, sides } = get();
        if (!sessie || !playing()) return;
        pose(side, drawFor(sessie, sides[side].history), now);
    };

    const nextShared = (now = Date.now()) => {
        const { sessie, shared } = get();
        if (!sessie || !playing()) return;
        const q = drawFor(sessie, shared);
        for (const side of SIDES) pose(side, q, now);
    };

    // Shared: nobody can take this sum any more; both see the answer, then the next.
    const closeShared = () => {
        const q = get().sides.left.question;
        if (!q) return;
        for (const s of SIDES) {
            cancel(`deadline-${s}`); cancel(`lock-${s}`);
            const me = get().sides[s];
            patchSide(s, { locked: true, deadline: null, feedback: me.feedback?.correct ? me.feedback : { given: '', expected: q.answer, correct: false } });
        }
        cancel('bot');
        later('shared', DUEL_TIMING.flashWrong, () => nextShared());
    };

    const entry = (q: SpelQuestion, correct: boolean, ms: number): OefenHistoryEntry =>
        ({ slot: q.slot, typeId: get().sessie!.types[q.slot].typeId, exerciseKey: q.key, correct, ms: Math.max(0, ms) });

    // One answer, already checked (the bot's answers come here directly).
    const submit = (side: Side, correct: boolean, given: string, now: number) => {
        const st = get();
        const me = st.sides[side];
        const q = me.question;
        if (!playing() || !q) return;
        cancel(`deadline-${side}`);
        const h = entry(q, correct, now - me.shownAt);
        const counts = correct
            ? { streak: me.streak + 1, right: me.right + 1, totalRight: me.totalRight + 1 }
            : { streak: 0, wrong: me.wrong + 1 };
        const feedback = { given, expected: q.answer, correct };

        if (st.config.stream === 'own') {
            patchSide(side, { ...counts, history: [...me.history, h], feedback, deadline: null });
            if (correct) st.events.emit('right', { side, given, streak: counts.streak!, ms: h.ms });
            else st.events.emit('wrong', { side, given, expected: q.answer });
            const effect = correct ? st.rule.right?.(ctxOf(side)) ?? { damage: { [otherSide(side)]: 1 } } : st.rule.wrong?.(ctxOf(side));
            if (effect) apply(side, correct ? 'right' : 'wrong', effect, now);
            if (playing()) later(`flash-${side}`, correct ? DUEL_TIMING.flashRight : DUEL_TIMING.flashWrong, () => nextOwn(side));
            return;
        }

        // Shared: the first right answer takes the sum; a wrong one locks this keypad for a moment.
        set(s => ({ shared: [...s.shared, h] }));
        const other = otherSide(side);
        if (correct) {
            for (const s of SIDES) { cancel(`deadline-${s}`); cancel(`lock-${s}`); }
            cancel('bot');
            patchSide(side, { ...counts, feedback, locked: true, deadline: null });
            patchSide(other, { feedback: { given: '', expected: q.answer, correct: false }, locked: true, deadline: null });
            st.events.emit('right', { side, given, streak: counts.streak!, ms: h.ms });
            apply(side, 'right', st.rule.right?.(ctxOf(side)) ?? { damage: { [other]: 1 } }, now);
            if (playing()) later('shared', DUEL_TIMING.sharedNext, () => nextShared());
            return;
        }
        const tries = me.tries + 1;
        const out = tries >= SHARED_TRIES;
        patchSide(side, { ...counts, tries, out, locked: true, ...(out && { deadline: null }) });
        st.events.emit('wrong', { side, given, expected: q.answer });
        const effect = st.rule.wrong?.(ctxOf(side));
        if (effect) apply(side, 'wrong', effect, now);
        if (!playing()) return;
        if (get().sides.left.out && get().sides.right.out) { closeShared(); return; }
        if (out) return;
        // The sum's clock runs on through the lock.
        const left = me.deadline === null ? null : me.deadline - now;
        later(`lock-${side}`, st.config.wrongLockMs ?? DUEL_TIMING.wrongLockMs, () => {
            const cur = get().sides[side];
            if (!playing() || cur.question?.key !== q.key || cur.feedback || cur.out) return;
            patchSide(side, { locked: false });
            if (isBot(side)) scheduleBot();
        });
        if (left !== null) later(`deadline-${side}`, Math.max(0, left), at => timeout(side, q.key, at), now);
    };

    const timeout = (side: Side, key: string, now: number) => {
        const st = get();
        const me = st.sides[side];
        const q = me.question;
        if (!playing() || !q || q.key !== key || me.feedback || me.out) return;
        const h = entry(q, false, now - me.shownAt);
        const counts = { streak: 0, wrong: me.wrong + 1 };
        if (st.config.stream === 'own') {
            patchSide(side, { ...counts, history: [...me.history, h], feedback: { given: '', expected: q.answer, correct: false }, deadline: null });
            if (isBot(side)) cancel('bot');
        } else {
            set(s => ({ shared: [...s.shared, h] }));
            cancel(`lock-${side}`);
            if (isBot(side)) cancel('bot');
            patchSide(side, { ...counts, out: true, tries: SHARED_TRIES, locked: true, deadline: null });
        }
        st.events.emit('timeout', { side, expected: q.answer });
        const effect = st.rule.timeout?.(ctxOf(side)) ?? st.rule.wrong?.(ctxOf(side));
        if (effect) apply(side, 'timeout', effect, now);
        if (!playing()) return;
        if (st.config.stream === 'own') later(`flash-${side}`, DUEL_TIMING.flashWrong, () => nextOwn(side));
        else if (get().sides.left.out && get().sides.right.out) closeShared();
    };

    const play = (now: number) => {
        const { config, round, events } = get();
        set({ phase: 'play', roundEndsAt: config.roundSeconds ? now + config.roundSeconds * 1000 : null });
        events.emit('play', { round });
        if (config.roundSeconds) later('round', config.roundSeconds * 1000, () => checkRound(true));
        if (config.stream === 'shared') nextShared(now);
        else for (const side of SIDES) nextOwn(side, now);
    };

    const startRound = (now: number) => {
        clearAll();
        const { config, sides, round, events } = get();
        set({
            phase: 'ready', paused: false, flights: [], roundWinner: null, card: false, roundEndsAt: null,
            sides: { left: freshSide(config.lives, sides.left), right: freshSide(config.lives, sides.right) },
        });
        events.emit('roundStart', { round });
        const ready = config.readyMs ?? DUEL_TIMING.readyMs;
        if (ready > 0) later('ready', ready, at => play(at), now);
        else play(now);
    };

    return {
        phase: 'idle', meta: null, from: null, sessie: null, config: DEFAULT_CONFIG, rule: {}, round: 1,
        sides: { left: freshSide(5), right: freshSide(5) }, shared: [], flights: [], roundEndsAt: null, roundWinner: null, matchWinner: null, card: false, paused: false,
        events: createDuelEvents(),

        begin({ meta, from, rule, config, now = Date.now() }) {
            clearAll();
            set({
                // No question cap: a match runs as long as its rounds do (a solo game's 20-question round would starve a side).
                meta, from, rule, config, round: 1, sessie: { ...spelSessieOf({ ...from, meta, now }), total: undefined }, shared: [], matchWinner: null,
                sides: { left: freshSide(config.lives), right: freshSide(config.lives) },
            });
            startRound(now);
        },

        answer(side, givenIn, now = Date.now()) {
            const st = get();
            const me = st.sides[side];
            const q = me.question;
            const given = givenIn.trim();
            if (!playing() || !st.sessie || !q || me.feedback || me.locked || me.out || given === '' || isBot(side)) return;
            const type = st.sessie.types[q.slot];
            const d = kioskFor(type.typeId);
            if (!d) return;
            submit(side, checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, given), type.exactForm), given, now);
        },

        effect(by, e, now = Date.now()) { apply(by, 'game', e, now); },

        nextRound(now = Date.now()) {
            if (get().phase !== 'roundEnd') return;
            set(st => ({ round: st.round + 1 }));
            startRound(now);
        },

        again(now = Date.now()) {
            const { meta, from, rule, config } = get();
            if (meta && from) get().begin({ meta, from, rule, config, now });
        },

        pause(now = Date.now()) {
            const { phase, paused } = get();
            if (paused || (phase !== 'ready' && phase !== 'play')) return;
            for (const [id, t] of timers) { clearTimeout(t.t); frozen.set(id, { left: Math.max(0, t.due - now), fn: t.fn }); }
            timers.clear();
            pausedAt = now;
            set({ paused: true });
        },

        resume(now = Date.now()) {
            if (!get().paused) return;
            const shift = Math.max(0, now - pausedAt);
            const by = (t: number | null) => (t === null ? null : t + shift);
            const moved = (s: DuelSide): DuelSide => ({ ...s, deadline: by(s.deadline), shownAt: s.shownAt + shift });
            set(st => ({
                paused: false, roundEndsAt: by(st.roundEndsAt),
                flights: st.flights.map(f => ({ ...f, startedAt: f.startedAt + shift, landsAt: f.landsAt + shift })),
                sides: { left: moved(st.sides.left), right: moved(st.sides.right) },
            }));
            const wake = [...frozen];
            frozen.clear();
            for (const [id, f] of wake) later(id, f.left, f.fn, now);
        },

        stop() {
            clearAll();
            set({ phase: 'idle', paused: false, sessie: null, sides: { left: freshSide(5), right: freshSide(5) }, shared: [], flights: [], roundEndsAt: null, roundWinner: null, matchWinner: null, card: false });
        },
    };
});

// Dev builds: the harnesses (scripts/duel-shots.mjs, DUEL.md) drive a match from Playwright through this.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __duel?: typeof useDuelStore }).__duel = useDuelStore;
