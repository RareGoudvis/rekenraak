import type { StateCreator } from 'zustand';
import type { MathBlock } from '../../services/math/types';
import { generateForBlock, generateExtra, GENERATION_FAILED } from '../../services/generateDispatch';
import { REGISTRY } from '../../config/exerciseRegistry';
import { baseApply } from '../../config/baseSettings';
import { resolveInstruction } from '../../config/instructionPresets';
import { generateMixedOne, mixedKey } from '../../services/math/mixedGenerator';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import type { BlocksSlice, WorksheetState } from '../types';
import { commitBlocks } from './historySlice';
import { classifyUpdate, filterLockedUpdates } from '../blockRules';

export const createBlocksSlice: StateCreator<WorksheetState, [], [], BlocksSlice> = (set) => ({
    blocks: [],
    staleBlocks: {},

    setExercises: (id, field, data) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, [field]: data } : b); const { [id]: _drop, ...stale } = state.staleBlocks; void _drop; return { ...commitBlocks(state, nb), staleBlocks: stale }; }),

    setGenerationNote: (id, note) => set((state) => ({
        blocks: state.blocks.map(b => (b.id === id ? { ...b, generationNote: note } : b)),
    })),

    addBlockFromType: (typeId, label, overrideConstraints, opts) => set((state) => {
        // All per-type defaults live in the registry. The appstructure leaf's
        // defaultConstraints (e.g. { numberType:'decimal' }) arrive as
        // overrideConstraints and are merged on top.
        const def = REGISTRY[typeId];
        const defaultConstraints = def ? def.defaultConstraints(typeId) : {};
        // Snapshot the global base difficulty onto this block's constraints.
        // Order matters: registry defaults → base snapshot → leaf override, so a
        // leaf that pins a value (e.g. splitsen-basis maxGetal:10) always wins.
        const baseSnapshot = def ? baseApply(state.baseSettings, defaultConstraints) : {};
        const mergedConstraints = { ...defaultConstraints, ...baseSnapshot, ...overrideConstraints } as BlockConstraints;

        const newBlock: MathBlock = {
            id: Math.random().toString(36).substring(2, 9),
            typeId,
            leafId: opts?.leafId,
            instructionText: resolveInstruction(opts?.instruction, typeId, label, mergedConstraints),
            instructionMode: 'geen',
            layoutPreset: 'inline-short',
            steppedLines: 3,
            numberOfExercises: def ? def.defaultCount : 10,
            totalPoints: 5,
            // Writing room between exercises. 14 was tight for a 7-year-old's handwriting;
            // teachers can still dial it 8-40 per block under Opmaak.
            verticalSpacing: 18,
            constraints: mergedConstraints,
            exercises: []
        };

        // Generate straight away: an empty block tells the teacher nothing about the
        // exercise they just picked, and every add was followed by a Genereer click anyway.
        // A generator that throws must not take the whole add down with it.
        if (def) {
            try {
                const generated = generateForBlock(newBlock, state.docSettings.uniqueExercises ?? true);
                (newBlock as unknown as Record<string, unknown>)[def.exerciseField] = generated.items;
                newBlock.generationNote = generated.note;
            } catch (err) {
                // An empty block used to be the only sign that a generator had thrown, and
                // nobody could tell it from "the settings allow nothing". Say so instead.
                console.warn(`[rekenraak] generator for ${typeId} threw`, err);
                newBlock.generationNote = `${GENERATION_FAILED} ${err instanceof Error ? err.message : String(err)}`;
            }
        }

        const newBlocks = [...state.blocks, newBlock];
        // Same rule as setActiveSelection: a fresh block opens its own settings, otherwise a
        // teacher who added it from the Blad tab sees nothing change on the right.
        return { ...commitBlocks(state, newBlocks), activeBlockId: newBlock.id, inspectorTab: 'oefening' };
    }),

    removeBlock: (id) => set((state) => {
        const newBlocks = state.blocks.filter(b => b.id !== id);
        return { ...commitBlocks(state, newBlocks), activeBlockId: state.activeBlockId === id ? null : state.activeBlockId };
    }),

    // Wipe all blocks at once. Pushes history so Ctrl+Z restores them (guarded by a confirm in the UI).
    clearBlocks: () => set((state) => ({ ...commitBlocks(state, []), activeBlockId: null })),

    moveBlockUp: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index <= 0) return state;
        const newBlocks = [...state.blocks];
        [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
        return commitBlocks(state, newBlocks);
    }),

    moveBlockDown: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1 || index === state.blocks.length - 1) return state;
        const newBlocks = [...state.blocks];
        [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        return commitBlocks(state, newBlocks);
    }),

    // Drag-reorder from the Overzicht outline: move one block to an arbitrary index.
    // Order isn't frozen by curriculum lock (move-up/down already work locked).
    reorderBlocks: (fromIndex, toIndex) => set((state) => {
        const n = state.blocks.length;
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= n || toIndex >= n) return state;
        const newBlocks = [...state.blocks];
        const [moved] = newBlocks.splice(fromIndex, 1);
        newBlocks.splice(toIndex, 0, moved);
        return commitBlocks(state, newBlocks);
    }),

    // Sheet drag-and-drop drops a block on the BOTTOM half of another: the two trade
    // places instead of one shuffling past the other. Like reorderBlocks it survives the
    // curriculum lock — order is presentation, not difficulty.
    swapBlocks: (idA, idB) => set((state) => {
        if (idA === idB) return state;
        const a = state.blocks.findIndex(b => b.id === idA);
        const b = state.blocks.findIndex(bl => bl.id === idB);
        if (a === -1 || b === -1) return state;
        const newBlocks = [...state.blocks];
        [newBlocks[a], newBlocks[b]] = [newBlocks[b], newBlocks[a]];
        return commitBlocks(state, newBlocks);
    }),

    // Curriculum lock is enforced at the store — the single choke point all ~12
    // config plugins + Inspector route through. Wording/layout edits are frozen;
    // only block count + page-break survive (parent can adjust amount + regenerate).
    updateBlockInstruction: (id, text) => set((state) => { if (state.curriculum?.locked) return state; const nb = state.blocks.map(b => b.id === id ? { ...b, instructionText: text } : b); return commitBlocks(state, nb); }),
    updateBlockLayout: (id, layout, steppedLines) => set((state) => { if (state.curriculum?.locked) return state; const nb = state.blocks.map(b => b.id === id ? { ...b, layoutPreset: layout, steppedLines: steppedLines ?? b.steppedLines } : b); return commitBlocks(state, nb); }),
    updateBlockSettings: (id, updates) => set((state) => {
        // Curriculum-builder draft blocks live off-sheet — edit them directly, no
        // history, no lock gate (authoring runs unlocked).
        if (state.draftBlocks.some(b => b.id === id)) {
            return { draftBlocks: state.draftBlocks.map(b => b.id === id ? { ...b, ...updates } : b) };
        }
        const prevConstraints = state.blocks.find(b => b.id === id)?.constraints;
        let next = updates;
        if (state.curriculum?.locked) {
            const allowed = filterLockedUpdates(updates, prevConstraints);
            if (!allowed) return state;
            next = allowed;
        }
        const { countOnly, marksStale } = classifyUpdate(next, prevConstraints);
        const nb = state.blocks.map(b => {
            if (b.id !== id) return b;
            const merged = { ...b, ...next } as MathBlock;
            if (!countOnly) return merged;
            const def = REGISTRY[b.typeId];
            if (!def) return merged;
            const field = def.exerciseField as keyof MathBlock;
            const current = (b[field] as unknown as Array<unknown>) ?? [];
            const want = merged.numberOfExercises || 0;
            if (current.length === 0 || want === current.length) return merged;
            if (want < current.length) {
                return { ...merged, [field]: current.slice(0, want) } as MathBlock;
            }
            try {
                // One top-up policy for the whole app: generateExtra keeps what is there and
                // dedupes/pads the tail exactly like a first generate.
                const { items, note } = generateExtra(merged, current, want, state.docSettings.uniqueExercises ?? true);
                return { ...merged, [field]: items, generationNote: note } as MathBlock;
            } catch { return merged; }
        });
        const stale = marksStale ? { ...state.staleBlocks, [id]: true } : state.staleBlocks;
        return { ...commitBlocks(state, nb), staleBlocks: stale };
    }),
    updateExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return commitBlocks(state, nb); }),
    updateCijferExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, cijferExercises: (b.cijferExercises || []).map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return commitBlocks(state, nb); }),
    patchExercise: (blockId, field, exerciseId, patch) => set((state) => { const nb = state.blocks.map(b => { if (b.id !== blockId) return b; const arr = b[field] as Array<{ id: string }> | undefined; if (!Array.isArray(arr)) return b; return { ...b, [field]: arr.map(ex => ex.id === exerciseId ? { ...ex, ...patch } : ex) }; }); return commitBlocks(state, nb); }),
    // Regenerates exactly one exercise for a chosen variant (operator + optional preset),
    // e.g. switching one sum in a 'gemengd' block from + to ×. `avoid` is built from every
    // OTHER exercise's key (mixedKey: operands + operator) so the new one can't duplicate
    // a sibling. Allowed under curriculum lock — same reasoning as "Genereer": it replaces
    // content within settings the teacher already fixed, it doesn't change them.
    regenerateExercise: (blockId, exerciseId, variant) => set((state) => {
        const nb = state.blocks.map(b => {
            if (b.id !== blockId) return b;
            const idx = b.exercises.findIndex(ex => ex.id === exerciseId);
            if (idx === -1) return b;
            const avoid = new Set(
                b.exercises.filter((_, i) => i !== idx).map(mixedKey)
            );
            const generated = generateMixedOne(b, variant, avoid);
            if (!generated) {
                // Generator found nothing for this variant under the block's current
                // settings — leave the exercise as-is and surface why, rather than
                // silently keeping the old (now-mismatched) operator on screen.
                return { ...b, generationNote: 'Geen oefening mogelijk voor deze bewerking bij deze instellingen.' };
            }
            const exercises = b.exercises.map((ex, i) =>
                i === idx ? { ...generated, id: ex.id, isManuallyEdited: false } : ex
            );
            return { ...b, exercises, generationNote: null };
        });
        return commitBlocks(state, nb);
    }),
    toggleBlockLock: (id) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, locked: !b.locked } : b) })),
    // One set(), one history entry: a per-block setExercises loop made "Genereer alles"
    // cost one Ctrl+Z per block to undo, which nobody reads as a single action.
    generateAllBlocks: () => set((state) => {
        const unique = state.docSettings.uniqueExercises ?? true;
        const stale = { ...state.staleBlocks };
        const nb = state.blocks.map(block => {
            const def = REGISTRY[block.typeId];
            if (block.locked || !def) return block;
            try {
                const { items, note } = generateForBlock(block, unique);
                delete stale[block.id];
                return { ...block, [def.exerciseField]: items, generationNote: note } as MathBlock;
            } catch (err) {
                // One throwing generator must not cost the other blocks their regenerate.
                console.warn(`[rekenraak] generator for ${block.typeId} threw`, err);
                return { ...block, generationNote: `${GENERATION_FAILED} ${err instanceof Error ? err.message : String(err)}` };
            }
        });
        return { ...commitBlocks(state, nb), staleBlocks: stale };
    }),
    duplicateBlock: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1) return state;
        const src = state.blocks[index];
        const clone: MathBlock = JSON.parse(JSON.stringify(src));
        clone.id = Math.random().toString(36).substring(2, 9);
        clone.locked = false;
        const newBlocks = [...state.blocks.slice(0, index + 1), clone, ...state.blocks.slice(index + 1)];
        return { ...commitBlocks(state, newBlocks), activeBlockId: clone.id };
    }),

    // "Blok splitsen": the teacher decides where a block breaks, because the packer never
    // will — a block that does not fit the rest of a page moves whole to the next one and
    // leaves a blank tail. Splitting after exercise N puts the first N on the page that
    // still has room and the rest in a second block right behind it.
    //
    // Manual on purpose (owner decision 2026-09-12): an automatic split would renumber
    // and re-title a teacher's opdracht behind their back.
    splitBlock: (id, atIndex) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1) return state;
        const src = state.blocks[index];
        // Sheet furniture (a rule, writing lines, a grid) holds no exercises to cut.
        if (src.typeId.startsWith('layout-')) return state;
        // The registry names the array this type generates into — never hardcode 'exercises'.
        const field = REGISTRY[src.typeId]?.exerciseField;
        if (!field) return state;
        const items = (src[field] as unknown[] | undefined) ?? [];
        // Nothing to split below two, and the cut must leave both halves non-empty.
        if (items.length < 2) return state;
        if (!Number.isInteger(atIndex) || atIndex < 1 || atIndex > items.length - 1) return state;

        const head: MathBlock = { ...src, [field]: items.slice(0, atIndex), numberOfExercises: atIndex };
        const tail: MathBlock = JSON.parse(JSON.stringify({ ...src, [field]: items.slice(atIndex) }));
        const used = new Set(state.blocks.map(b => b.id));
        do { tail.id = Math.random().toString(36).substring(2, 9); } while (used.has(tail.id));
        tail.numberOfExercises = items.length - atIndex;
        // The page break belonged to where the ORIGINAL block started; the tail must be
        // free to flow onto the next page, which is the whole point of splitting.
        tail.pageBreakBefore = false;

        const newBlocks = [...state.blocks.slice(0, index), head, tail, ...state.blocks.slice(index + 1)];
        return commitBlocks(state, newBlocks);
    }),
});
