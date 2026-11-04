import { describe, it, expect } from 'vitest';
import { qrMatrix, qrMatrixOrNull, qrVersionOf } from '../services/qr';

// Finder pattern: 7x7 dark ring, light ring, 3x3 dark core.
function expectFinder(m: boolean[][], r0: number, c0: number) {
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
            const ring = r === 0 || r === 6 || c === 0 || c === 6;
            const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            expect(m[r0 + r][c0 + c]).toBe(ring || core);
        }
    }
}

describe('qr', () => {
    it('encodes a short URL as version 2 with three finder patterns', () => {
        const m = qrMatrix('https://example.com');
        expect(m.length).toBe(m[0].length);
        expect(qrVersionOf(m)).toBe(2);
        expect(m.length).toBe(17 + 4 * 2);
        expectFinder(m, 0, 0);
        expectFinder(m, 0, m.length - 7);
        expectFinder(m, m.length - 7, 0);
    });

    it('has the fixed dark module and the timing pattern', () => {
        const m = qrMatrix('https://example.com');
        expect(m[m.length - 8][8]).toBe(true);
        for (let i = 8; i < m.length - 8; i++) expect(m[6][i]).toBe(i % 2 === 0);
    });

    it('grows the version with the payload and gives null past version 40', () => {
        const v = (s: string) => qrVersionOf(qrMatrix(s));
        expect(v('a'.repeat(200))).toBeGreaterThan(v('a'.repeat(20)));
        expect(qrMatrixOrNull('a'.repeat(3000))).toBeNull();
    });

    it('codes an upper-case tail in alphanumeric mode: smaller than the same length in lower case', () => {
        const v = (s: string) => qrVersionOf(qrMatrix(s));
        const payload = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(12);
        expect(v(`https://x.be/o.html#oefen=${payload}`)).toBeLessThan(v(`https://x.be/o.html#oefen=${payload.toLowerCase()}`));
    });
});
