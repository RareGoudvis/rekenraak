import { describe, test, expect } from 'vitest';
import {
    BOARD_CM_PX, BOARD_MM_PX, GEO, LAT, PASSER, bodyPolygon, defaultInstrument, normDeg, passerHinge,
    pathEndpoints, snapPoint, snapRotation, strokeEndpoints, toLocal, toWorld,
} from '../board/instrumentGeometry';
import type { Stroke } from '../board/boardTypes';

// The meetinstrumenten's pure geometry (ARCHITECTURE §14): board units, transforms, the
// owner's snapping rules, endpoint extraction from stroke path data, placement.
const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);
const stroke = (path: string, pts: number[] = []): Stroke => ({ id: path, tool: 'pen', color: '#000', width: 4, path, pts });

describe('units', () => {
    test('one board cm is ten sheet mm (96 dpi)', () => {
        close(BOARD_MM_PX, 3.7795);
        close(BOARD_CM_PX, 37.795);
    });
});

describe('transforms', () => {
    test('local → board → local round-trips at any rotation', () => {
        for (const rotation of [0, 30, 45, 90, 137.5, 180, 270, 359]) {
            const inst = { x: 120, y: -40, rotation };
            const [wx, wy] = toWorld(inst, 33, -12);
            const [lx, ly] = toLocal(inst, wx, wy);
            close(lx, 33); close(ly, -12);
        }
    });

    test('rotation is clockwise on screen (y down)', () => {
        const [x, y] = toWorld({ x: 0, y: 0, rotation: 90 }, 10, 0);
        close(x, 0); close(y, 10);
    });

    test('normDeg folds into [0, 360)', () => {
        expect(normDeg(-1)).toBe(359);
        expect(normDeg(720)).toBe(0);
        expect(normDeg(361)).toBe(1);
    });
});

describe('snapRotation (0/45/90 within 3°, 15° with the grid)', () => {
    test.each([
        [2.9, false, 0, true], [-2, false, 0, true], [358, false, 0, true],
        [43, false, 45, true], [48.5, false, 48.5, false], [91, false, 90, true],
        [3.1, false, 3.1, false], [31, false, 31, false], [31, true, 30, true],
        [14, true, 15, true], [61, true, 60, true], [52, true, 52, false], [179, true, 180, true],
    ])('%s° grid=%s → %s° (snapped %s)', (deg, grid, want, snapped) => {
        const r = snapRotation(deg, grid);
        close(r.deg, want);
        expect(r.snapped).toBe(snapped);
    });
});

describe('snapPoint (8 px)', () => {
    test('nothing in reach → unchanged', () => {
        expect(snapPoint(13, 13, { gridSize: null, points: [100, 100] })).toEqual({ x: 13, y: 13, snapped: null });
    });
    test('grid points only when the grid is on', () => {
        expect(snapPoint(43, 37, { gridSize: 40, points: [] })).toEqual({ x: 40, y: 40, snapped: 'grid' });
        expect(snapPoint(43, 37, { gridSize: null, points: [] }).snapped).toBeNull();
        expect(snapPoint(49, 40, { gridSize: 40, points: [] }).snapped).toBeNull();
    });
    test('stroke endpoints always, the nearest candidate wins', () => {
        expect(snapPoint(105, 103, { gridSize: null, points: [0, 0, 100, 100] })).toEqual({ x: 100, y: 100, snapped: 'endpoint' });
        expect(snapPoint(42, 40, { gridSize: 40, points: [45, 40] })).toEqual({ x: 40, y: 40, snapped: 'grid' });
        expect(snapPoint(44, 40, { gridSize: 40, points: [45, 40] })).toEqual({ x: 45, y: 40, snapped: 'endpoint' });
    });
    test('a tie goes to the endpoint', () => {
        expect(snapPoint(42, 40, { gridSize: 40, points: [44, 40] }).snapped).toBe('endpoint');
    });
});

