import { mulberry32 } from '../../distractors';

// Frituur: the queue at the counter. Pure, so the tuning is testable: the customer at the counter asks the sum on
// screen and waits on a patience bar that drains with game time (help and the flashes freeze it). A right answer
// serves them (they leave on the next sum), a wrong order cuts their patience, an empty bar walks them off.

// THE tuning table (the owner tunes it after playing).
export const FRITUUR = {
    // A customer's patience at no streak (ms): time for a slow leerjaar 1 pupil to read and type two digits.
    patienceMs: 12_000,
    // Each right answer in a row takes this off the next customer's patience, so a good run gets busier.
    perStreakMs: 500,
    // Never less: even a long streak leaves time to read a leerjaar 6 sum and type it.
    floorMs: 7_000,
    // A wrong order costs this share of the customer's full patience.
    wrongCut: 1 / 3,
    // Under this share left the customer gets impatient (checks a watch, taps a foot, whines).
    lowAt: 0.35,
    // The bar waits this long for a new customer, who is still stepping up to the counter.
    graceMs: 500,
    // Customers in the queue, the one at the counter included.
    queue: 3,
    // Customers still walking off at once (each walk is a few seconds of CSS).
    leaving: 3,
} as const;

// Kids come twice as often as the rest (a school frituur); never the same kind twice in a row.
export const KINDS = ['kind', 'mama', 'papa', 'opa', 'voetballer', 'hond', 'kind'] as const;
export type CustomerKind = typeof KINDS[number];
export const ORDERS = ['friet', 'curryworst', 'frikandel', 'stoofvlees', 'mayo', 'augurk'] as const;
export type OrderKind = typeof ORDERS[number];
// Looks per kind (shirt, hair, skin tone pick from this).
export const LOOKS = 6;

export const isKid = (kind: CustomerKind) => kind === 'kind' || kind === 'voetballer';
/** The top of the head (hair and hats included) in a person's 100 × 200 box: the patience bar floats just above it. SYNC: art.tsx bodies. */
export const headTopOf = (kind: CustomerKind) => (isKid(kind) ? 78 : kind === 'opa' ? 24 : kind === 'hond' ? 16 : 19);

export interface Customer { id: number; kind: CustomerKind; look: number; order: OrderKind }
export interface Patience { total: number; left: number; grace: number }
export interface Leaver { customer: Customer; mood: 'happy' | 'grumpy' }

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

/** The patience of a customer stepping up after this many right answers in a row. */
export const patienceFor = (streak: number) => Math.max(FRITUUR.floorMs, FRITUUR.patienceMs - FRITUUR.perStreakMs * Math.max(0, streak));

const fresh = (streak: number): Patience => {
    const total = patienceFor(streak);
    return { total, left: total, grace: FRITUUR.graceMs };
};

/** Customer number `id` of this round: seeded, so a round's queue is the same on a replay of its seed. */
export function customerOf(seed: number, id: number, prev: CustomerKind | null): Customer {
    const rng = mulberry32((seed ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0);
    let k = Math.floor(rng() * KINDS.length);
    if (KINDS[k] === prev) k = (k + 1 + Math.floor(rng() * (KINDS.length - 1))) % KINDS.length;
    // Still the same kind (the bag holds 'kind' twice): the next one that differs.
    while (KINDS[k] === prev) k = (k + 1) % KINDS.length;
    return { id, kind: KINDS[k], look: Math.floor(rng() * LOOKS), order: ORDERS[Math.floor(rng() * ORDERS.length)] };
}

/** What comes over the counter on a wrong answer: never what they asked for. */
export const wrongOrderOf = (order: OrderKind, n: number): OrderKind => {
    const i = ORDERS.indexOf(order);
    return ORDERS[(i + 1 + (Math.abs(n) % (ORDERS.length - 1))) % ORDERS.length];
};

export function newCounter(seed: number): Counter {
    const queue: Customer[] = [];
    for (let id = 0; id < FRITUUR.queue; id++) queue.push(customerOf(seed, id, queue.at(-1)?.kind ?? null));
    return { seed, queue, leaving: [], nextId: FRITUUR.queue, patience: fresh(0), served: false, wrongs: 0, servedCount: 0, rev: 0 };
}

/** The customer at the counter leaves (happy with their order, or grumbling); the queue steps up, a new one joins at the back. */
export function walkOff(c: Counter, mood: Leaver['mood'], streak: number): Counter {
    const [front, ...rest] = c.queue;
    const joins = customerOf(c.seed, c.nextId, c.queue.at(-1)?.kind ?? null);
    return {
        ...c, queue: [...rest, joins], nextId: c.nextId + 1, leaving: [...c.leaving, { customer: front, mood }].slice(-FRITUUR.leaving),
        patience: fresh(streak), served: false, wrongs: 0, rev: c.rev + 1,
    };
}

/** A right answer: the order goes over the counter. */
export const serve = (c: Counter): Counter => (c.served ? c : { ...c, served: true, servedCount: c.servedCount + 1, rev: c.rev + 1 });

/** A wrong answer: the wrong order comes out and a third of the patience goes; an empty bar walks them off. */
export function wrongOrder(c: Counter): Counter {
    if (c.served) return c;
    const left = Math.max(0, c.patience.left - c.patience.total * FRITUUR.wrongCut);
    if (left <= 0) return walkOff(c, 'grumpy', 0);
    return { ...c, patience: { ...c.patience, left }, wrongs: c.wrongs + 1, rev: c.rev + 1 };
}

/** A new sum on screen: a served customer goes, the next one steps up (patience by the streak). */
export const nextSum = (c: Counter, streak: number): Counter => (c.served ? walkOff(c, 'happy', streak) : c);

/** dt ms of game time at the counter: the grace runs out first, then the bar. A served customer's bar stands still. */
export function tick(c: Counter, dt: number): Counter {
    if (c.served || dt <= 0) return c;
    const { grace, left, total } = c.patience;
    const g = Math.max(0, grace - dt);
    const rest = dt - (grace - g);
    return { ...c, patience: { total, grace: g, left: Math.max(0, left - rest) } };
}

/** The bar is empty: the customer walks off (the skin's onMiss). */
export const timedOut = (c: Counter) => !c.served && c.patience.left <= 0;

/** Share of the bar left, 0–1. */
export const patienceShare = (p: Patience) => (p.total > 0 ? Math.min(1, Math.max(0, p.left / p.total)) : 0);

/** Under lowAt: the customer gets impatient. */
export const isLow = (p: Patience) => patienceShare(p) < FRITUUR.lowAt;

/** The end screen's title: "Je hielp 7 klanten!". */
export const helpedTitle = (n: number) => (n === 0 ? 'Nog geen klant geholpen. Nog eens?' : `Je hielp ${n} ${n === 1 ? 'klant' : 'klanten'}!`);
