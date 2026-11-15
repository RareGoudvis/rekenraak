// The Pinguïntoren world, in SVG viewBox units, its camera, the look of each ice block and the penguin's mood.

// World units (the SVG viewBox): the floe's top is GROUND, one block is BH high and about BW wide.
export const VIEW_W = 240;
export const VIEW_H = 300;
export const GROUND = 270;
// The waterline: 8% up from the bottom of the view (the HTML sea band in pinguintoren.css sits there too).
export const WATER = 276;
export const BH = 26;
export const BW = 100;
// Height the tower may fill before the camera zooms out (penguin and some sky stay in view).
const ROOM = 255;
// The camera zooms around this point (the middle of the floe).
export const CAM_X = 120;
export const CAM_Y = GROUND;

/** The camera's zoom for a tower this high: the penguin always in view, the goal line once it is near. */
export function towerScale(count: number, goal: number): number {
    const need = Math.max(count * BH + 80, count >= goal - 5 ? goal * BH + 50 : 0);
    return Math.min(1, ROOM / need);
}

/** Where a world point lands on screen under the camera, as % of the view (for the HTML bursts). */
export function onScreen(x: number, y: number, scale: number): { left: string; top: string } {
    const sx = CAM_X + (x - CAM_X) * scale;
    const sy = CAM_Y + (y - CAM_Y) * scale;
    return { left: `${(sx / VIEW_W) * 100}%`, top: `${(sy / VIEW_H) * 100}%` };
}

// ── Ice blocks ───────────────────────────────────────────────────────────────
export type BlockDeco = 'shine' | 'frost' | 'bubbles' | 'snowcap';
export type Creature = 'fish' | 'crab';

export interface BlockLook {
    // Which of the four ice tints (pinguintoren.css --pt-ice-0 … 3).
    shade: 0 | 1 | 2 | 3;
    width: number;
    // Sideways offset, so the stack looks hand-built rather than ruled.
    dx: number;
    deco: BlockDeco;
    corner: number;
    // A little old sea creature frozen inside (one block per round).
    creature?: Creature;
}

const DECOS: readonly BlockDeco[] = ['shine', 'frost', 'bubbles', 'shine', 'snowcap', 'bubbles', 'frost'];

// A small integer hash: the same block id and round seed always give the same block.
function mix(a: number, b: number): number {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    return h >>> 0;
}

/** The round's frozen creature: which block (an early one, so it is seen) and which animal. */
export function creatureOf(seed: number): { at: number; kind: Creature } {
    const h = mix(seed, 7);
    return { at: 2 + (h % 5), kind: (h >>> 8) % 2 ? 'crab' : 'fish' };
}

/** How block number id (the n-th block built this round) looks. */
export function blockLook(id: number, seed: number): BlockLook {
    const h = mix(id, seed);
    const creature = creatureOf(seed);
    return {
        shade: (h % 4) as BlockLook['shade'],
        // 88 … 110 wide: a few slim ones, a few chunky ones.
        width: 88 + ((h >>> 3) % 12) * 2,
        dx: ((h >>> 7) % 11) - 5,
        deco: DECOS[(h >>> 11) % DECOS.length],
        corner: 4 + ((h >>> 14) % 4),
        ...(id === creature.at && { creature: creature.kind }),
    };
}

// ── The penguin ──────────────────────────────────────────────────────────────
export type Mood = 'neutral' | 'smile' | 'grin' | 'dance' | 'worried' | 'scared';

/** The penguin's face for a tower this high: happier the higher he gets, scared on a mistake, worried on cracks. */
export function penguinMood(height: number, goal: number, at: { wrong?: boolean; cracked?: boolean } = {}): Mood {
    if (at.wrong) return 'scared';
    if (at.cracked) return 'worried';
    if (goal > 4 && height >= goal - 3) return 'dance';
    if (height >= goal * 0.5) return 'grin';
    if (height >= goal * 0.2) return 'smile';
    return 'neutral';
}
