import { useMemo } from 'react';
import { QR_QUIET } from '../../services/qr';
import { tutorQrMatrix, tutorQrPayloadOf, tutorQrPick } from './tutorQrPick';
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
// more: the full list plus the blocks' Oefenmodus settings, preferred when it fits (tutorQrPick).
// legend: the footsteps mark sits on the sheet's sums, so the caption says what it means (glyph alone without a caption).
export default function TutorQr({ payload, lean, more, caption = true, captionText, legend = false }: { payload: string | null; lean?: string | null; more?: string | null; caption?: boolean; captionText?: string; legend?: boolean }) {
    const matrix = useMemo(() => {
        const data = tutorQrPayloadOf(tutorQrPick(payload, lean ?? null, more ?? null), { payload, lean, more });
        return data ? tutorQrMatrix(data) : null;
    }, [payload, lean, more]);
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
    return frame(<QrSvg matrix={matrix} style={box} />);
}

function QrSvg({ matrix, style }: { matrix: boolean[][]; style: React.CSSProperties }) {
    const n = matrix.length + 2 * QR_QUIET;
    let d = '';
    matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + QR_QUIET} ${r + QR_QUIET}h1v1h-1z`; }));
    return (
        <svg style={style} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR-code voor de stappenhulp">
            <rect width={n} height={n} fill="#fff" />
            <path d={d} fill="#000" />
        </svg>
    );
}

// The split line's row is exactly the bare code's height, so the packer reserves a known box (no measuring needed).
export const TUTOR_QR_LINE_PX = QR_PX;

// The stappenhulp split line (PackedPage.qrSplit): a rule across the page with a bare code at its right
// end, the same size as the footer code, for the sums above it. `note` is the teacher's screen-only warning.
export function TutorQrLine({ top, width, payload, lean, more, note }: { top: number; width: number; payload: string | null; lean?: string | null; more?: string | null; note?: string }) {
    const matrix = useMemo(() => {
        const data = tutorQrPayloadOf(tutorQrPick(payload, lean ?? null, more ?? null), { payload, lean, more });
        return data ? tutorQrMatrix(data) : null;
    }, [payload, lean, more]);
    const box = { width: `${QR_PX}px`, height: `${QR_PX}px`, flex: 'none' as const, position: 'relative' as const };
    return (
        <div className="tutor-qr-line" data-sheet-extra="qr-line" style={{ top: `${top}px`, width: `${width}px`, height: `${TUTOR_QR_LINE_PX}px` }}>
            <div className="tutor-qr-line-rule" />
            {note && <span className="no-print tutor-qr-line-note" onClick={(e) => e.stopPropagation()}>{note}</span>}
            {matrix ? <QrSvg matrix={matrix} style={box} /> : (
                <div style={box}>{payload && <span className="no-print tutor-qr-note">Te veel sommen voor deze QR-code</span>}</div>
            )}
        </div>
    );
}
