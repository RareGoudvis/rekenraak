import type { MathBlock, VormleerExercise, VormleerElement, VormleerStep, MeetPoint } from '../math/types';
import type { VormleerConstraints } from '../math/constraintTypes';

// Vormleer — punt/lijn/rechte, hoeken and vlakke figuren. One generator, three
// typeIds (subType via constraints.kind); the viewer branches on `kind`.

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const rad = (deg: number) => (deg * Math.PI) / 180;
const round1 = (v: number) => Math.round(v * 10) / 10;

// Sequential capital letters for point labels, skipping ambiguous O.
const LETTERS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'.split('');
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

// ── punt-lijn scenarios (niveau 1/2/3) ───────────────────────────────────────
// ONE builder for both modes, so a niveau means the same thing in tekenen and in
// herkennen: niveau 1 = one named element, 2 = two elements in one named relation,
// 3 = a three-step chain on one base element. The mode only picks the presentation —
// tekenen prints `steps` as a numbered instruction above an empty box, herkennen
// draws `elements` and blanks the same steps out.
type RelKind = 'loodrecht' | 'evenwijdig' | 'snijdt' | 'ligt-op';
type ElType = 'punt' | 'rechte' | 'halfrechte' | 'lijnstuk';
type Orient = 'horizontaal' | 'verticaal' | 'vrij';

// One available relation kind per pair of enabled concepts; 'ligt-op' needs both
// 'punt' and a line-like pill since it draws one of each.
function relKindsAvailable(concepts: string[]): RelKind[] {
    const out: RelKind[] = [];
    if (concepts.includes('loodrecht')) out.push('loodrecht');
    if (concepts.includes('evenwijdig')) out.push('evenwijdig');
    if (concepts.includes('snijdend')) out.push('snijdt');
    if (concepts.includes('punt')) out.push('ligt-op');
    return out;
}

const LINE_TYPES: ElType[] = ['rechte', 'halfrechte', 'lijnstuk'];
const EL_TYPES: ElType[] = ['punt', ...LINE_TYPES];

// Dutch adjective agreement: 'de rechte' takes the -e form, 'het lijnstuk' does not.
const ORIENT_ADJ: Record<ElType, Record<'horizontaal' | 'verticaal', string>> = {
    punt: { horizontaal: '', verticaal: '' },
    rechte: { horizontaal: 'horizontale', verticaal: 'verticale' },
    halfrechte: { horizontaal: 'horizontale', verticaal: 'verticale' },
    lijnstuk: { horizontaal: 'horizontaal', verticaal: 'verticaal' },
};

/** 'rechte' / 'horizontale rechte' / 'horizontaal lijnstuk' — also the woordbank entry. */
export function elementName(type: string, orient?: 'horizontaal' | 'verticaal'): string {
    const base = CONCEPT_NAMES[type] ?? type;
    const adj = orient ? (ORIENT_ADJ[type as ElType]?.[orient] ?? '') : '';
    return adj ? `${adj} ${base}` : base;
}

// How the name is written on paper: a lijnstuk gets both brackets, a halfrechte only
// the closed one at its starting point (Flemish notation).
const written = (type: ElType, name: string) =>
    type === 'lijnstuk' ? `[${name}]` : type === 'halfrechte' ? `[${name}` : name;

