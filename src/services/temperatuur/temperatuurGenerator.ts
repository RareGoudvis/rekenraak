import type { MathBlock, TemperatuurExercise } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

const MAX_T = 30;

export function generateTemperatuurExercises(block: MathBlock): TemperatuurExercise[] {
    const {
        variant = 'kleuren',           // 'kleuren' | 'aflezen'
        includeNegatives = false,
    } = block.constraints;

    const minT = includeNegatives ? -20 : 0;
    const n = block.numberOfExercises;
    const results: TemperatuurExercise[] = [];

    for (let i = 0; i < n; i++) {
        results.push({ id: rndId(), celsius: randInt(minT, MAX_T), variant, isManuallyEdited: false });
    }
    return results;
}
