// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { CLOUD_SHAPES, burstParticles, cloudLayout, crackLines, driftX, snowLayout } from '../oefenen/spelen/scene/layout';
import { Burst, Clouds, CrackLines, Cracks, Snow, replay } from '../oefenen/spelen/scene';

// The scene kit: seeded geometry (clouds spread over a crossing and wrap, snow, bursts, cracks that grow)
// and the components honour reducedMotion and paused.

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Clouds', () => {
    const opts = { count: 5, seed: 7, size: [100, 180] as const, speed: 60, band: [5, 30] as const, layer: 'mid' as const };

    test('seeded: the same sky every time; sizes and heights stay in their ranges', () => {
        expect(cloudLayout(opts)).toEqual(cloudLayout(opts));
        for (const c of cloudLayout(opts)) {
            expect(c.width).toBeGreaterThanOrEqual(100);
            expect(c.width).toBeLessThanOrEqual(180);
            expect(c.top).toBeGreaterThanOrEqual(5);
            expect(c.top).toBeLessThanOrEqual(30);
            expect(c.shape).toBeLessThan(CLOUD_SHAPES.length);
            expect(c.delay).toBeLessThanOrEqual(0);
            expect(-c.delay).toBeLessThan(c.duration);
        }
    });

    test('spread over the crossing: one cloud per slice of the sky at the start', () => {
        const spread = cloudLayout(opts).map(c => -c.delay / c.duration).sort();
        spread.forEach((p, i) => { expect(p).toBeGreaterThanOrEqual(i / 5); expect(p).toBeLessThan((i + 1) / 5); });
    });

    test('the far layer is smaller and slower than the near one', () => {
        const far = cloudLayout({ ...opts, layer: 'far' });
        const near = cloudLayout({ ...opts, layer: 'near' });
        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        expect(avg(far.map(c => c.width))).toBeLessThan(avg(near.map(c => c.width)));
        expect(avg(far.map(c => c.duration))).toBeGreaterThan(avg(near.map(c => c.duration)));
    });

    test('driftX: enters at -width, leaves at the far side and wraps round', () => {
        const c = { duration: 10, delay: 0, width: 50 };
        expect(driftX(c, 0, 500)).toBe(-50);
        expect(driftX(c, 5, 500)).toBeCloseTo(225);
        expect(driftX(c, 9.999, 500)).toBeCloseTo(500, 0);
        expect(driftX(c, 10, 500)).toBe(-50);
        expect(driftX(c, 23, 500)).toBeCloseTo(driftX(c, 3, 500));
        expect(driftX(c, -3, 500)).toBeCloseTo(driftX(c, 7, 500));
        // Leftward: the mirror image.
        expect(driftX(c, 0, 500, 'left')).toBe(500);
        expect(driftX({ ...c, delay: -4 }, 0, 500)).toBeCloseTo(driftX(c, 4, 500));
    });

    test('renders one track per cloud; still when paused or with reduced motion', () => {
        const { container, rerender } = render(<Clouds count={3} />);
        expect(container.querySelectorAll('.spel-cloud-track')).toHaveLength(3);
        expect(container.querySelector('.spel-clouds.is-still')).toBeNull();
        rerender(<Clouds count={3} reducedMotion />);
        expect(container.querySelector('.spel-clouds.is-still')).not.toBeNull();
        rerender(<Clouds count={3} paused outline={false} />);
        expect(container.querySelector('.spel-clouds.is-still.is-flat')).not.toBeNull();
    });
});

