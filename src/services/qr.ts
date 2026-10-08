import qrcode from 'qrcode-generator';

// npm `qrcode-generator` (MIT, zero deps, ~20 kB) instead of a vendored copy: the Reed-Solomon
// tables and mask scoring are exactly the part not worth re-typing, and it only lands in the
// teacher bundle (the kiosk page never imports this file).

// Quiet zone of 4 modules is what the QR spec asks for; scanners get flaky below it.
export const QR_QUIET = 4;

// Byte mode, error level M, smallest version (1-40) that fits. Throws when the text is too long.
export function qrMatrix(text: string): boolean[][] {
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

// null when the text fits no version (callers show a "link too long" note).
export function qrMatrixOrNull(text: string): boolean[][] | null {
    try { return qrMatrix(text); } catch { return null; }
}

// Version v has 17 + 4v modules per side.
export const qrVersionOf = (matrix: boolean[][]): number => (matrix.length - 17) / 4;

// Paint onto a canvas at an integer pixel size per module; white background incl. quiet zone.
export function drawQr(canvas: HTMLCanvasElement, matrix: boolean[][], modulePx: number): void {
    const n = matrix.length;
    const size = (n + QR_QUIET * 2) * modulePx;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (matrix[r][c]) ctx.fillRect((c + QR_QUIET) * modulePx, (r + QR_QUIET) * modulePx, modulePx, modulePx);
        }
    }
}
