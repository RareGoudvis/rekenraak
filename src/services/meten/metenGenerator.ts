import type { MathBlock, MeetExercise, MeetPoint } from '../math/types';

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rad = (deg: number) => (deg * Math.PI) / 180;
const round1 = (v: number) => Math.round(v * 10) / 10;
const sum = (a: number[]) => round1(a.reduce((x, y) => x + y, 0));
// Round a measured length to the active precision (whole cm or 0,1 cm).
const roundP = (v: number, precision: string) => (precision === 'mm' ? round1(v) : Math.round(v));

// Pick a length in [min,max] cm: whole cm, or to 0,1 cm when mm-accurate.
function pickLen(min: number, max: number, precision: string): number {
    const lo = Math.max(1, Math.min(min, max));
    const hi = Math.max(lo, max);
    if (precision === 'mm') return round1(lo + Math.random() * (hi - lo));
    return randInt(Math.ceil(lo), Math.floor(hi));
}

const dist = (a: MeetPoint, b: MeetPoint) => Math.hypot(b.x - a.x, b.y - a.y);

// ── lengte meten ──────────────────────────────────────────────────────────────
export function generateLengteMetenExercises(block: MathBlock): MeetExercise[] {
    const c = block.constraints;
    const precision: string = c.precision ?? 'cm';
    const measureModel: string = c.measureModel ?? 'meten';
    const minL: number = c.minLength ?? 3;
    const maxL: number = c.maxLength ?? 10;
    const maxCorners: number = Math.min(4, Math.max(0, c.maxCorners ?? 0));
    const n = block.numberOfExercises;

    return Array.from({ length: n }, () => {
        const corners = randInt(0, maxCorners);
        const segs = corners + 1;
        const pts: MeetPoint[] = [{ x: 0, y: 0 }];
        const sides: number[] = [];
        // Walk generally rightward; each turn picks a readable angle so the path doesn't fold back.
        let heading = corners === 0 ? 0 : randInt(-30, 30);
        for (let i = 0; i < segs; i++) {
            if (i > 0) heading += [-50, -35, 35, 50][randInt(0, 3)];
            heading = Math.max(-75, Math.min(75, heading));
            const len = pickLen(minL, maxL, precision);
            sides.push(len);
            const prev = pts[pts.length - 1];
            pts.push({ x: round1(prev.x + len * Math.cos(rad(heading))), y: round1(prev.y + len * Math.sin(rad(heading))) });
        }
        const perimeter = sum(sides);

        const ex: MeetExercise = { id: rndId(), kind: 'lijn', points: pts, sides, perimeter, isManuallyEdited: false };
        // 'gegeven' → a juist/fout claim: ~50% correct, else off by a precision step.
        if (measureModel === 'gegeven') {
            const correct = Math.random() < 0.5;
            const delta = precision === 'mm' ? round1(randInt(1, 5) / 10) : randInt(1, 3);
            ex.claim = correct ? perimeter : Math.max(precision === 'mm' ? 0.1 : 1, round1(perimeter + (Math.random() < 0.5 ? -delta : delta)));
            ex.claimCorrect = ex.claim === perimeter;
        }
        return ex;
    });
}

// ── omtrek shape constructors (cm coordinates + exact side lengths) ──────────────
function regularPolygon(nSides: number, s: number): MeetPoint[] {
    const R = s / (2 * Math.sin(Math.PI / nSides));
    // Start at the bottom so the figure sits upright.
    return Array.from({ length: nSides }, (_, i) => {
        const a = rad(-90) + (2 * Math.PI * i) / nSides + Math.PI / nSides;
        return { x: round1(R + R * Math.cos(a)), y: round1(R + R * Math.sin(a)) };
    });
}

