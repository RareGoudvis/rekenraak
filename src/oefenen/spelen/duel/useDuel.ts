import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SkinMeta } from '../skins/types';
import type { SpelFrom } from '../useSpelStore';
import { useDuelStore, type DuelState } from './duelStore';
import { duelConfigOf } from './options';
import type { DuelConfig, DuelEventMap, DuelRule } from './types';

/** Starts the match from the picks before the first paint and stops it on unmount; returns the live duel state. */
export function useDuelMatch(meta: SkinMeta, from: SpelFrom, rule: DuelRule, extra: Partial<DuelConfig> = {}): DuelState {
    const begin = () => useDuelStore.getState().begin({ meta, from, rule, config: duelConfigOf(meta.chosen, extra) });
    useState(begin);
    useEffect(() => {
        // A remount (StrictMode) finds the match stopped by the cleanup below: start it again.
        if (useDuelStore.getState().phase === 'idle') begin();
        return () => useDuelStore.getState().stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount: the picks never change while mounted
    }, []);
    return useDuelStore();
}

/** Listens to one duel event for the component's life; the handler may change every render. */
export function useDuelEvent<K extends keyof DuelEventMap>(name: K, fn: (p: DuelEventMap[K]) => void): void {
    const events = useDuelStore(s => s.events);
    const live = useRef(fn);
    useLayoutEffect(() => { live.current = fn; });
    useEffect(() => events.on(name, p => live.current(p)), [events, name]);
}
