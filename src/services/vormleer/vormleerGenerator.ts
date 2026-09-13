import type { MathBlock, VormleerExercise, MeetPoint } from '../math/types';
import type { VormleerConstraints } from '../math/constraintTypes';

// Vormleer — punt/lijn/rechte, hoeken and vlakke figuren. One generator, three
// typeIds (subType via constraints.kind); the viewer branches on `kind`.

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const rad = (deg: number) => (deg * Math.PI) / 180;
const round1 = (v: number) => Math.round(v * 10) / 10;

// Sequential capital letters for point labels, skipping ambiguous O.
const LETTERS = 'ABCDEFGHIJKLMNP'.split('');
// Rechte (line) names are lowercase and skip 'l' (looks like 1) and 'o' (looks like 0).
const LINE_LETTERS = 'abcdefghijkmnpqrstuvwxyz'.split('');

// Human names per concept — woordbank, solutions, eigenschappen rows (viewer imports these).
export const CONCEPT_NAMES: Record<string, string> = {
    punt: 'punt', rechte: 'rechte', halfrechte: 'halfrechte', lijnstuk: 'lijnstuk',
    evenwijdig: 'evenwijdige rechten', snijdend: 'snijdende rechten', loodrecht: 'loodrechte stand',
    scherp: 'scherpe hoek', recht: 'rechte hoek', stomp: 'stompe hoek', gestrekt: 'gestrekte hoek',
    'ligt-op': 'punt op een lijnstuk',
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

// ── niveau 2/3 relation sentences ─────────────────────────────────────────────
// One available relation kind per pair of enabled concepts; 'ligt-op' needs both
// 'punt' and 'lijnstuk' enabled since it draws one of each.
type RelKind = 'loodrecht' | 'evenwijdig' | 'snijdt' | 'ligt-op';

function relKindsAvailable(concepts: string[]): RelKind[] {
    const out: RelKind[] = [];
    if (concepts.includes('loodrecht')) out.push('loodrecht');
    if (concepts.includes('evenwijdig')) out.push('evenwijdig');
    if (concepts.includes('snijdend')) out.push('snijdt');
    if (concepts.includes('punt') && concepts.includes('lijnstuk')) out.push('ligt-op');
    return out;
}

// Builds one niveau-2-shaped punt-lijn exercise (a single drawn relation + its
// fill-in-the-blank sentence). Reused twice for niveau 3.
function buildRelationExercise(relKind: RelKind, randomRotation: boolean, nextLetters: (n: number) => string[], nextLineLetters: (n: number) => string[]): VormleerExercise {
    const rotation = randomRotation ? randInt(-30, 30) : pick([0, -15, 10, 20, -25]);
    if (relKind === 'loodrecht' || relKind === 'evenwijdig') {
        const [a, b] = nextLineLetters(2);
        const before = relKind === 'loodrecht' ? `rechte ${a} staat ` : `rechte ${a} is `;
        const after = relKind === 'loodrecht' ? ` op rechte ${b}` : ` met rechte ${b}`;
        return {
            id: rndId(), kind: 'punt-lijn', concept: relKind, rotation, labels: [a, b],
            relations: [{ kind: relKind, a, b, before, after, answer: relKind }],
            isManuallyEdited: false,
        };
    }
    if (relKind === 'snijdt') {
        const [a, b] = nextLineLetters(2);
        const [at] = nextLetters(1);
        return {
            id: rndId(), kind: 'punt-lijn', concept: 'snijdend', rotation, labels: [a, b, at],
            relations: [{ kind: 'snijdt', a, b, at, before: `rechte ${a} snijdt rechte ${b} in punt `, after: '', answer: at }],
            isManuallyEdited: false,
        };
    }
    // ligt-op: point A vs lijnstuk [CD], on or clearly off the segment.
    const [point] = nextLetters(1);
    const [segA, segB] = nextLetters(2);
    const onSegment = Math.random() < 0.5;
    return {
        id: rndId(), kind: 'punt-lijn', concept: 'ligt-op', rotation, labels: [segA, segB, point],
        pointT: onSegment ? 0.3 + Math.random() * 0.4 : 0.2 + Math.random() * 0.6,
        pointOffset: onSegment ? 0 : (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.15),
        relations: [{ kind: 'ligt-op', a: point, b: `${segA}${segB}`, before: `punt ${point} ligt `, after: ` lijnstuk [${segA}${segB}]`, answer: onSegment ? 'op' : 'niet op' }],
        isManuallyEdited: false,
    };
}

export function generateVormleerExercises(block: MathBlock): VormleerExercise[] {
    const c = block.constraints as VormleerConstraints;
    const kind: 'punt-lijn' | 'hoek' | 'figuur' = c.kind ?? 'punt-lijn';
    const mode: string = c.mode ?? 'herkennen';
    const concepts: string[] = Array.isArray(c.concepts) && c.concepts.length ? c.concepts : ['punt', 'rechte', 'lijnstuk'];
    const randomRotation: boolean = c.randomRotation ?? (kind === 'hoek');
    const niveau: 1 | 2 | 3 = c.niveau ?? 1;
    const count = block.numberOfExercises || 6;

    const out: VormleerExercise[] = [];
    let letterIdx = 0;
    const nextLetters = (n: number) => {
        const ls = Array.from({ length: n }, (_, i) => LETTERS[(letterIdx + i) % LETTERS.length]);
        letterIdx += n;
        return ls;
    };
    let lineLetterIdx = 0;
    const nextLineLetters = (n: number) => {
        const ls = Array.from({ length: n }, (_, i) => LINE_LETTERS[(lineLetterIdx + i) % LINE_LETTERS.length]);
        lineLetterIdx += n;
        return ls;
    };

    // Niveau ≥ 2 is about relations: with the plain default concept set (no relation
    // pill ticked) offer all four kinds, otherwise a teacher would only ever see "ligt op".
    const ticked = relKindsAvailable(concepts);
    const anyRelationPill = concepts.some(k => k === 'loodrecht' || k === 'evenwijdig' || k === 'snijdend');
    const relKinds: RelKind[] = kind !== 'punt-lijn' ? [] : anyRelationPill ? ticked : ['loodrecht', 'evenwijdig', 'snijdt', 'ligt-op'];

    // Cycle the enabled concepts so a herkennen sheet always mixes them evenly.
    const shuffled = [...concepts].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        const concept = shuffled[i % shuffled.length];
        if (kind === 'hoek' && mode === 'meten') {
            // Multiples of 5°, occasionally exactly 90° — geodriehoek reading practice.
            const angleDeg = Math.random() < 0.15 ? 90 : randInt(4, 32) * 5;
            // `rotation` is a small jitter of the fixed diagonal bisector (viewer), not a
            // full 0-359 spin — a wide angle (up to 160°) already needs most of the box, so
            // free rotation would blow the bounding box past what fits two-per-row.
            out.push({
                id: rndId(), kind, concept: 'meten', angleDeg,
                rotation: randomRotation ? randInt(-8, 8) : 0,
                isManuallyEdited: false,
            });
        } else if (kind === 'hoek') {
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
        } else if ((mode === 'herkennen' || mode === 'tekenen') && niveau >= 2 && relKinds.length) {
            if (niveau === 2) {
                const relKind = pick(relKinds);
                out.push({ ...buildRelationExercise(relKind, randomRotation, nextLetters, nextLineLetters), niveau });
            } else {
                // niveau 3: two independent relations (possibly the same kind, different letters).
                const kind1 = pick(relKinds);
                const kind2 = relKinds.length > 1 ? pick(relKinds.filter(k => k !== kind1)) : kind1;
                const sub1 = buildRelationExercise(kind1, randomRotation, nextLetters, nextLineLetters);
                const sub2 = buildRelationExercise(kind2, randomRotation, nextLetters, nextLineLetters);
                out.push({
                    id: rndId(), kind: 'punt-lijn', concept: 'relatie-multi', niveau,
                    subExercises: [sub1, sub2], relations: [...(sub1.relations ?? []), ...(sub2.relations ?? [])],
                    isManuallyEdited: false,
                });
            }
        } else {
            // punt-lijn niveau 1: endpoints of the drawn element (viewer adds arrowheads per concept).
            const len = randInt(3, 6);
            out.push({
                id: rndId(), kind, concept, points: [{ x: 0, y: 0 }, { x: len, y: 0 }],
                rotation: randomRotation ? randInt(-30, 30) : pick([0, -15, 10, 20, -25]),
                labels: concept === 'punt' ? nextLetters(1) : concept === 'rechte' ? nextLineLetters(1) : nextLetters(2),
                niveau, isManuallyEdited: false,
            });
        }
    }
    return out;
}
