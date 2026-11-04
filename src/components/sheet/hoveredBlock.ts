import { useSyncExternalStore } from 'react';

// Which block the pointer is over, for BlockControlsRail. Kept outside React state on
// purpose: as App state every pointer-enter re-rendered App, every PageSheet and every
// viewer on the sheet. Here only the rail, which subscribes, re-renders.
let hoveredId: string | null = null;
const listeners = new Set<() => void>();

export function setHoveredBlockId(next: string | null | ((id: string | null) => string | null)) {
    const value = typeof next === 'function' ? next(hoveredId) : next;
    if (value === hoveredId) return;
    hoveredId = value;
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useHoveredBlockId(): string | null {
    return useSyncExternalStore(subscribe, () => hoveredId);
}