describe('Snow', () => {
    test('full: already falling (negative delays); otherwise they start at the top one by one', () => {
        for (const f of snowLayout(30, 3, true)) { expect(f.delay).toBeLessThanOrEqual(0); expect(-f.delay).toBeLessThan(f.duration); }
        for (const f of snowLayout(30, 3, false)) expect(f.delay).toBeGreaterThanOrEqual(0);
        for (const f of snowLayout(30, 3, false)) { expect(f.left).toBeGreaterThanOrEqual(0); expect(f.left).toBeLessThan(100); }
    });

    test('density = flakes; stopping keeps the flakes in the air; a new start is a new snowfall', () => {
        const { container, rerender } = render(<Snow density={20} />);
        const keys = () => [...container.querySelectorAll('.spel-flake-fall')].map(e => e.getAttribute('style'));
        expect(keys()).toHaveLength(20);
        const first = keys();
        rerender(<Snow density={20} falling={false} />);
        expect(keys()).toEqual(first);
        rerender(<Snow density={20} falling />);
        expect(keys()).toHaveLength(20);
        expect(keys()).not.toEqual(first);
    });

    test('reduced motion: a few still flakes while it snows, none once it stops', () => {
        const { container, rerender } = render(<Snow density={30} reducedMotion />);
        expect(container.querySelectorAll('.spel-flake-fall')).toHaveLength(10);
        expect(container.querySelector('.spel-snow.is-still')).not.toBeNull();
        rerender(<Snow density={30} reducedMotion falling={false} />);
        expect(container.querySelector('.spel-snow')).toBeNull();
    });
});

describe('Burst', () => {
    test('splash and pieces fly up first; sparkles and smoke go all round', () => {
        for (const kind of ['splash', 'pieces'] as const) {
            for (const p of burstParticles(kind, 1, 80)) { expect(p.dy).toBeLessThanOrEqual(1); expect(p.fall).toBeGreaterThan(0); }
        }
        const around = burstParticles('sparkle', 1, 80);
        expect(around.some(p => p.dy > 0)).toBe(true);
        expect(around.some(p => p.dy < 0)).toBe(true);
        for (const p of burstParticles('sparkle', 1, 80)) expect(Math.hypot(p.dx, p.dy)).toBeLessThanOrEqual(81);
    });

    test('calls onDone after its particles; reduced motion draws nothing and is done at once', () => {
        vi.useFakeTimers();
        const done = vi.fn();
        const { container } = render(<Burst kind="sparkle" x={10} y="50%" onDone={done} />);
        expect(container.querySelectorAll('.spel-particle').length).toBe(9);
        act(() => { vi.advanceTimersByTime(100); });
        expect(done).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(2000); });
        expect(done).toHaveBeenCalledTimes(1);
        const still = vi.fn();
        const r = render(<Burst kind="smoke" x={0} y={0} reducedMotion onDone={still} />);
        expect(r.container.querySelector('.spel-burst')).toBeNull();
        act(() => { vi.advanceTimersByTime(0); });
        expect(still).toHaveBeenCalledTimes(1);
    });
});

describe('Cracks', () => {
    test('seeded, inside the box; stage 2 keeps every stage-1 line and adds more', () => {
        const segs = crackLines(120, 60, 9);
        expect(segs).toEqual(crackLines(120, 60, 9));
        for (const s of segs) for (const [x, y] of s.points) {
            expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(120);
            expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(60);
        }
        const one = segs.filter(s => s.stage === 1);
        expect(one.length).toBe(3);
        expect(segs.filter(s => s.stage === 2).length).toBeGreaterThan(one.length);
        // A stage-2 extension starts where its stage-1 crack ended: the crack grows, it does not jump.
        const a = segs.find(s => s.key === 'm0a')!;
        const b = segs.find(s => s.key === 'm0b')!;
        expect(b.points[0]).toEqual(a.points[a.points.length - 1]);
    });

    test('stage 0 draws nothing; the overlay and the SVG group draw the stage\'s lines', () => {
        const { container, rerender } = render(<Cracks stage={0} />);
        expect(container.querySelector('svg')).toBeNull();
        rerender(<Cracks stage={1} shape="ellipse" />);
        expect(container.querySelectorAll('.spel-crack-ink')).toHaveLength(3);
        rerender(<Cracks stage={2} />);
        expect(container.querySelectorAll('.spel-crack-ink').length).toBeGreaterThan(3);
        const g = render(<svg><CrackLines x={10} y={20} width={60} height={30} stage={1} reducedMotion /></svg>);
        expect(g.container.querySelector('.spel-cracks.is-still')?.getAttribute('transform')).toBe('translate(10 20)');
    });
});

describe('Motions', () => {
    test('replay takes the class off and puts it back', () => {
        const el = document.createElement('div');
        el.className = 'x spel-shake';
        replay(el, 'spel-shake');
        expect(el.classList.contains('spel-shake')).toBe(true);
        expect(() => replay(null, 'spel-pop')).not.toThrow();
    });
});