describe('pathEndpoints', () => {
    test.each([
        ['M 10 20 L 30 40', [10, 20, 30, 40]],
        ['M10,20L30,40L50,60', [10, 20, 50, 60]],
        ['M 1 2 Q 3 4 5 6 Q 7 8 9.5 10.5 L 11 12', [1, 2, 11, 12]],
        ['M 5 6 l 0.01 0', [5, 6, 5.01, 6]],
        ['M 0 0 h 10 v -5', [0, 0, 10, -5]],
        ['M 0 0 H 7 V 9', [0, 0, 7, 9]],
        ['M 0 0 L 10 0 L 10 10 Z', [0, 0, 0, 0]],
        ['M 100 50 A 50 50 0 0 1 50 100', [100, 50, 50, 100]],
        ['M 0 0 C 1 1 2 2 3 3 S 4 4 5 5', [0, 0, 5, 5]],
        ['M 0 0 10 10 20 0', [0, 0, 20, 0]],
        ['m 10 10 l 5 5', [10, 10, 15, 15]],
        ['M 1e1 2E1 L -3.5 .5', [10, 20, -3.5, 0.5]],
    ])('%s', (d, want) => {
        expect(pathEndpoints(d)).toEqual(want);
    });
    test.each(['', 'L 1 2', 'M 1', 'M 1 2 L 3', 'garbage'])('not a path: %j', (d) => {
        expect(pathEndpoints(d)).toBeNull();
    });
    test('strokeEndpoints: path first, sample points as the fallback, nothing for empty', () => {
        expect(strokeEndpoints([stroke('M 0 0 L 9 9'), stroke('x', [1, 2, 3, 4, 5, 6]), stroke('y', [])]))
            .toEqual([0, 0, 9, 9, 1, 2, 5, 6]);
    });
});

describe('placement and shapes', () => {
    test('defaults: each kind somewhere else on the board, passer opened 5 cm', () => {
        const lat = defaultInstrument('lat', 1920, 1000);
        const geo = defaultInstrument('geodriehoek', 1920, 1000);
        const pas = defaultInstrument('passer', 1920, 1000);
        expect(new Set([`${lat.x},${lat.y}`, `${geo.x},${geo.y}`, `${pas.x},${pas.y}`]).size).toBe(3);
        expect([lat.rotation, geo.rotation, pas.rotation]).toEqual([0, 0, 0]);
        close(pas.radius!, 5 * BOARD_CM_PX);
        // The lat is centred: its 20 cm span straddles the middle.
        close(lat.x + 10 * BOARD_CM_PX, 960, 1);
    });
    test('defaults without a measured board fall back to 1280 × 720', () => {
        expect(defaultInstrument('geodriehoek', 0, 0)).toMatchObject({ x: 640 });
    });
    test('lat body: 0.6 cm of plastic before 0 and after 20 cm, inset shrinks every side', () => {
        const b = bodyPolygon('lat');
        close(b[0], -0.6 * BOARD_CM_PX);
        close(b[2], 20.6 * BOARD_CM_PX);
        close(b[5], LAT.h);
        const i = bodyPolygon('lat', 10);
        close(i[0], b[0] + 10); close(i[1], 10); close(i[5], LAT.h - 10);
    });
    test('geodriehoek: 16 cm hypotenuse on y = 0, right angle 8 cm below the origin', () => {
        const b = bodyPolygon('geodriehoek');
        close(b[0], -GEO.half); close(b[2], GEO.half); close(b[5], 8 * BOARD_CM_PX);
        // The inset triangle's sides stay parallel at exactly `inset` from the outer ones.
        const i = bodyPolygon('geodriehoek', 10);
        close(i[1], 10);
        // distance from the inset apex to the right leg (x + y = half) is 10
        close((GEO.half - (i[4] + i[5])) / Math.SQRT2, 10);
    });
    test('passer hinge: both legs 12 cm, above the chord', () => {
        for (const r of [PASSER.minR, 5 * BOARD_CM_PX, PASSER.maxR]) {
            const [hx, hy] = passerHinge(r);
            close(Math.hypot(hx, hy), PASSER.leg);
            close(Math.hypot(hx - r, hy), PASSER.leg);
            expect(hy).toBeLessThan(0);
        }
    });
});
