import { mulberry32 } from '../../distractors';
import { shortClockMs } from '../../levels/clock';
import type { Level } from '../../levels/levels';

// Frituur: the queue at the counter. Pure, so the tuning is testable: the customer at the counter asks the sum on
// screen and waits on a patience bar that drains with game time (help and the flashes freeze it). A right answer
// serves them (they leave on the next sum), a wrong order or an empty bar walks them off grumbling. The bar is the
// shared clock (levels/clock.ts) at the moment they step up; Makkelijk has no bar, they wait as long as it takes.

// THE tuning table (the owner tunes it after playing).
export const FRITUUR = {
    // A wrong order costs this share of the customer's full patience: all of it, they walk off at once (owner 2026-11-17).
    wrongCut: 1,
    // Under this share left the customer gets impatient (checks a watch, taps a foot, whines).
    lowAt: 0.35,
    // The bar waits this long for a new customer, who is still stepping up to the counter.
    graceMs: 500,
    // Customers in the queue, the one at the counter included.
    queue: 3,
    // Customers still walking off at once (each walk is a few seconds of CSS).
    leaving: 3,
    // The share of customers that is a fantastic visitor (an alien, a crab, a yeti...) instead of a person.
    visitorChance: 0.25,
    // A visitor that likes slime orders the green alien sauce this often.
    slimeChance: 0.5,
} as const;

// Kids come twice as often as the rest (a school frituur); never the same kind twice in a row.
export const KINDS = ['kind', 'mama', 'papa', 'opa', 'voetballer', 'hond', 'kind'] as const;
// The fantastic visitors (visitors.tsx draws them); they order the same food and play by the same rules.
export const VISITORS = ['alien', 'drieoog', 'monster', 'octopus', 'krab', 'vis', 'robot', 'draak', 'yeti'] as const;
export type PersonKind = typeof KINDS[number];
export type VisitorKind = typeof VISITORS[number];
export type CustomerKind = PersonKind | VisitorKind;
// slijm = friet with green alien sauce: only visitors order it, but anyone may get it by mistake.
export const ORDERS = ['friet', 'curryworst', 'frikandel', 'stoofvlees', 'mayo', 'augurk', 'slijm'] as const;
export type OrderKind = typeof ORDERS[number];
const PEOPLE_ORDERS = ORDERS.filter(o => o !== 'slijm');
const SLIME_EATERS: readonly CustomerKind[] = ['alien', 'drieoog', 'monster'];
// Looks per kind (shirt, hair, skin tone pick from this).
export const LOOKS = 6;

export const isKid = (kind: CustomerKind) => kind === 'kind' || kind === 'voetballer';
export const isVisitor = (kind: CustomerKind): kind is VisitorKind => (VISITORS as readonly string[]).includes(kind);
// The top of each visitor (antennae and horns included) in its 100 × 200 box. SYNC: visitors.tsx.
const VISITOR_TOP: Record<VisitorKind, number> = { alien: 58, drieoog: 14, monster: 78, octopus: 64, krab: 108, vis: 14, robot: 14, draak: 70, yeti: 16 };
/** The top of the head (hair and hats included) in a customer's 100 × 200 box: the patience bar floats just above it. SYNC: art.tsx bodies. */
export const headTopOf = (kind: CustomerKind) => (isVisitor(kind) ? VISITOR_TOP[kind] : isKid(kind) ? 78 : kind === 'opa' ? 24 : kind === 'hond' ? 16 : 19);

export interface Customer { id: number; kind: CustomerKind; look: number; order: OrderKind }
export interface Patience { total: number; left: number; grace: number }
// happy = off eating; grumpy = the bar ran out; tantrum = the wrong snack (`snack`): a short strop, then off.
export interface Leaver { customer: Customer; mood: 'happy' | 'grumpy' | 'tantrum'; snack?: OrderKind }

export interface Counter {
    seed: number;
    // [0] stands at the counter.
    queue: Customer[];
    leaving: Leaver[];
    nextId: number;
    patience: Patience;
    // The customer at the counter got the right order: the bar stops, they leave on the next sum.
    served: boolean;
    // Wrong orders for the customer at the counter (keys its animation).
    wrongs: number;
    // Every customer that went off with an order this round (met hulp included).
    servedCount: number;
    // Bumped on every change the scene draws (the patience ticks are not one).
    rev: number;
}

// A patience of 0 = no bar (Makkelijk): it never drains and never runs out.
export const NO_PATIENCE = 0;

/** The patience of a customer stepping up after elapsedMs of the round: the shared clock (Makkelijk: no bar). */
export const patienceFor = (level: Level, elapsedMs: number) => shortClockMs(level, elapsedMs) ?? NO_PATIENCE;

const fresh = (total: number): Patience => ({ total, left: total, grace: FRITUUR.graceMs });

/** This customer waits without a bar (Makkelijk). */
export const isEndless = (p: Patience) => p.total <= NO_PATIENCE;

