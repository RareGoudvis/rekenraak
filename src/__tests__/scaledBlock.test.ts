import { describe, expect, it } from 'vitest';
import { EPS, FIT_FLOOR, SAFETY, WIDTH_FIT_FLOOR, nextZoom } from '../components/viewer/scaledBlockFit';

// jsdom cannot lay out, so the measure loop itself is unreachable from a test. What CAN
// be pinned down is the arithmetic that decides the next zoom — and that is where the
// convergence properties live.
describe('nextZoom', () => {
    it('leaves the zoom alone when the content fits', () => {
        expect(nextZoom(1, 1, 1)).toBe(1);
        expect(nextZoom(1.5, 0.8, 1)).toBe(1.5);
    });

    it('stays inside the dead-band', () => {
        expect(nextZoom(1.5, 1 + EPS, 1)).toBe(1.5);
        expect(nextZoom(1.5, 1 + EPS * 2, 1)).toBeLessThan(1.5);
    });

    it('shrinks by the overflow ratio, with the safety margin', () => {
        expect(nextZoom(1.5, 1.2, 0.7)).toBeCloseTo((1.5 / 1.2) * SAFETY, 6);
    });

    it('never rises above the applied zoom', () => {
        for (const ratio of [1.01, 1.2, 2, 10]) {
            expect(nextZoom(1, ratio, 0.7)).toBeLessThanOrEqual(1);
        }
    });

    it('honours the floor', () => {
        // Width pass, when the teacher opted in: floored at WIDTH_FIT_FLOOR.
        expect(nextZoom(1, 3, WIDTH_FIT_FLOOR)).toBe(WIDTH_FIT_FLOOR);
        // Height pass (fitToPage): may go under 1, but never under FIT_FLOOR.
        expect(nextZoom(1, 3, FIT_FLOOR)).toBe(FIT_FLOOR);
        expect(nextZoom(1, 1.2, FIT_FLOOR)).toBeCloseTo(SAFETY / 1.2, 6);
    });

    it('converges: iterating on a fixed content size reaches a fixed point', () => {
        // A block whose rendered height is `localPx * zoom` against a page budget.
        const localPx = 1400;
        const budget = 851;
        let zoom = 1;
        let steps = 0;
        for (; steps < 50; steps++) {
            const next = nextZoom(zoom, (localPx * zoom) / budget, FIT_FLOOR);
            if (next >= zoom - 1e-4) break;
            zoom = next;
        }
        expect(steps).toBeLessThan(10);
        expect(zoom).toBe(FIT_FLOOR);   // 851/1400 = 0.61 → clamped at the floor
    });

    it('converges to a zoom that fits when the floor allows it', () => {
        const localPx = 1000;
        const budget = 851;
        let zoom = 1;
        for (let i = 0; i < 50; i++) {
            const next = nextZoom(zoom, (localPx * zoom) / budget, FIT_FLOOR);
            if (next >= zoom - 1e-4) break;
            zoom = next;
        }
        expect(localPx * zoom).toBeLessThanOrEqual(budget);
        expect(zoom).toBeGreaterThan(FIT_FLOOR);
    });
});

// The width back-off is opt-in since 2026-09-13 (`constraints.fitToWidth`). ScaledBlock's
// effect is unreachable from jsdom, so what is pinned here is the decision it encodes: with
// the option OFF the requested zoom survives whatever the overflow ratio says, and with it
// ON the block shrinks, but never past 0.85. A quarter-width block quietly rendering at 77%
// beside an identical half-width one at 100% is the bug this replaced.
describe('the width fit is opt-in', () => {
    // The one line of ScaledBlock's effect that decides the width back-off.
    const widthStep = (applied: number, ratio: number, fitToWidth: boolean) =>
        (fitToWidth ? nextZoom(applied, ratio, WIDTH_FIT_FLOOR) : applied);

    it('leaves the requested zoom alone when fitToWidth is off', () => {
        for (const ratio of [1.01, 1.22, 2, 4]) {
            expect(widthStep(1, ratio, false)).toBe(1);
            expect(widthStep(1.3, ratio, false)).toBe(1.3);
        }
    });

    it('shrinks only when fitToWidth is on, and not below the floor', () => {
        // The owner's case: 199px of content in a 163px quarter cell.
        expect(widthStep(1, 199 / 163, true)).toBeCloseTo(WIDTH_FIT_FLOOR, 6);
        expect(widthStep(1, 1.05, true)).toBeCloseTo(SAFETY / 1.05, 6);
        expect(widthStep(1, 10, true)).toBe(WIDTH_FIT_FLOOR);
    });

    it('floors the width fit higher than the height fit — 0.85, not 0.7', () => {
        expect(WIDTH_FIT_FLOOR).toBeGreaterThan(FIT_FLOOR);
    });
});
