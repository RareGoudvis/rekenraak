import { useMemo } from 'react';
import { QR_QUIET, qrMatrixOrNull, qrVersionOf } from '../../services/qr';
import { TUTOR_HASH_PREFIX, tutorUrlFor } from '../../services/oefenen/tutorPayload';

// 30 mm at 96 dpi (30 / 25.4 × 96 ≈ 113): a full A4 page of sums (≈ 50) needs version 13, and
// version 15 (77 modules + quiet zone ≈ 0.35 mm each) is the smallest a phone still reads off a laser print.
const QR_PX = 113;
const MAX_VERSION = 15;

// The stappenhulp QR in a page's footer. Every page reserves the box, even without sums, so
// switching pages never changes a footer's height (the packer would chase its own tail).
export default function TutorQr({ payload }: { payload: string | null }) {
    const matrix = useMemo(() => (payload ? qrMatrixOrNull(tutorUrlFor(window.location.origin) + TUTOR_HASH_PREFIX + payload) : null), [payload]);
    const tooBig = !!payload && (!matrix || qrVersionOf(matrix) > MAX_VERSION);
    const box = { width: `${QR_PX}px`, height: `${QR_PX}px`, flex: 'none' as const, position: 'relative' as const };
    if (!matrix || tooBig) {
        return (
            <div style={box}>
                {tooBig && <span className="no-print tutor-qr-note">Te veel sommen op deze pagina voor de QR-code</span>}
            </div>
        );
    }
    const n = matrix.length + 2 * QR_QUIET;
    let d = '';
    matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + QR_QUIET} ${r + QR_QUIET}h1v1h-1z`; }));
    return (
        <svg style={box} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR-code voor de stappenhulp">
            <rect width={n} height={n} fill="#fff" />
            <path d={d} fill="#000" />
        </svg>
    );
}
