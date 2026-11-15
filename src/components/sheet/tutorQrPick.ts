import { qrMatrixOrNull, qrVersionOf } from '../../services/qr';
import { TUTOR_HASH_PREFIX, tutorUrlFor } from '../../services/oefenen/tutorPayload';

// Version 13 = 69 modules in the 23 mm footer code, still read by a phone off a laser print (TutorQr).
const MAX_VERSION = 13;

// SheetPages asks which payload fits before TutorQr draws it, so one page's matrix is built once.
const matrixCache = new Map<string, boolean[][] | null>();
export const tutorQrMatrix = (payload: string): boolean[][] | null => {
    const url = tutorUrlFor(window.location.origin) + TUTOR_HASH_PREFIX + payload;
    if (!matrixCache.has(url)) {
        if (matrixCache.size > 64) matrixCache.clear();
        const matrix = qrMatrixOrNull(url);
        matrixCache.set(url, matrix && qrVersionOf(matrix) <= MAX_VERSION ? matrix : null);
    }
    return matrixCache.get(url) ?? null;
};

export type TutorQrPick = 'more' | 'full' | 'lean' | null;

// Which payload the footer QR carries: the full list with the blocks' Oefenmodus settings ("Nog meer van deze
// oefening"), the full list, the lean one (no greyed sums) when only that fits, or none. A page that cannot also
// carry the settings loses only the button, never a sum's steps.
export function tutorQrPick(payload: string | null, lean: string | null, more: string | null = null): TutorQrPick {
    if (!payload) return null;
    if (more && tutorQrMatrix(more)) return 'more';
    if (tutorQrMatrix(payload)) return 'full';
    return lean && tutorQrMatrix(lean) ? 'lean' : null;
}

/** The payload a pick stands for. */
export const tutorQrPayloadOf = (pick: TutorQrPick, { payload, lean, more }: { payload: string | null; lean?: string | null; more?: string | null }): string | null =>
    (pick === 'more' ? more : pick === 'full' ? payload : pick === 'lean' ? lean : null) ?? null;
