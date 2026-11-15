import { useSyncExternalStore } from 'react';
import type { MathBlock } from '../../services/math/types';
import type { QrPart } from '../../services/layout/pagePacker';
import { encodeTutorPage, tutorPageMarks } from '../../services/oefenen/tutorPayload';
import { blockHasTutorSteps, exercisesOf, stepsFor } from '../../services/stepsAvailability';
import { tutorQrMatrix, tutorQrPick } from './tutorQrPick';
import { tutorOefenRow } from './tutorOefen';

// The stappenhulp split line (PackedPage.qrSplit): a page whose sums overflow one QR gets a
// second code on a line between two blocks. Each code is a normal tutor payload of its own
// part of the page; this module turns packer parts into those payloads, for the packer's
// decision (App) and for the codes it draws (SheetPages), so both read the same bytes.

// The sheet's own rule for the stappenhulp QR: steps under the block's own settings. An
// undefined exercise is a placeholder for a sum printed above the line.
export const tutorHasSteps = (block: MathBlock, ex: unknown) => ex !== undefined && stepsFor(block.typeId, ex, block.constraints) !== null;

function tutorBlocksOf(parts: QrPart[], blockOrder: Record<string, number | null>, more = false) {
    return parts.map(({ block, from = 0, to }) => {
        const all = exercisesOf(block);
        // Leading placeholders keep a cut block's sums on their printed labels (k, l, m ...).
        const exercises = [...new Array<undefined>(from).fill(undefined), ...all.slice(from, to ?? all.length)];
        // "Nog meer van deze oefening": the block's Oefenmodus settings, only for blocks the QR carries.
        const oefen = more && blockHasTutorSteps(block) ? tutorOefenRow(block) : null;
        return { block, n: blockOrder[block.id] ?? null, title: block.instructionText ?? '', exercises, oefen };
    });
}

// Payload → fits one QR in full. A QR build is ~6–10 ms and the packer asks a few times per
// page on every repack; the answer only changes with the payload.
const fitsCache = new Map<string, boolean>();

/** The packer's question: do these exercises fit one QR in full (no steps = nothing to fit). */
export function tutorQrFits(blockOrder: Record<string, number | null>, grade: number | null) {
    return (parts: QrPart[]): boolean => {
        const payload = encodeTutorPage(tutorBlocksOf(parts, blockOrder), tutorHasSteps, { grade });
        if (!payload) return true;
        let ok = fitsCache.get(payload);
        if (ok === undefined) {
            ok = tutorQrMatrix(payload) !== null;
            if (fitsCache.size > 512) fitsCache.clear();
            fitsCache.set(payload, ok);
        }
        return ok;
    };
}

export interface TutorQrSegment {
    payload: string | null;
    lean: string | null;
    /** The full list plus the blocks' Oefenmodus settings, preferred when it fits. */
    more: string | null;
    /** Per block id: which of its exercises this code opens with steps (only this segment's indexes set). */
    marks: Map<string, boolean[]>;
}

/** One code's payloads (with settings, full, lean: tutorQrPick's chain) and the marks they promise. */
export function tutorQrSegment(parts: QrPart[], blockOrder: Record<string, number | null>, grade: number | null, moreOefenen = false): TutorQrSegment {
    const tutorBlocks = tutorBlocksOf(parts, blockOrder, moreOefenen);
    const payload = encodeTutorPage(tutorBlocks, tutorHasSteps, { grade });
    const lean = encodeTutorPage(tutorBlocks, tutorHasSteps, { greyed: false, grade });
    const more = moreOefenen ? encodeTutorPage(tutorBlocks, tutorHasSteps, { grade, oefen: true }) : null;
    const pick = tutorQrPick(payload, lean, more);
    const marks = new Map<string, boolean[]>();
    if (pick) {
        tutorPageMarks(tutorBlocks, tutorHasSteps, { greyed: pick !== 'lean' }).forEach((mask, i) => {
            marks.set(tutorBlocks[i].block.id, mask);
        });
    }
    return { payload, lean, more, marks };
}

/** Per block: 'all' = one mark by the title, a '0101' mask = per sum, absent = none (SheetBlock stepsMarks). */
export function mergeTutorMarks(blocks: MathBlock[], segments: TutorQrSegment[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const block of blocks) {
        const count = exercisesOf(block).length;
        const mask = new Array<boolean>(count).fill(false);
        for (const seg of segments) seg.marks.get(block.id)?.forEach((m, i) => { if (m && i < count) mask[i] = true; });
        if (!mask.some(Boolean)) continue;
        // A hidden title has nowhere to carry the block mark, so its sums carry their own.
        const titled = block.showInstruction !== false;
        out.set(block.id, titled && mask.every(Boolean) ? 'all' : mask.map(m => (m ? '1' : '0')).join(''));
    }
    return out;
}

// Which pages (1-based) carry a split line, for the Inspector's note next to the QR switch.
// Module scope like hoveredBlock.ts: App writes it after packing, only the note subscribes.
let splitPages: number[] = [];
const listeners = new Set<() => void>();
export function setTutorQrSplitPages(pages: number[]) {
    if (pages.length === splitPages.length && pages.every((p, i) => p === splitPages[i])) return;
    splitPages = pages;
    listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useTutorQrSplitPages(): number[] {
    return useSyncExternalStore(subscribe, () => splitPages);
}

// The teacher's warning, on the page itself and (with page numbers) next to the QR switch.
export const SPLIT_NOTE = 'Deze pagina heeft veel sommen: er komt een tweede QR-code midden op het blad.';
export function splitNoteFor(pages: number[]): string | null {
    if (pages.length === 0) return null;
    if (pages.length === 1) return `Pagina ${pages[0]} heeft veel sommen: er komt een tweede QR-code midden op het blad.`;
    const list = `${pages.slice(0, -1).join(', ')} en ${pages[pages.length - 1]}`;
    return `Pagina ${list} hebben veel sommen: er komt telkens een tweede QR-code midden op het blad.`;
}
