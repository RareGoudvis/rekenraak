import { useMemo } from 'react';
import { QR_QUIET } from '../../services/qr';
import { tutorQrMatrix } from './tutorQrPick';
import StepsGlyph from '../viewer/StepsGlyph';

// 23 mm at 96 dpi (23 / 25.4 × 96 ≈ 87; was 26 mm, owner 2026-11-14 "a bit smaller"): a full A4 page of sums
// (≈ 50) needs at most version 13, whose 69 modules + quiet zone are ≈ 0.30 mm each, still read by a phone off a laser print.
const QR_PX = 87;
// The line beside the QR when the teacher wrote none.
export const TUTOR_QR_CAPTION = 'Vast? Scan de code en bekijk de stappen.';
// Two short lines at most beside a 23 mm code.
export const TUTOR_QR_CAPTION_MAX = 70;

// The stappenhulp QR in a page's footer. Every page reserves the box, even without sums, so
// switching pages never changes a footer's height (the packer would chase its own tail).
// lean: the same page without its no-steps sums, used when the full list does not fit.
// legend: the footsteps mark sits on the sheet's sums, so the caption says what it means (glyph alone without a caption).
export default function TutorQr({ payload, lean, caption = true, captionText, legend = false }: { payload: string | null; lean?: string | null; caption?: boolean; captionText?: string; legend?: boolean }) {
    const matrix = useMemo(() => (payload ? tutorQrMatrix(payload) ?? (lean ? tutorQrMatrix(lean) : null) : null), [payload, lean]);
    const tooBig = !!payload && !matrix;
    const box = { width: `${QR_PX}px`, height: `${QR_PX}px`, flex: 'none' as const, position: 'relative' as const };
    // The frame (border + caption) is drawn on every page, so all footers keep one height.
    const frame = (inner: React.ReactNode) => (
        <div className="tutor-qr-box">
            {caption && (
                <span className={legend ? 'tutor-qr-caption has-legend' : 'tutor-qr-caption'}>
                    {captionText?.trim().slice(0, TUTOR_QR_CAPTION_MAX) || TUTOR_QR_CAPTION}
                    {legend && <span className="tutor-qr-legend">Oefeningen met <StepsGlyph size="1.15em" /> hebben stappen.</span>}
                </span>
            )}
            {!caption && legend && <span className="tutor-qr-legend"><StepsGlyph size="1.2em" /></span>}
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
