import type { DuelEventMap } from './types';

// The duel's own small event bus (the session's SpelEvents carry one player's events only).

type Listener = (p: never) => void;
export interface DuelEvents {
    on<K extends keyof DuelEventMap>(name: K, fn: (p: DuelEventMap[K]) => void): () => void;
    emit<K extends keyof DuelEventMap>(name: K, p: DuelEventMap[K]): void;
}

export function createDuelEvents(): DuelEvents {
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