function buildShape(shape: string, min: number, max: number, precision: string): MeetExercise {
    const L = () => pickLen(min, max, precision);

    if (shape === 'cirkel') {
        const r = pickLen(Math.max(1, Math.ceil(min / 2)), Math.max(2, Math.floor(max / 2)), precision);
        return { id: rndId(), kind: 'cirkel', shape, radius: r, perimeter: round1(Math.PI * 2 * r), isManuallyEdited: false };
    }

    let pts: MeetPoint[];
    let sides: number[];   // exact intended lengths (so 'hele cm' never drifts to 0,9/1,1)

    if (shape === 'vierkant') { const s = L(); pts = [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s, y: s }, { x: 0, y: s }]; sides = [s, s, s, s]; }
    else if (shape === 'rechthoek') { const w = L(); let h = L(); if (w === h) h = Math.max(1, h + 1); pts = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]; sides = [w, h, w, h]; }
    else if (shape === 'ruit' || shape === 'parallellogram') {
        const w = L(); const hlen = shape === 'ruit' ? w : L();
        const th = rad(shape === 'ruit' ? 62 : 68); const bx = round1(hlen * Math.cos(th)), by = round1(hlen * Math.sin(th));
        pts = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: round1(w + bx), y: by }, { x: bx, y: by }];
        sides = [w, hlen, w, hlen];
    }
    else if (shape === 'driehoek') {
        let a = L(), b = L(), cc = L(), guard = 0;
        // Triangle inequality + avoid sliver triangles.
        while (!(a + b > cc && a + cc > b && b + cc > a) && guard++ < 60) { a = L(); b = L(); cc = L(); }
        // A=(0,0), B=(cc,0); C from side lengths (AB=cc, AC=b, BC=a).
        const x = round1((b * b - a * a + cc * cc) / (2 * cc));
        const y = round1(Math.sqrt(Math.max(0.01, b * b - x * x)));
        pts = [{ x: 0, y: 0 }, { x: cc, y: 0 }, { x, y }];
        sides = [cc, a, b];   // AB, BC, CA
    }
    else if (shape === 'trapezium') {
        let aBot = L(), cTop = L(), guard = 0;
        while ((aBot <= cTop || (precision !== 'mm' && (aBot - cTop) % 2 !== 0)) && guard++ < 60) { aBot = L(); cTop = L(); }
        if (aBot <= cTop) { aBot = cTop + 2; }
        const offset = (aBot - cTop) / 2;
        const leg = pickLen(Math.max(min, Math.ceil(offset + 1)), max, precision);
        const h = round1(Math.sqrt(Math.max(0.25, leg * leg - offset * offset)));
        pts = [{ x: 0, y: 0 }, { x: aBot, y: 0 }, { x: round1(aBot - offset), y: h }, { x: offset, y: h }];
        sides = [aBot, leg, cTop, leg];   // bottom, right leg, top, left leg
    }
    else if (shape === 'vierhoek') {
        // Irregular convex quad: 4 points around a centre. Sides are genuinely measured.
        const R = max / 2;
        const angs = [randInt(20, 70), randInt(110, 160), randInt(200, 250), randInt(290, 340)];
        pts = angs.map(d => ({ x: round1(R + R * Math.cos(rad(d))), y: round1(R + R * Math.sin(rad(d))) }));
        sides = pts.map((p, i) => roundP(dist(p, pts[(i + 1) % pts.length]), precision));
    }
    else if (shape === 'vijfhoek' || shape === 'zeshoek' || shape === 'zevenhoek' || shape === 'achthoek') {
        const nSides = { vijfhoek: 5, zeshoek: 6, zevenhoek: 7, achthoek: 8 }[shape]!;
        const s = L(); pts = regularPolygon(nSides, s); sides = Array(nSides).fill(s);
    }
    else { const s = L(); pts = [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s, y: s }, { x: 0, y: s }]; sides = [s, s, s, s]; }   // fallback: vierkant

    return { id: rndId(), kind: 'veelhoek', shape, points: pts, sides, perimeter: sum(sides), isManuallyEdited: false };
}

export function generateOmtrekExercises(block: MathBlock): MeetExercise[] {
    const c = block.constraints;
    const precision: string = c.precision ?? 'cm';
    const minL: number = c.minLength ?? 3;
    const maxL: number = c.maxLength ?? 10;
    const enabled: string[] = Array.isArray(c.shapes) && c.shapes.length ? c.shapes : ['driehoek', 'rechthoek', 'vierkant'];
    const n = block.numberOfExercises;

    return Array.from({ length: n }, () => buildShape(enabled[randInt(0, enabled.length - 1)], minL, maxL, precision));
}
