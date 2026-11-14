// What a game skin can react to; the session emits, skins only listen (a skin never changes what is asked or checked).
export interface SpelEventMap {
    correct: { given: string; streak: number };
    wrong: { given: string; expected: string };
    // The pupil opened "Hoe los ik dit op?": the round is paused.
    help: Record<string, never>;
    // The streak of right answers in a row after an answer (0 after a wrong one).
    streak: { count: number };
    timeUp: Record<string, never>;
    end: { score: number; bestStreak: number; mistakes: number; helped: number };
}

export type SpelEventName = keyof SpelEventMap;
type Listener<K extends SpelEventName> = (payload: SpelEventMap[K]) => void;

export interface SpelEvents {
    on<K extends SpelEventName>(name: K, fn: Listener<K>): () => void;
    emit<K extends SpelEventName>(name: K, payload: SpelEventMap[K]): void;
}

export function createSpelEvents(): SpelEvents {
    const listeners = new Map<SpelEventName, Set<(p: unknown) => void>>();
    return {
        on(name, fn) {
            const set = listeners.get(name) ?? new Set();
            listeners.set(name, set);
            set.add(fn as (p: unknown) => void);
            return () => { set.delete(fn as (p: unknown) => void); };
        },
        emit(name, payload) {
            for (const fn of [...(listeners.get(name) ?? [])]) fn(payload);
        },
    };
}
