import { create } from 'zustand';
import { checkAnswer } from '../../../../services/oefenen/check';
import { kioskFor } from '../../../../services/oefenen/kiosk';
import { madePerSlot, nextExercise, nextType } from '../../../../services/oefenen/scheduler';
import type { OefenHistoryEntry, OefenSessie } from '../../../../services/oefenen/types';
import { kioskAnswerOf, spelQuestionOf, type SpelQuestion } from '../../spelQuestion';
import { spelSessieOf, type SpelFrom } from '../../useSpelStore';
import type { SkinMeta } from '../types';

// Touwtrekken: two pupils on one screen, each with a keypad. Its own small session (two question streams),
// beside useSpelStore, which only holds the choice. Runtime only, nothing stored, no Nakijken.

export type Side = 'left' | 'right';
export const SIDES: readonly Side[] = ['left', 'right'];
// samen = both at once, each with their own sums; beurt = one shared sum, the first right answer pulls.
export type DuelMode = 'samen' | 'beurt';

export const DUEL = {
    // The flag N steps past the middle wins at once.
    steps: 5,
    // Or after 2 minutes: the side the flag leans to; level = a draw.
    seconds: 120,
    flash: { right: 700, wrong: 1500 },
} as const;
const MAX_DRAWS = 12;

// What wins a duel: the rope (Touwtrekken), or `target` right answers first (Kasteel: the other castle's lives),
// and the time limit. Absent at setup = the rope.
export interface DuelRule { seconds: number; target?: number }
const ROPE: DuelRule = { seconds: DUEL.seconds };

export interface DuelFeedback { given: string; expected: string; correct: boolean }

export interface DuelSide {
    question: SpelQuestion | null;
    // This side's own stream (samen); in beurt mode both read the shared stream.
    history: OefenHistoryEntry[];
    score: number;
    // The flash after an answer; null = waiting for one.
    feedback: DuelFeedback | null;
    // beurt: this side is done with the shared sum (answered wrong, or the other side took it).
    locked: boolean;
    shownAt: number;
}

export interface DuelEventMap {
    // A right answer pulled the flag one step toward this side.
    pull: { side: Side; rope: number };
    wrong: { side: Side };
    end: { winner: Side | 'draw'; left: number; right: number };
}

type Listener = (p: never) => void;
export interface DuelEvents {
    on<K extends keyof DuelEventMap>(name: K, fn: (p: DuelEventMap[K]) => void): () => void;
    emit<K extends keyof DuelEventMap>(name: K, p: DuelEventMap[K]): void;
}
function createDuelEvents(): DuelEvents {
    const all = new Map<string, Set<Listener>>();
    return {
        on(name, fn) {
            const set = all.get(name) ?? new Set<Listener>();
            all.set(name, set);
            set.add(fn as Listener);
            return () => { set.delete(fn as Listener); };
        },
        emit(name, p) { for (const fn of [...(all.get(name) ?? [])]) (fn as (x: typeof p) => void)(p); },
    };
}

interface DuelState {
    phase: 'setup' | 'play' | 'end';
    mode: DuelMode;
    meta: SkinMeta | null;
    from: SpelFrom | null;
    sessie: OefenSessie | null;
    sides: Record<Side, DuelSide>;
    // beurt: the shared stream's history (both sides' answers to the shared sums).
    shared: OefenHistoryEntry[];
    // Where the flag is: negative = toward left, positive = toward right.
    rope: number;
    endsAt: number | null;
    winner: Side | 'draw' | null;
    rule: DuelRule;
    events: DuelEvents;

    // The pre-start screen for this choice (Samen tegelijk / Om beurten).
    setup(o: { meta: SkinMeta; from: SpelFrom; rule?: DuelRule }): void;
    start(mode: DuelMode, now?: number): void;
    answer(side: Side, given: string, now?: number): void;
    tick(now?: number): void;
    // Nog eens: the same mode again.
    again(now?: number): void;
    // Back to Samen tegelijk / Om beurten.
    toSetup(): void;
    stop(): void;
}

const emptySide = (): DuelSide => ({ question: null, history: [], score: 0, feedback: null, locked: false, shownAt: 0 });

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

/** Who wins with the flag here: a side at DUEL.steps, else null (still going); at the time limit the leaning side or a draw. */
export function winnerOf(rope: number, timeUp: boolean): Side | 'draw' | null {
    if (rope <= -DUEL.steps) return 'left';
    if (rope >= DUEL.steps) return 'right';
    if (!timeUp) return null;
    return rope < 0 ? 'left' : rope > 0 ? 'right' : 'draw';
}

/** A race to `target` right answers: the first side there wins; at the time limit the side ahead, or a draw. */
export function targetWinnerOf(left: number, right: number, target: number, timeUp: boolean): Side | 'draw' | null {
    if (left >= target) return 'left';
    if (right >= target) return 'right';
    if (!timeUp) return null;
    return left > right ? 'left' : right > left ? 'right' : 'draw';
}

const winnerFor = (st: Pick<DuelState, 'rule' | 'rope' | 'sides'>, timeUp: boolean) =>
    st.rule.target ? targetWinnerOf(st.sides.left.score, st.sides.right.score, st.rule.target, timeUp) : winnerOf(st.rope, timeUp);

