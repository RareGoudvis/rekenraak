import type { MathBlock, VormleerExercise, MeetPoint } from '../math/types';

// Vormleer — punt/lijn/rechte, hoeken and vlakke figuren. One generator, three
// typeIds (subType via constraints.kind); the viewer branches on `kind`.

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const rad = (deg: number) => (deg * Math.PI) / 180;
const round1 = (v: number) => Math.round(v * 10) / 10;

// Sequential capital letters for point labels, skipping ambiguous O.
const LETTERS = 'ABCDEFGHIJKLMNP'.split('');

// Human names per concept — woordbank, solutions, eigenschappen rows (viewer imports these).
export const CONCEPT_NAMES: Record<string, string> = {
    punt: 'punt', rechte: 'rechte', halfrechte: 'halfrechte', lijnstuk: 'lijnstuk',
    evenwijdig: 'evenwijdige rechten', snijdend: 'snijdende rechten', loodrecht: 'loodrechte stand',
    scherp: 'scherpe hoek', recht: 'rechte hoek', stomp: 'stompe hoek', gestrekt: 'gestrekte hoek',
    vierkant: 'vierkant', rechthoek: 'rechthoek', ruit: 'ruit', parallellogram: 'parallellogram', trapezium: 'trapezium',
    gelijkzijdig: 'gelijkzijdige driehoek', gelijkbenig: 'gelijkbenige driehoek', ongelijkzijdig: 'ongelijkzijdige driehoek',
    scherphoekig: 'scherphoekige driehoek', rechthoekig: 'rechthoekige driehoek', stomphoekig: 'stomphoekige driehoek',
};

// ── vlakke-figuren constructors (cm coordinates) ─────────────────────────────
// Quadrilaterals mirror metenGenerator.buildShape's proportions but stay local so
// vormleer can pin exact side-equality classes for the tick marks.
function vierhoekPoints(concept: string): { pts: MeetPoint[]; sides: number[] } {
    if (concept === 'vierkant') {
        const s = randInt(3, 5);
        return { pts: [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s, y: s }, { x: 0, y: s }], sides: [s, s, s, s] };
    }
    if (concept === 'rechthoek') {
        const w = randInt(4, 6), h = randInt(2, w - 1);
        return { pts: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], sides: [w, h, w, h] };
    }
    if (concept === 'ruit' || concept === 'parallellogram') {
        const w = randInt(3, 5);
        const l = concept === 'ruit' ? w : randInt(2, w - 1) + w;   // parallellogram: clearly unequal
        const th = rad(concept === 'ruit' ? 62 : 68);
        const bx = round1(l * Math.cos(th)), by = round1(l * Math.sin(th));
        return { pts: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: round1(w + bx), y: by }, { x: bx, y: by }], sides: [w, l, w, l] };
    }
    // trapezium: exactly one pair of parallel sides.
    const bot = randInt(5, 7), top = randInt(2, bot - 2);
    const off = (bot - top) / 2;
    const h = randInt(2, 4);
    return {
        pts: [{ x: 0, y: 0 }, { x: bot, y: 0 }, { x: round1(bot - off), y: h }, { x: off, y: h }],
        sides: [bot, round1(Math.hypot(off, h)), top, round1(Math.hypot(off, h))],
    };
}

// Triangles pinned by angle class (scherp/recht/stomp at vertex A) or side class.
function driehoekPoints(concept: string): { pts: MeetPoint[]; sides: number[] } {
    let pts: MeetPoint[];
    if (concept === 'gelijkzijdig') {
        const s = randInt(3, 5);
        pts = [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s / 2, y: round1(s * Math.sin(rad(60))) }];
    } else if (concept === 'gelijkbenig') {
        const base = randInt(3, 5), h = base + randInt(1, 2);   // legs clearly ≠ base
        pts = [{ x: 0, y: 0 }, { x: base, y: 0 }, { x: base / 2, y: h }];
    } else if (concept === 'rechthoekig') {
        pts = [{ x: 0, y: 0 }, { x: randInt(3, 5), y: 0 }, { x: 0, y: randInt(2, 4) }];
    } else if (concept === 'stomphoekig') {
        const base = randInt(3, 5);
        // Top vertex pushed past the base end → the angle at that end tops 90°.
        pts = [{ x: 0, y: 0 }, { x: base, y: 0 }, { x: base + randInt(2, 3), y: randInt(2, 3) }];
    } else {
        // scherphoekig / ongelijkzijdig: all angles < 90°, all sides distinct.
        const base = randInt(4, 6);
        pts = [{ x: 0, y: 0 }, { x: base, y: 0 }, { x: round1(base * 0.4) + 0.5, y: randInt(3, 4) }];
    }
    const sides = pts.map((p, i) => round1(Math.hypot(pts[(i + 1) % 3].x - p.x, pts[(i + 1) % 3].y - p.y)));
    return { pts, sides };
}

export function generateVormleerExercises(block: MathBlock): VormleerExercise[] {
    const c = block.constraints;
    const kind: 'punt-lijn' | 'hoek' | 'figuur' = c.kind ?? 'punt-lijn';
    const concepts: string[] = Array.isArray(c.concepts) && c.concepts.length ? c.concepts : ['punt', 'rechte', 'lijnstuk'];
    const randomRotation: boolean = c.randomRotation ?? (kind === 'hoek');
    const count = block.numberOfExercises || 6;

    const out: VormleerExercise[] = [];
    let letterIdx = 0;
    const nextLetters = (n: number) => {
        const ls = Array.from({ length: n }, (_, i) => LETTERS[(letterIdx + i) % LETTERS.length]);
        letterIdx += n;
        return ls;
    };

    // Cycle the enabled concepts so a herkennen sheet always mixes them evenly.
    const shuffled = [...concepts].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        const concept = shuffled[i % shuffled.length];
        if (kind === 'hoek') {
            // Angle by class; gestrekt is exactly 180°, recht exactly 90°.
            const angleDeg = concept === 'recht' ? 90
                : concept === 'gestrekt' ? 180
                : concept === 'scherp' ? randInt(25, 70)
                : randInt(110, 160);
            out.push({
                id: rndId(), kind, concept, angleDeg,
                rotation: randomRotation ? randInt(0, 359) : 0,
                labels: nextLetters(1), isManuallyEdited: false,
            });
        } else if (kind === 'figuur') {
            const isTriangle = ['gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig', 'scherphoekig', 'rechthoekig', 'stomphoekig'].includes(concept);
            const { pts, sides } = isTriangle ? driehoekPoints(concept) : vierhoekPoints(concept);
            out.push({
                id: rndId(), kind, concept, points: pts, sides,
                rotation: randomRotation ? pick([0, 15, 30, 345, 330]) : 0,
                isManuallyEdited: false,
            });
        } else {
            // punt-lijn: endpoints of the drawn element (viewer adds arrowheads per concept).
            const len = randInt(3, 6);
            out.push({
                id: rndId(), kind, concept, points: [{ x: 0, y: 0 }, { x: len, y: 0 }],
                rotation: randomRotation ? randInt(-30, 30) : pick([0, -15, 10, 20, -25]),
                labels: concept === 'punt' ? nextLetters(1) : nextLetters(2),
                isManuallyEdited: false,
            });
        }
    }
    return out;
}
