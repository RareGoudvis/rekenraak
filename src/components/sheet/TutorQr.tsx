import { useMemo } from 'react';
import { QR_QUIET, qrMatrixOrNull, qrVersionOf } from '../../services/qr';
import { TUTOR_HASH_PREFIX, tutorUrlFor } from '../../services/oefenen/tutorPayload';

// 26 mm at 96 dpi (26 / 25.4 × 96 ≈ 98): a full A4 page of sums (≈ 50) needs at most version 13,
// whose 69 modules + quiet zone are ≈ 0.34 mm each, about the smallest a phone reads off a laser print.
const QR_PX = 98;
const MAX_VERSION = 13;

const matrixFor = (payload: string): boolean[][] | null => {
    const matrix = qrMatrixOrNull(tutorUrlFor(window.location.origin) + TUTOR_HASH_PREFIX + payload);
    return matrix && qrVersionOf(matrix) <= MAX_VERSION ? matrix : null;
};

// The stappenhulp QR in a page's footer. Every page reserves the box, even without sums, so
// switching pages never changes a footer's height (the packer would chase its own tail).
// lean: the same page without its no-steps sums, used when the full list does not fit.
export default function TutorQr({ payload, lean, caption = true }: { payload: string | null; lean?: string | null; caption?: boolean }) {
    const matrix = useMemo(() => (payload ? matrixFor(payload) ?? (lean ? matrixFor(lean) : null) : null), [payload, lean]);
    const tooBig = !!payload && !matrix;
    const box = { width: `${QR_PX}px`, height: `${QR_PX}px`, flex: 'none' as const, position: 'relative' as const };
    // The frame (border + caption) is drawn on every page, so all footers keep one height.
    const frame = (inner: React.ReactNode) => (
        <div className="tutor-qr-box">
            {caption && <span className="tutor-qr-caption">Vast? Scan de code en bekijk de stappen.</span>}
            {inner}
        </div>
    );
    if (!matrix || tooBig) {
        return frame(
            <div style={box}>
                {tooBig && <span className="no-print tutor-qr-note">Te veel sommen op deze pagina voor de QR-code</span>}
            </div>,
        );
    }
    const n = matrix.length + 2 * QR_QUIET;
    let d = '';
    matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + QR_QUIET} ${r + QR_QUIET}h1v1h-1z`; }));
    return frame(
        <svg style={box} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR-code voor de stappenhulp">
            <rect width={n} height={n} fill="#fff" />
            <path d={d} fill="#000" />
        </svg>,
    );
}
