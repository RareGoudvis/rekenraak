// Schatkist: the loot heap beside the chest and the crab, pure. A scored right answer adds a coin, an opened chest a
// gem. Three wrong sums in a row bring a crab that takes the newest coin off the heap and drops it beside the chest.
// The crab is only a funny moment: the dropped coin is still the pupil's and the score never changes.

export type LootKind = 'coin' | 'gem';
export interface Loot { id: number; kind: LootKind }

export interface Heap {
    // On the heap, in the order they came.
    items: Loot[];
    // Coins the crab dropped on the sand beside the chest.
    dropped: number;
    // Wrong sums in a row.
    run: number;
    nextId: number;
}

export const CRAB_AFTER = 3;

export const newHeap = (): Heap => ({ items: [], dropped: 0, run: 0, nextId: 0 });

const add = (h: Heap, kind: LootKind): Heap => ({ ...h, items: [...h.items, { id: h.nextId, kind }], nextId: h.nextId + 1 });

/** A right sum ends the wrong run; a scored one (not met hulp) adds a coin. */
export const right = (h: Heap, scored: boolean): Heap => (scored ? add({ ...h, run: 0 }, 'coin') : { ...h, run: 0 });

/** An opened chest adds a gem. */
export const gem = (h: Heap): Heap => add(h, 'gem');

/** The coin a crab would take: the newest coin on the heap (gems stay put). */
export function crabTarget(h: Heap): Loot | null {
    for (let i = h.items.length - 1; i >= 0; i--) if (h.items[i].kind === 'coin') return h.items[i];
    return null;
}

/** A wrong sum: the third in a row sends the crab for a coin (none on the heap, or a crab still busy = no crab). */
export function wrong(h: Heap, crabBusy = false): { heap: Heap; crab: Loot | null } {
    const run = h.run + 1;
    if (run < CRAB_AFTER) return { heap: { ...h, run }, crab: null };
    return { heap: { ...h, run: 0 }, crab: crabBusy ? null : crabTarget(h) };
}

/** The crab picks the coin up: it leaves the heap. */
export const grab = (h: Heap, id: number): Heap => ({ ...h, items: h.items.filter(l => l.id !== id) });

/** The crab drops it beside the chest. */
export const drop = (h: Heap): Heap => ({ ...h, dropped: h.dropped + 1 });

export const coinsOf = (h: Heap): number => h.items.filter(l => l.kind === 'coin').length + h.dropped;

// ── Geometry, in the island's 400 × 300 viewBox ─────────────────────────────

// The heap's foot, right of the chest (its bottom edge is y 270).
export const HEAP_X = 342;
export const HEAP_Y = 268;
// A flat coin seen from the side: rows 7 apart, coins 15 apart (they overlap a little), every other row shifted half a coin.
const COL = 15;
const ROW = 7;
// The mound's half width per unit of height, plus its foot.
const SLOPE = 0.6;
const FOOT = 10;
export const HEAP_SLOTS = 72;

// The smallest mound height that holds a point (dx from the middle, up from the foot).
function sizeFor(dx: number, up: number): number {
    let lo = up, hi = up + 200;
    for (let k = 0; k < 30; k++) {
        const s = (lo + hi) / 2;
        const half = SLOPE * s + FOOT;
        if (Math.abs(dx) < half && up <= s * (1 - (dx / half) ** 2)) hi = s; else lo = s;
    }
    return hi;
}

// Every slot, ordered so the first n always make a rounded heap that grows outwards and upwards.
const SLOTS: { x: number; y: number }[] = (() => {
    const cells: { x: number; y: number; s: number; up: number }[] = [];
    for (let r = 0; r < 14; r++) {
        for (let c = -7; c <= 7; c++) {
            const dx = (c + (r % 2) / 2) * COL;
            const up = r * ROW;
            cells.push({ x: HEAP_X + dx, y: HEAP_Y - up, s: sizeFor(dx, up), up });
        }
    }
    cells.sort((a, b) => a.s - b.s || a.up - b.up || Math.abs(a.x - HEAP_X) - Math.abs(b.x - HEAP_X) || a.x - b.x);
    // A coin above the sand rests on a coin below it: take the first cell in mound order that has one.
    const key = (x: number, y: number) => `${Math.round(x * 2)},${Math.round(y * 2)}`;
    const placed = new Set<string>();
    const out: { x: number; y: number }[] = [];
    while (out.length < HEAP_SLOTS) {
        const i = cells.findIndex(c => c.up === 0 || (placed.has(key(c.x - COL / 2, c.y + ROW)) || placed.has(key(c.x + COL / 2, c.y + ROW))));
        const [c] = cells.splice(i, 1);
        placed.add(key(c.x, c.y));
        out.push({ x: c.x, y: c.y });
    }
    return out;
})();

/** Where the i-th item on the heap lies; past the last slot, items share the top. */
export const heapSlot = (i: number): { x: number; y: number } => SLOTS[Math.min(i, HEAP_SLOTS - 1)];

// Dropped coins lie in the sand left of the chest, a little row that wraps.
export const DROP_X = 108;
export const DROP_Y = 280;
export const dropSpot = (i: number): { x: number; y: number } => ({ x: DROP_X - (i % 4) * 17 + (Math.floor(i / 4) % 2) * 7, y: DROP_Y - Math.floor(i / 4) * 6 });