/** Customer number `id` of this round: seeded, so a round's queue is the same on a replay of its seed. */
export function customerOf(seed: number, id: number, prev: CustomerKind | null): Customer {
    const rng = mulberry32((seed ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0);
    const bag: readonly CustomerKind[] = rng() < FRITUUR.visitorChance ? VISITORS : KINDS;
    let k = Math.floor(rng() * bag.length);
    if (bag[k] === prev) k = (k + 1 + Math.floor(rng() * (bag.length - 1))) % bag.length;
    // Still the same kind (the bag holds 'kind' twice): the next one that differs.
    while (bag[k] === prev) k = (k + 1) % bag.length;
    const kind = bag[k];
    const look = Math.floor(rng() * LOOKS);
    const order = SLIME_EATERS.includes(kind) && rng() < FRITUUR.slimeChance ? 'slijm' : PEOPLE_ORDERS[Math.floor(rng() * PEOPLE_ORDERS.length)];
    return { id, kind, look, order };
}

/** What comes over the counter on a wrong answer: never what they asked for. */
export const wrongOrderOf = (order: OrderKind, n: number): OrderKind => {
    const i = ORDERS.indexOf(order);
    return ORDERS[(i + 1 + (Math.abs(n) % (ORDERS.length - 1))) % ORDERS.length];
};

/** A fresh counter; the first customer's patience in ms (patienceFor; NO_PATIENCE = no bar). */
export function newCounter(seed: number, patienceMs: number = patienceFor('normaal', 0)): Counter {
    const queue: Customer[] = [];
    for (let id = 0; id < FRITUUR.queue; id++) queue.push(customerOf(seed, id, queue.at(-1)?.kind ?? null));
    return { seed, queue, leaving: [], nextId: FRITUUR.queue, patience: fresh(patienceMs), served: false, wrongs: 0, servedCount: 0, rev: 0 };
}

/** The customer at the counter leaves (happy with their order, or grumbling); the queue steps up, a new one joins at the back with patienceMs. */
export function walkOff(c: Counter, mood: Leaver['mood'], patienceMs: number, snack?: OrderKind): Counter {
    const [front, ...rest] = c.queue;
    const joins = customerOf(c.seed, c.nextId, c.queue.at(-1)?.kind ?? null);
    const leaver: Leaver = snack ? { customer: front, mood, snack } : { customer: front, mood };
    return {
        ...c, queue: [...rest, joins], nextId: c.nextId + 1, leaving: [...c.leaving, leaver].slice(-FRITUUR.leaving),
        patience: fresh(patienceMs), served: false, wrongs: 0, rev: c.rev + 1,
    };
}

/** A right answer: the order goes over the counter. */
export const serve = (c: Counter): Counter => (c.served ? c : { ...c, served: true, servedCount: c.servedCount + 1, rev: c.rev + 1 });

/** A wrong answer: the wrong order comes out and costs `wrongCut` of the patience; empty = a little tantrum, then off (also without a bar). */
export function wrongOrder(c: Counter, patienceMs: number = c.patience.total): Counter {
    if (c.served) return c;
    const left = Math.max(0, c.patience.left - c.patience.total * FRITUUR.wrongCut);
    if (left <= 0) return walkOff(c, 'tantrum', patienceMs, wrongOrderOf(c.queue[0].order, c.nextId));
    return { ...c, patience: { ...c.patience, left }, wrongs: c.wrongs + 1, rev: c.rev + 1 };
}

/** A new sum on screen: a served customer goes, the next one steps up with patienceMs. */
export const nextSum = (c: Counter, patienceMs: number): Counter => (c.served ? walkOff(c, 'happy', patienceMs) : c);

/** dt ms of game time at the counter: the grace runs out first, then the bar. A served customer's bar stands still, and no bar never drains. */
export function tick(c: Counter, dt: number): Counter {
    if (c.served || dt <= 0 || isEndless(c.patience)) return c;
    const { grace, left, total } = c.patience;
    const g = Math.max(0, grace - dt);
    const rest = dt - (grace - g);
    return { ...c, patience: { total, grace: g, left: Math.max(0, left - rest) } };
}

/** The bar is empty: the customer walks off (the skin's onMiss). */
export const timedOut = (c: Counter) => !c.served && !isEndless(c.patience) && c.patience.left <= 0;

/** Share of the bar left, 0–1. */
export const patienceShare = (p: Patience) => (isEndless(p) ? 1 : Math.min(1, Math.max(0, p.left / p.total)));

/** Under lowAt: the customer gets impatient. */
export const isLow = (p: Patience) => patienceShare(p) < FRITUUR.lowAt;

/** The end screen's title: "Je hielp 7 klanten!". */
export const helpedTitle = (n: number) => (n === 0 ? 'Nog geen klant geholpen. Nog eens?' : `Je hielp ${n} ${n === 1 ? 'klant' : 'klanten'}!`);
