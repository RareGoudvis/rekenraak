import { describe, test, expect } from 'vitest';
import {
    BOARD_CM_PX, BOARD_MM_PX, GEO, LAT, PASSER, bodyPolygon, defaultInstrument, formatCm, instrumentEdges, nearestEdge,
    normDeg, pageInstrumentGeometry, passerHinge, pathEndpoints, projectOnEdge, protractorAngle, round1, snapPoint, snapRotation,
    startGuidedLine, strokeEndpoints, toLocal, toWorld,
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

describe('lat: drawing along an edge', () => {
    const lat = (x = 100, y = 200, rotation = 0) => ({ id: 'l', kind: 'lat' as const, x, y, rotation });
    const ctxOf = (...insts: ReturnType<typeof lat>[]) => ({ gridSnap: false, gridSize: 40, instrument: pageInstrumentGeometry(insts) });

    test('two edges: the measuring edge (zero at the reference point) and the back edge', () => {
        const [top, back] = instrumentEdges(lat());
        close(top.zx, 100); close(top.zy, 200);
        close(top.ax, 100 - LAT.pad); close(top.bx, 100 + 20 * BOARD_CM_PX + LAT.pad);
        expect([top.nx, top.ny].map(Math.round)).toEqual([0, -1]);
        close(back.zy, 200 + LAT.h);
        expect(Math.round(back.ny)).toBe(1);
    });

    test('edges turn with the instrument', () => {
        const [top] = instrumentEdges(lat(0, 0, 90));
        close(top.bx, 0, 1e-9); close(top.by, 20 * BOARD_CM_PX + LAT.pad);
        close(top.nx, 1); close(top.ny, 0, 1e-9);
    });

    test('nearestEdge: within 10 px of the edge and beside it, closest wins', () => {
        const edges = instrumentEdges(lat());
        expect(nearestEdge(edges, 300, 191)).toBe(edges[0]);
        expect(nearestEdge(edges, 300, 209)).toBe(edges[0]);
        expect(nearestEdge(edges, 300, 189)).toBeNull();
        expect(nearestEdge(edges, 300, 200 + LAT.h + 4)).toBe(edges[1]);
        // past the end of the plastic (+10 px slack) nothing guides
        expect(nearestEdge(edges, 100 + 20 * BOARD_CM_PX + LAT.pad + 12, 200)).toBeNull();
        expect(nearestEdge(edges, 100 - LAT.pad - 5, 200)).toBe(edges[0]);
    });

    test('projectOnEdge: onto the edge, on whole mm from zero, never past the plastic', () => {
        const [top] = instrumentEdges(lat());
        const p = projectOnEdge(top, 100 + 5 * BOARD_CM_PX + 1.2, 205);
        close(p.t, 50 * BOARD_MM_PX); close(p.y, 200); close(p.x, 100 + 50 * BOARD_MM_PX);
        close(projectOnEdge(top, 5000, 200).x, 100 + 20 * BOARD_CM_PX + LAT.pad);
        close(projectOnEdge(top, -5000, 200).t, -LAT.pad);
    });

    test('startGuidedLine: a wobbly drag becomes one straight M…L stroke on the edge with a cm readout', () => {
        const g = startGuidedLine(ctxOf(lat()), 101, 194)!;
        expect(g.to(150, 207).path).toMatch(/^M 100 200 L [\d.]+ 200$/);
        const seg = g.to(100 + 5 * BOARD_CM_PX + 0.8, 196);
        expect(seg.path).toBe(`M 100 200 L ${round1(100 + 5 * BOARD_CM_PX)} 200`);
        expect(seg.readout.text).toBe('5,0 cm');
        expect(seg.readout.y).toBeLessThan(200);
        expect(pathEndpoints(seg.path)).toEqual([100, 200, round1(100 + 5 * BOARD_CM_PX), 200]);
        // eraser samples cover the whole segment, both ends included
        expect(seg.pts.slice(0, 2)).toEqual([100, 200]);
        expect(seg.pts.slice(-2)).toEqual([round1(100 + 5 * BOARD_CM_PX), 200]);
        expect(seg.pts.length / 2).toBeGreaterThan(30);
    });

    test('a tap on the edge leaves a dot on the nearest mm; a rotated lat draws along its angle', () => {
        const g = startGuidedLine(ctxOf(lat()), 100 + 3 * BOARD_CM_PX + 1, 203)!;
        expect(g.to(100 + 3 * BOARD_CM_PX + 1, 203).path).toBe(`M ${round1(100 + 3 * BOARD_CM_PX)} 200 l 0.01 0`);
        const r = startGuidedLine(ctxOf(lat(0, 0, 45)), 2, -1)!;
        const seg = r.to(150, 160);
        const e = pathEndpoints(seg.path)!;
        close(e[2], e[3], 0.11);           // on the 45° line
        expect(seg.readout.text).toMatch(/^\d+,\d cm$/);
    });

    test('nothing near an edge (or no instruments) → freehand', () => {
        expect(startGuidedLine(ctxOf(lat()), 300, 260)).toBeNull();
        expect(startGuidedLine({ gridSnap: false, gridSize: 40 }, 100, 200)).toBeNull();
        expect(startGuidedLine(ctxOf(), 100, 200)).toBeNull();
    });

    test('a lat and a geodriehoek on one page: every edge guides', () => {
        const geo = { id: 'g', kind: 'geodriehoek' as const, x: 600, y: 600, rotation: 0 };
        expect(pageInstrumentGeometry([lat(), geo]).edges).toHaveLength(5);
        expect(pageInstrumentGeometry([lat(), geo]).protractors).toEqual([{ x: 600, y: 600, rotation: 0 }]);
    });

    test('formatCm: Dutch decimal comma, one decimal', () => {
        expect(formatCm(5 * BOARD_CM_PX)).toBe('5,0 cm');
        expect(formatCm(-12.5 * BOARD_CM_PX)).toBe('12,5 cm');
        expect(formatCm(0)).toBe('0,0 cm');
    });
});

describe('geodriehoek: edges, protractor, rays', () => {
    const geo = (x = 500, y = 300, rotation = 0) => ({ id: 'g', kind: 'geodriehoek' as const, x, y, rotation });
    const ctxOf = (g = geo()) => ({ gridSnap: false, gridSize: 40, instrument: pageInstrumentGeometry([g]) });

    test('three edges: hypotenuse measured from its midpoint, legs at 45° meeting 8 cm below', () => {
        const [hyp, left, right] = instrumentEdges(geo());
        close(hyp.zx, 500); close(hyp.ax, 500 - GEO.half); close(hyp.bx, 500 + GEO.half);
        close(left.bx, 500); close(left.by, 300 + GEO.half);
        close(right.bx, 500); close(right.by, 300 + GEO.half);
        // legs are 45° to the hypotenuse and 90° to each other
        const ang = (e: typeof hyp) => (Math.atan2(e.by - e.ay, e.bx - e.ax) * 180) / Math.PI;
        close(ang(left), 45); close(ang(right), 135);
        // outward normals point away from the body
        expect(hyp.ny).toBeLessThan(0);
        expect(left.nx).toBeLessThan(0);
        expect(right.nx).toBeGreaterThan(0);
    });

    test('protractorAngle reads both scales, follows the rotation', () => {
        const a = protractorAngle(geo(), 500 + 100 * Math.cos(Math.PI / 3), 300 + 100 * Math.sin(Math.PI / 3));
        close(a.outer, 60); close(a.inner, 120);
        close(protractorAngle(geo(), 600, 300).outer, 0);
        close(protractorAngle(geo(), 400, 300).outer, 180);
        close(protractorAngle(geo(), 500, 400).outer, 90);
        // turned 45°: a point straight below the centre now reads 45 on the outer scale
        close(protractorAngle(geo(500, 300, 45), 500, 400).outer, 45);
    });

    test('a pen on the centre draws a ray at a whole degree and whole mm, readout in degrees', () => {
        const g = startGuidedLine(ctxOf(), 503, 302)!;
        const a = (60.4 * Math.PI) / 180;
        const seg = g.to(500 + 200 * Math.cos(a), 300 + 200 * Math.sin(a));
        expect(seg.readout.text).toBe('60°');
        const e = pathEndpoints(seg.path)!;
        expect(e.slice(0, 2)).toEqual([500, 300]);
        close((Math.atan2(e[3] - 300, e[2] - 500) * 180) / Math.PI, 60, 0.05);
        const len = Math.hypot(e[2] - 500, e[3] - 300);
        close(len / BOARD_MM_PX, Math.round(len / BOARD_MM_PX), 0.05);
        // the readout sits past the ray's end
        expect(Math.hypot(seg.readout.x - 500, seg.readout.y - 300)).toBeGreaterThan(len);
    });

    test('rays above the hypotenuse read their mirror angle; a rotated geodriehoek turns the ray', () => {
        const g = startGuidedLine(ctxOf(), 500, 300)!;
        expect(g.to(500, 200).readout.text).toBe('90°');
        const r = startGuidedLine(ctxOf(geo(500, 300, 45)), 500, 300)!;
        const seg = r.to(500, 450);   // straight down = 45° on a geodriehoek turned 45°
        expect(seg.readout.text).toBe('45°');
        const e = pathEndpoints(seg.path)!;
        close(e[2], 500, 0.11);
    });

    test('the centre wins over the hypotenuse it lies on; elsewhere the hypotenuse guides', () => {
        expect(startGuidedLine(ctxOf(), 500, 300)!.to(600, 330).readout.text).toMatch(/°$/);
        const seg = startGuidedLine(ctxOf(), 560, 305)!.to(700, 290);
        expect(seg.readout.text).toMatch(/ cm$/);
        expect(pathEndpoints(seg.path)![1]).toBe(300);
        expect(pathEndpoints(seg.path)![3]).toBe(300);
    });

    test('a leg guides too: the stroke stays on the 45° leg', () => {
        const seg = startGuidedLine(ctxOf(), 500 - GEO.half / 2 - 4, 300 + GEO.half / 2 + 1)!.to(500 - 20, 300 + GEO.half - 30);
        const e = pathEndpoints(seg.path)!;
        // on the left leg: y - 300 = x - (500 - half)
        close(e[1] - 300, e[0] - (500 - GEO.half), 0.15);
        close(e[3] - 300, e[2] - (500 - GEO.half), 0.15);
    });
});
