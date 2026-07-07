import { useBoardStore } from './useBoardStore';
import type { WidgetKind } from './boardTypes';

// Shared add helpers for the Toevoegen menu + Wiskunde modal.

// Stagger new widgets a little so consecutive adds don't stack exactly.
export function staggerPos(): { x: number; y: number } {
    const s = useBoardStore.getState();
    const n = s.pages[s.activePageIdx].widgets.length;
    return { x: 60 + (n % 5) * 40, y: 40 + (n % 5) * 40 };
}

export function addBasicWidget(kind: WidgetKind, props?: Record<string, unknown>, w = 320): string {
    return useBoardStore.getState().addWidget({ kind, ...staggerPos(), w, props });
}