const phrase = (el: VormleerElement) => `${elementName(el.type, el.orient)} ${el.label}`;
// Back-reference inside an instruction: the element was already introduced, so its
// stand ("horizontale") would only repeat — "loodrecht op rechte a", not "… op de
// horizontale rechte a".
const shortRef = (el: VormleerElement) => `${CONCEPT_NAMES[el.type] ?? el.type} ${el.label}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Vec = { x: number; y: number };
const dirFor = (orient: Orient, deg: number): Vec =>
    orient === 'horizontaal' ? { x: 1, y: 0 }
        : orient === 'verticaal' ? { x: 0, y: 1 }
        : { x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) };
const perp = (u: Vec): Vec => ({ x: -u.y, y: u.x });
const rotVec = (u: Vec, deg: number): Vec => {
    const r = rad(deg);
    return { x: u.x * Math.cos(r) - u.y * Math.sin(r), y: u.x * Math.sin(r) + u.y * Math.cos(r) };
};
// Half-lengths in the normalised 0..1 box: a rechte runs nearly edge to edge, a
// lijnstuk is visibly shorter so the two read differently even without the dots.
const HALF: Record<ElType, number> = { punt: 0, rechte: 0.44, halfrechte: 0.42, lijnstuk: 0.30 };

function geom(type: ElType, c: Vec, u: Vec): MeetPoint[] {
    if (type === 'punt') return [{ x: c.x, y: c.y }];
    const h = HALF[type];
    // A halfrechte starts at its named endpoint and runs one way only.
    const back = type === 'halfrechte' ? 0.18 : h;
    return [{ x: c.x - u.x * back, y: c.y - u.y * back }, { x: c.x + u.x * h, y: c.y + u.y * h }];
}

interface Dispenser { pt: (n: number) => string[]; line: (n: number) => string[]; }

function newElement(type: ElType, orient: Orient, c: Vec, u: Vec, d: Dispenser): VormleerElement {
    const name = type === 'rechte' ? d.line(1)[0]
        : type === 'punt' ? d.pt(1)[0]
        : d.pt(2).join('');
    return {
        type, name, label: written(type, name),
        ...(orient === 'vrij' ? {} : { orient }),
        pts: geom(type, c, u),
    };
}

const dirOfEl = (el: VormleerElement): Vec => {
    const [a, b] = el.pts;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
};
const midOfEl = (el: VormleerElement): Vec => ({ x: (el.pts[0].x + el.pts[1].x) / 2, y: (el.pts[0].y + el.pts[1].y) / 2 });
const flip = (o?: 'horizontaal' | 'verticaal'): Orient =>
    o === 'horizontaal' ? 'verticaal' : o === 'verticaal' ? 'horizontaal' : 'vrij';

interface ScenarioOpts {
    concepts: string[];
    relKinds: RelKind[];
    orients: Orient[];
    randomRotation: boolean;
    d: Dispenser;
}

// Adds one relation hanging off `base`; returns the step and pushes the new elements.
function addRelation(base: VormleerElement, relKind: RelKind, namePoint: boolean, out: VormleerElement[], o: ScenarioOpts): VormleerStep {
    const u = dirOfEl(base), m = midOfEl(base), v = perp(u);
    if (relKind === 'loodrecht') {
        const t = pick([-0.12, 0, 0.12]);
        const at: Vec = { x: m.x + u.x * t, y: m.y + u.y * t };
        const b = newElement('rechte', flip(base.orient), at, v, o.d);
        out.push(b);
        let where = '';
        if (namePoint) {
            const p = newElement('punt', 'vrij', at, u, o.d);
            out.push(p);
            where = ` in punt ${p.name}`;
        }
        return {
            text: `Teken ${phrase(b)} loodrecht op ${shortRef(base)}${where}.`,
            before: `${cap(phrase(b))} staat `, after: ` op ${phrase(base)}.`,
            answer: 'loodrecht', rel: 'loodrecht',
        };
    }
    if (relKind === 'evenwijdig') {
        // A parallel partner may be a lijnstuk when that pill is on — same direction,
        // so it inherits the base's orientation word.
        const type: ElType = o.concepts.includes('lijnstuk') && Math.random() < 0.5 ? 'lijnstuk' : 'rechte';
        const off = pick([-0.26, 0.26]);
        const c: Vec = { x: m.x + v.x * off, y: m.y + v.y * off };
        const e = newElement(type, base.orient ?? 'vrij', c, u, o.d);
        out.push(e);
        return {
            text: `Teken ${phrase(e)} evenwijdig met ${shortRef(base)}.`,
            before: `${cap(phrase(e))} ligt `, after: ` met ${phrase(base)}.`,
            answer: 'evenwijdig', rel: 'evenwijdig',
        };
    }
    if (relKind === 'snijdt') {
        const t = pick([-0.1, 0, 0.1]);
        const at: Vec = { x: m.x + u.x * t, y: m.y + u.y * t };
        const b = newElement('rechte', 'vrij', at, rotVec(u, pick([55, -55, 70, -70])), o.d);
        const p = newElement('punt', 'vrij', at, u, o.d);
        out.push(b, p);
        return {
            text: `Teken ${phrase(b)} die ${shortRef(base)} snijdt in punt ${p.name}.`,
            before: `${cap(phrase(b))} snijdt ${phrase(base)} in punt `, after: '.',
            answer: p.name, rel: 'snijdt',
        };
    }
    // ligt-op: the point always lands ON the element, so the drawn figure and the
    // tekenen instruction can never disagree; the blank is the position word.
    // Kept clear of the middle so it cannot land on top of an intersection point.
    const t = pick([-1, 1]) * (0.14 + Math.random() * 0.16);
    const p = newElement('punt', 'vrij', { x: m.x + u.x * t, y: m.y + u.y * t }, u, o.d);
    out.push(p);
    return {
        text: `Teken punt ${p.name} op ${shortRef(base)}.`,
        before: `Punt ${p.name} ligt `, after: ` ${phrase(base)}.`,
        answer: 'op', rel: 'ligt-op',
    };
}

function buildScenario(niveau: 1 | 2 | 3, concept: string, o: ScenarioOpts): { elements: VormleerElement[]; steps: VormleerStep[]; concept: string } {
    const elements: VormleerElement[] = [];
    const centre: Vec = { x: 0.5, y: 0.5 };
    const baseDeg = o.randomRotation ? randInt(-32, 32) : pick([0, -15, 10, 20, -25]);
    const pickOrient = (type: ElType): Orient => (type === 'punt' ? 'vrij' : pick(o.orients));

    // Niveau 1 with a relation pill ticked still shows the classic pair (two evenwijdige
    // rechten, …) — one drawing, one name, now with both lines lettered.
    if (niveau === 1 && !EL_TYPES.includes(concept as ElType)) {
        const relKind: RelKind = concept === 'loodrecht' ? 'loodrecht' : concept === 'snijdend' ? 'snijdt' : 'evenwijdig';
        const orient = pickOrient('rechte');
        const base = newElement('rechte', orient, centre, dirFor(orient, baseDeg), o.d);
        elements.push(base);
        addRelation(base, relKind, false, elements, o);
        const [a, b] = elements;
        const text = relKind === 'loodrecht'
            ? `Teken rechte ${a.name} en rechte ${b.name} loodrecht op elkaar.`
            : `Teken ${CONCEPT_NAMES[concept]} ${a.name} en ${b.name}.`;
        return { elements, steps: [{ text, before: '', after: '', answer: CONCEPT_NAMES[concept] ?? concept }], concept };
    }

    if (niveau === 1) {
        const type = concept as ElType;
        const orient = pickOrient(type);
        const el = newElement(type, orient, centre, dirFor(orient, baseDeg), o.d);
        elements.push(el);
        // 'een' only in front of an adjective — "Teken rechte a." but "Teken een horizontale rechte a."
        const text = `Teken ${el.orient ? 'een ' : ''}${phrase(el)}.`;
        return { elements, steps: [{ text, before: '', after: '', answer: elementName(el.type, el.orient) }], concept: type };
    }

    // Niveau 2/3: one base element carries every relation, so the figure stays one chain.
    const baseType = pick(LINE_TYPES.filter(t => o.concepts.includes(t)).length
        ? LINE_TYPES.filter(t => o.concepts.includes(t)) : ['rechte' as ElType]);
    const baseOrient = pickOrient(baseType);
    const base = newElement(baseType, baseOrient, centre, dirFor(baseOrient, baseDeg), o.d);
    elements.push(base);
    const baseStep: VormleerStep = { text: `Teken ${base.orient ? 'een ' : ''}${phrase(base)}.` };

    if (niveau === 2) {
        const rel = addRelation(base, pick(o.relKinds), false, elements, o);
        // One two-part instruction; herkennen only blanks the relation half.
        return { elements, steps: [{ ...rel, text: `${baseStep.text} ${rel.text}` }], concept: 'scenario' };
    }

    const k1 = pick(o.relKinds);
    const k2 = o.relKinds.length > 1 ? pick(o.relKinds.filter(k => k !== k1)) : k1;
    const s1 = addRelation(base, k1, k1 === 'loodrecht', elements, o);
    const s2 = addRelation(base, k2, false, elements, o);
    return { elements, steps: [baseStep, s1, s2], concept: 'scenario' };
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
    const relKinds: RelKind[] = kind !== 'punt-lijn' ? [] : anyRelationPill && ticked.length ? ticked : ['loodrecht', 'evenwijdig', 'snijdt', 'ligt-op'];

    // Orientation pool for the Horizontaal/Verticaal pills. 'vrij' stays in the pool so a
    // sheet with one pill on still varies; both pills off = the old free direction only.
    const orients: Orient[] = [
        ...(c.allowHorizontaal ? ['horizontaal' as Orient] : []),
        ...(c.allowVerticaal ? ['verticaal' as Orient] : []),
        'vrij',
    ];
    const scenarioOpts: ScenarioOpts = {
        concepts, relKinds, orients, randomRotation,
        d: { pt: nextLetters, line: nextLineLetters },
    };

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
            // Tekenen with 'Hoeken benoemen' on names the angle by three points with the
            // vertex in the middle (hoek ABC) — the instruction and the solution use them.
            const named = mode === 'tekenen' && (c.nameAngles ?? true);
            out.push({
                id: rndId(), kind, concept, angleDeg,
                rotation: randomRotation ? randInt(0, 359) : 0,
                labels: named ? nextLetters(3) : nextLetters(1), isManuallyEdited: false,
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
            // punt-lijn, both modes, every niveau: one scenario, drawn or described.
            const sc = buildScenario(niveau, concept, scenarioOpts);
            out.push({
                id: rndId(), kind: 'punt-lijn', concept: sc.concept, niveau,
                elements: sc.elements, steps: sc.steps,
                labels: sc.elements.map(e => e.label),
                isManuallyEdited: false,
            });
        }
    }
    return out;
}
