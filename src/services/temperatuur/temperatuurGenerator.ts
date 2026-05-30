import type { MathBlock, TemperatuurExercise, TemperatuurMode } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

const MAX_T = 25;

export function generateTemperatuurExercises(block: MathBlock): TemperatuurExercise[] {
    const {
        variant = 'kleuren',           // 'kleuren' | 'aflezen' | 'verschil'
        includeNegatives = false,
        mode1 = 'gekleurd',
        mode2 = 'getal',
    } = block.constraints;

    const minT = includeNegatives ? -15 : 0;
    const n = block.numberOfExercises;
    const results: TemperatuurExercise[] = [];

    for (let i = 0; i < n; i++) {
        if (variant === 'verschil') {
            const a = randInt(minT, MAX_T);
            let b = randInt(minT, MAX_T);
            while (b === a) b = randInt(minT, MAX_T);   // need a real difference
            results.push({ id: rndId(), celsius: a, celsius2: b, variant, mode1: mode1 as TemperatuurMode, mode2: mode2 as TemperatuurMode, isManuallyEdited: false });
        } else {
            results.push({ id: rndId(), celsius: randInt(minT, MAX_T), variant, isManuallyEdited: false });
        }
    }
    return results;
}
