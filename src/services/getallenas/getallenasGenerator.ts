import type { MathBlock, GetallenasExercise } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

export function generateGetallenasExercises(block: MathBlock): GetallenasExercise[] {
    const {
        maxGetal = 100,
        step = 5,
        direction = 'right',     // 'right' = ascending L→R, 'left' = descending L→R
        hardMode = false,
        ticks = 6,
    } = block.constraints;

    const n = block.numberOfExercises;
    const span = step * (ticks - 1);
    const results: GetallenasExercise[] = [];

    for (let i = 0; i < n; i++) {
        // Pick the leftmost value so the whole run stays inside [0, maxGetal].
        let start: number;
        if (direction === 'left') {
            // values decrease L→R: leftmost is the largest, must be ≥ span.
            const maxStart = Math.max(span, maxGetal);
            start = randInt(Math.ceil(span / step), Math.floor(maxStart / step)) * step;
        } else {
            const maxStart = Math.max(0, maxGetal - span);
            start = randInt(0, Math.max(0, Math.floor(maxStart / step))) * step;
        }

        // blankMask: keep tick 0 as an anchor; blank the rest at a ratio (hard = more).
        const ratio = hardMode ? 0.6 : 0.4;
        const blankMask = Array.from({ length: ticks }, (_, k) => k !== 0 && Math.random() < ratio);
        if (!blankMask.some(Boolean)) blankMask[ticks - 1] = true; // ensure at least one blank

        results.push({ id: rndId(), start, step, tickCount: ticks, blankMask, direction, isManuallyEdited: false });
    }
    return results;
}
