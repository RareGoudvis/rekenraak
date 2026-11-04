import type { StateCreator } from 'zustand';
import type { MathBlock } from '../../services/math/types';
import type { HistorySlice, WorksheetState } from '../types';

const MAX_HISTORY = 50;

// Which block a history step actually changed, preferring one that still exists in the
// restored array so the caller has something to scroll to. Undo is invisible when the
// affected block is off-screen, which reads as "nothing happened".
function changedBlockId(next: MathBlock[], prev: MathBlock[]): string | null {
    const prevById = new Map(prev.map((b) => [b.id, b]));
    for (const b of next) {
        const before = prevById.get(b.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(b)) return b.id;
    }
    return null;
}

function pushHistory(history: MathBlock[][], index: number, blocks: MathBlock[]): { _history: MathBlock[][], _historyIndex: number } {
    const sliced = history.slice(0, index + 1);
    const next = [...sliced, blocks].slice(-MAX_HISTORY);
    return { _history: next, _historyIndex: next.length - 1 };
}

// Every sheet edit that Ctrl+Z must be able to take back goes through here, so the
// blocks write and its history entry can never drift apart.
export function commitBlocks(state: Pick<WorksheetState, '_history' | '_historyIndex'>, blocks: MathBlock[]) {
    return { blocks, ...pushHistory(state._history, state._historyIndex, blocks) };
}

export const createHistorySlice: StateCreator<WorksheetState, [], [], HistorySlice> = (set, get) => ({
    _history: [[]],
    _historyIndex: 0,

    undo: () => {
        const state = get();
        const idx = state._historyIndex - 1;
        if (idx < 0) return null;
        const restored = state._history[idx];
        set({ blocks: restored, _historyIndex: idx });
        return changedBlockId(restored, state.blocks);
    },
    redo: () => {
        const state = get();
        const idx = state._historyIndex + 1;
        if (idx >= state._history.length) return null;
        const restored = state._history[idx];
        set({ blocks: restored, _historyIndex: idx });
        return changedBlockId(restored, state.blocks);
    },
    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,
});
