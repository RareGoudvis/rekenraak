// Schatkist: the loot heap beside the chest and the crab, pure. Every counted right answer adds a coin (the heap
// follows the session's score, so it grows from the very first answer), an opened chest adds a gem. Three wrong sums
// in a row bring a crab that takes the newest coin or gem off the heap and carries it into the sea: the heap shrinks
// for good. The score never changes (those answers were right); the loot is what the crab takes.

export type LootKind = 'coin' | 'gem';
export interface Loot { id: number; kind: LootKind }

export interface Heap {
    // On the heap, in the order they came.
    items: Loot[];
    // Coins earned so far (the session's score when they were handed out).
    earned: number;
    // Coins and gems the crab carried off.
    stolen: number;
    // Wrong sums in a row.
    run: number;
    nextId: number;
}

export const CRAB_AFTER = 3;

export const newHeap = (): Heap => ({ items: [], earned: 0, stolen: 0, run: 0, nextId: 0 });

const add = (h: Heap, kind: LootKind): Heap => ({ ...h, items: [...h.items, { id: h.nextId, kind }], nextId: h.nextId + 1 });

/** A coin for every counted right answer not yet paid out (met hulp never scores, so it gives none). */
export function earnTo(h: Heap, score: number): Heap {
    let next = h;
    while (next.earned < score) next = { ...add(next, 'coin'), earned: next.earned + 1 };
    return next;
}

/** A right sum ends the wrong run. */
export const right = (h: Heap): Heap => (h.run ? { ...h, run: 0 } : h);

/** An opened chest adds a gem. */
export const gem = (h: Heap): Heap => add(h, 'gem');

/** What a crab would take: the newest coin or gem on the heap. */
export const crabTarget = (h: Heap): Loot | null => h.items.at(-1) ?? null;

/** A wrong sum: the third in a row sends the crab (an empty heap, or a crab still busy = no crab); the run starts over. */
export function wrong(h: Heap, crabBusy = false): { heap: Heap; crab: Loot | null } {
    const run = h.run + 1;
    if (run < CRAB_AFTER) return { heap: { ...h, run }, crab: null };
    return { heap: { ...h, run: 0 }, crab: crabBusy ? null : crabTarget(h) };
}

/** The crab picks it up: it leaves the heap for good. */
export function steal(h: Heap, id: number): Heap {
    if (!h.items.some(l => l.id === id)) return h;
    return { ...h, items: h.items.filter(l => l.id !== id), stolen: h.stolen + 1 };
}

export const coinsOf = (h: Heap): number => h.items.filter(l => l.kind === 'coin').length;
export const gemsOf = (h: Heap): number => h.items.filter(l => l.kind === 'gem').length;

/** The end screen's loot line: "7 munten en 1 edelsteen in je schat, de krab pikte er 2". */
export function lootLine(h: Heap): string {
    const coins = coinsOf(h);
    const gems = gemsOf(h);
    const parts = [
        ...(coins ? [`${coins} ${coins === 1 ? 'munt' : 'munten'}`] : []),
        ...(gems ? [`${gems} ${gems === 1 ? 'edelsteen' : 'edelstenen'}`] : []),
    ];
    const kept = parts.length ? `${parts.join(' en ')} in je schat` : 'nog niets in je schat';
    return h.stolen ? `${kept}, de krab pikte er ${h.stolen}` : kept;
}

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

// Where the crab goes back into the water: just behind the island's far edge, right of the heap (the sand hides its legs
// there), in view on phones and behind no keypad.
export const SHORE = { x: 378, y: 212 };
