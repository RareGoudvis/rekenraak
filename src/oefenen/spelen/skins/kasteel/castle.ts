// How a castle looks at a number of lives: which blocks still stand, the cracks, the towers, the flag.
// Pure, shared by 1 and 2 players. Local units: the castle's foot at y 0 (up is negative), x 0 = its outer
// side, x 214 = the side facing the other castle.

export type Part = 'outer' | 'wall' | 'inner';

export interface Block {
    id: string;
    part: Part;
    // merlon = a battlement on top; brick = a loose stone in the wall face (leaves a hole).
    kind: 'merlon' | 'brick';
    x: number;
    y: number;
    w: number;
    h: number;
}

const m = (id: string, part: Part, x: number, y: number, w: number, h: number): Block => ({ id, part, kind: 'merlon', x, y, w, h });
const b = (id: string, part: Part, x: number, y: number, w: number): Block => ({ id, part, kind: 'brick', x, y, w, h: 12 });

// In the order they fall off. The inner tower is bare by half (when it topples), the outer one by a quarter.
export const BLOCKS: readonly Block[] = [
    m('i1', 'inner', 202, -178, 12, 14), m('w5', 'wall', 150, -140, 16, 16), m('i2', 'inner', 185, -178, 12, 14), b('wb1', 'wall', 116, -98, 26), m('i3', 'inner', 168, -178, 12, 14),
    m('w4', 'wall', 126, -140, 16, 16), b('ib1', 'inner', 176, -140, 24), b('wb2', 'wall', 58, -110, 26), b('ib2', 'inner', 182, -78, 22), m('w3', 'wall', 102, -140, 16, 16),
    m('o1', 'outer', 0, -212, 14, 16), m('o2', 'outer', 21, -212, 14, 16), b('ob1', 'outer', 8, -150, 22), m('o3', 'outer', 42, -212, 14, 16), b('ob2', 'outer', 22, -96, 24),
    b('wb3', 'wall', 140, -42, 24), m('w2', 'wall', 78, -140, 16, 16), b('wb4', 'wall', 66, -74, 22), m('w1', 'wall', 54, -140, 16, 16), b('wb5', 'wall', 58, -30, 24),
];

/** How many blocks still stand at hp of lives (all at full lives, none at 0). */
export const standing = (hp: number, lives: number) => Math.ceil(BLOCKS.length * Math.max(0, Math.min(hp, lives)) / lives);

/** Block i (in BLOCKS order) is gone at this hp. */
export const isGone = (i: number, hp: number, lives: number) => i < BLOCKS.length - standing(hp, lives);

/** The blocks a hit knocks off, from hp before to hp after. */
export function knockedOff(before: number, after: number, lives: number): Block[] {
    return BLOCKS.slice(BLOCKS.length - standing(before, lives), BLOCKS.length - standing(after, lives));
}

// Where a stone hits when no block falls (30 lives): the wall's middle.
const WALL_MID = { x: 112, y: -80 };

/** Where the stone that brings a castle to hpAfter lands (local units): the last block it knocks off, else the next to go. */
export function aimAt(hpAfter: number, lives: number, hpBefore = hpAfter + 1): { x: number; y: number } {
    const off = knockedOff(hpBefore, hpAfter, lives);
    const next = BLOCKS[BLOCKS.length - standing(hpAfter, lives)];
    const blk = off.at(-1) ?? next;
    return blk ? { x: blk.x + blk.w / 2, y: blk.y + blk.h / 2 } : WALL_MID;
}

export type TowerState = 'up' | 'lean' | 'down';
export type FlagState = 'up' | 'droop' | 'low' | 'gone' | 'raised';

export interface CastleStage {
    // Cracks in the walls, one more at 85 %, 60 % and 40 %.
    cracks: number;
    inner: TowerState;
    outer: TowerState;
    flag: FlagState;
    // At 0: one rubble heap.
    fallen: boolean;
}

/** The castle at hp of lives: the inner tower leans at 75 % and topples at 50 %, the outer one at 50 % and 25 %. */
export function stageOf(hp: number, lives: number, won = false): CastleStage {
    const f = Math.max(0, hp) / lives;
    const fallen = hp <= 0;
    return {
        cracks: (f <= 0.85 ? 1 : 0) + (f <= 0.6 ? 1 : 0) + (f <= 0.4 ? 1 : 0),
        inner: f <= 0.5 ? 'down' : f <= 0.75 ? 'lean' : 'up',
        outer: f <= 0.25 ? 'down' : f <= 0.5 ? 'lean' : 'up',
        flag: fallen ? 'gone' : won ? 'raised' : f <= 0.25 ? 'low' : f <= 0.5 ? 'droop' : 'up',
        fallen,
    };
}

/** The life bar's colour: green over half, yellow over a quarter, then red. */
export const hpTone = (hp: number, lives: number): 'ok' | 'mid' | 'low' => (hp / lives > 0.5 ? 'ok' : hp / lives > 0.25 ? 'mid' : 'low');
