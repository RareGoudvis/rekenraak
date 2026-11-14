// The Pinguïntoren world, in SVG viewBox units, and its camera.

// World units (the SVG viewBox): the floe's top is GROUND, one block is BH high and BW wide.
export const VIEW_W = 240;
export const VIEW_H = 300;
export const GROUND = 270;
export const BH = 26;
export const BW = 100;
// Height the tower may fill before the camera zooms out (penguin and some sky stay in view).
const ROOM = 255;

// A small, fixed sideways offset per block, so the stack looks hand-built rather than ruled.
export const jitter = (i: number) => ((i * 37) % 11) - 5;

/** The camera's zoom for a tower this high: the penguin always in view, the goal line once it is near. */
export function towerScale(count: number, goal: number): number {
    const need = Math.max(count * BH + 80, count >= goal - 5 ? goal * BH + 50 : 0);
    return Math.min(1, ROOM / need);
}
