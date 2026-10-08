import { useBoardStore } from './useBoardStore';
import type { WidgetKind } from './boardTypes';

// Shared add helpers for the Toevoegen menu + Wiskunde modal.

// A diagonal run of 5 slots 40px apart; each next run starts 240px further right (so a card's
// title stays readable under the next run), and after 4 runs the whole pattern shifts 20px.
const RUN = 5, STEP = 40, RUN_DX = 240, RUNS_PER_LAP = 4, LAP_SHIFT = 20;

export function staggerSlot(k: number): { x: number; y: number } {
    const i = k % RUN, run = Math.floor(k / RUN), lap = Math.floor(run / RUNS_PER_LAP);
    return {
        x: 60 + i * STEP + (run % RUNS_PER_LAP) * RUN_DX + lap * LAP_SHIFT,
        y: 40 + i * STEP + lap * LAP_SHIFT,
    };
}

// The first slot no widget on the page still sits on, so a new card never lands exactly on an
// older one (the old `count % 5` put the 6th card on the 1st).
export function staggerPos(): { x: number; y: number } {
    const s = useBoardStore.getState();
    const widgets = s.pages[s.activePageIdx].widgets;
    const taken = (p: { x: number; y: number }) => widgets.some(w => Math.abs(w.x - p.x) < LAP_SHIFT / 2 && Math.abs(w.y - p.y) < LAP_SHIFT / 2);
    for (let k = 0; k <= widgets.length; k++) {
        const p = staggerSlot(k);
        if (!taken(p)) return p;
    }
    return staggerSlot(widgets.length);
}

export function addBasicWidget(kind: WidgetKind, props?: Record<string, unknown>, w = 320): string {
    return useBoardStore.getState().addWidget({ kind, ...staggerPos(), w, props });
}
