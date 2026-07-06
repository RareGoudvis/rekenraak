import type { MathBlock, WeegschaalExercise } from '../math/types';

// Weegschaal — grams snap to the dial's schaalverdeling so the needle always sits
// exactly on a tick. Valid step options depend on the bereik (dial range).

export const BEREIK_STEPS: Record<number, number[]> = {
    1000: [50, 25, 100],
    2000: [100, 50],
    5000: [250, 100],
};

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateWeegschaalExercises(block: MathBlock): WeegschaalExercise[] {
    const c = block.constraints;
    const bereikGram: number = c.bereikGram ?? 1000;
    const allowed = BEREIK_STEPS[bereikGram] ?? [50];
    const stepGram: number = allowed.includes(c.stepGram) ? c.stepGram : allowed[0];
    const count = block.numberOfExercises || 4;

    const out: WeegschaalExercise[] = [];
    const seen = new Set<number>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        // Never 0 and never the full bereik — both read as "empty dial" mistakes.
        const grams = randInt(1, bereikGram / stepGram - 1) * stepGram;
        if (seen.has(grams)) continue;
        seen.add(grams);
        out.push({ id: Math.random().toString(36).substring(2, 9), grams, isManuallyEdited: false });
    }
    return out;
}

// Answer text per notatie: '750 g' · '0,750 kg' · '1 kg 250 g'.
export function formatGewicht(grams: number, notatie: string): string {
    if (notatie === 'kg-komma') {
        const kg = grams / 1000;
        return `${String(kg).replace('.', ',')} kg`;
    }
    if (notatie === 'kg-g') {
        const kg = Math.floor(grams / 1000);
        const rest = grams % 1000;
        if (kg === 0) return `${rest} g`;
        if (rest === 0) return `${kg} kg`;
        return `${kg} kg ${rest} g`;
    }
    return `${grams} g`;
}