export const useDuelStore = create<DuelState>()((set, get) => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const later = (id: string, ms: number, fn: () => void) => {
        clearTimeout(timers.get(id));
        timers.set(id, setTimeout(() => { timers.delete(id); fn(); }, ms));
    };
    const clearAll = () => { for (const t of timers.values()) clearTimeout(t); timers.clear(); };

    const finish = (winner: Side | 'draw') => {
        clearAll();
        const { sides, events } = get();
        set({ phase: 'end', winner });
        events.emit('end', { winner, left: sides.left.score, right: sides.right.score });
    };

    const patchSide = (side: Side, p: Partial<DuelSide>) => set(st => ({ sides: { ...st.sides, [side]: { ...st.sides[side], ...p } } }));

    // samen: a new sum for one side from its own stream.
    const nextOwn = (side: Side, now = Date.now()) => {
        const { sessie, phase, sides } = get();
        if (!sessie || phase !== 'play') return;
        patchSide(side, { question: drawFor(sessie, sides[side].history), feedback: null, locked: false, shownAt: now });
    };

    // beurt: one new shared sum for both sides.
    const nextShared = (now = Date.now()) => {
        const { sessie, phase, shared } = get();
        if (!sessie || phase !== 'play') return;
        const q = drawFor(sessie, shared);
        set(st => ({ sides: { left: { ...st.sides.left, question: q, feedback: null, locked: false, shownAt: now }, right: { ...st.sides.right, question: q, feedback: null, locked: false, shownAt: now } } }));
    };

    const entry = (s: OefenSessie, q: SpelQuestion, correct: boolean, ms: number): OefenHistoryEntry =>
        ({ slot: q.slot, typeId: s.types[q.slot].typeId, exerciseKey: q.key, correct, ms: Math.max(0, ms) });

    const pull = (side: Side) => {
        const rope = get().rope + (side === 'left' ? -1 : 1);
        set({ rope });
        get().events.emit('pull', { side, rope });
        const w = winnerFor(get(), false);
        if (w) { finish(w); return true; }
        return false;
    };

    return {
        phase: 'setup', mode: 'samen', meta: null, from: null, sessie: null,
        sides: { left: emptySide(), right: emptySide() }, shared: [], rope: 0, endsAt: null, winner: null, rule: ROPE,
        events: createDuelEvents(),

        setup({ meta, from, rule = ROPE }) {
            clearAll();
            set({ phase: 'setup', meta, from, rule, sessie: null, sides: { left: emptySide(), right: emptySide() }, shared: [], rope: 0, endsAt: null, winner: null });
        },

        start(mode, now = Date.now()) {
            const { meta, from } = get();
            if (!meta || !from) return;
            clearAll();
            set({
                phase: 'play', mode, sessie: spelSessieOf({ ...from, meta, now }),
                sides: { left: emptySide(), right: emptySide() }, shared: [], rope: 0, endsAt: now + get().rule.seconds * 1000, winner: null,
            });
            if (mode === 'beurt') nextShared(now);
            else for (const side of SIDES) nextOwn(side, now);
        },

        answer(side, givenIn, now = Date.now()) {
            const st = get();
            const me = st.sides[side];
            const q = me.question;
            const given = givenIn.trim();
            if (st.phase !== 'play' || !st.sessie || !q || me.feedback || me.locked || given === '') return;
            if (st.endsAt !== null && now >= st.endsAt) { get().tick(now); return; }
            const type = st.sessie.types[q.slot];
            const d = kioskFor(type.typeId);
            if (!d) return;
            const correct = checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, given), type.exactForm);
            const feedback = { given, expected: q.answer, correct };
            const h = entry(st.sessie, q, correct, now - me.shownAt);

            if (st.mode === 'samen') {
                patchSide(side, { history: [...me.history, h], score: me.score + (correct ? 1 : 0), feedback });
                if (!correct) st.events.emit('wrong', { side });
                else if (pull(side)) return;
                later(side, correct ? DUEL.flash.right : DUEL.flash.wrong, () => nextOwn(side));
                return;
            }

            // beurt: the first right answer takes the sum; a wrong one only locks this side.
            const other: Side = side === 'left' ? 'right' : 'left';
            set({ shared: [...st.shared, h] });
            if (correct) {
                set(s => ({ sides: { ...s.sides, [side]: { ...me, score: me.score + 1, feedback }, [other]: { ...s.sides[other], locked: true } } }));
                if (pull(side)) return;
                later('shared', DUEL.flash.right + 300, () => nextShared());
                return;
            }
            st.events.emit('wrong', { side });
            patchSide(side, { feedback, locked: true });
            // Both wrong: the right answer shows on both sides, then the next sum.
            if (get().sides[other].locked) later('shared', DUEL.flash.wrong, () => nextShared());
        },

        tick(now = Date.now()) {
            const { phase, endsAt } = get();
            if (phase !== 'play' || endsAt === null || now < endsAt) return;
            finish(winnerFor(get(), true)!);
        },

        again(now = Date.now()) { get().start(get().mode, now); },

        toSetup() {
            const { meta, from, rule } = get();
            if (meta && from) get().setup({ meta, from, rule });
        },

        stop() {
            clearAll();
            set({ phase: 'setup', sessie: null, sides: { left: emptySide(), right: emptySide() }, shared: [], rope: 0, endsAt: null, winner: null });
        },
    };
});
