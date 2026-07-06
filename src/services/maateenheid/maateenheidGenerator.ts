import type { MathBlock, MaateenheidExercise } from '../math/types';
import { MAAT_ITEMS, UNIT_POOLS } from './maateenheidData';

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function generateMaateenheidExercises(block: MathBlock): MaateenheidExercise[] {
    const c = block.constraints;
    const grootheden: string[] = c.grootheden ?? ['lengte', 'massa', 'inhoud'];
    const answerMode: string = c.answerMode ?? 'omcirkelen';
    // Omcirkelen needs ≥3 units for distractors — that excludes temperatuur (only °C).
    const usable = grootheden.filter(g => MAAT_ITEMS[g] && (answerMode === 'schrijven' || UNIT_POOLS[g].length >= 3));
    const pool = usable.length ? usable : ['lengte'];
    const count = block.numberOfExercises || 8;

    const out: MaateenheidExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const grootheid = pick(pool);
        const item = pick(MAAT_ITEMS[grootheid]);
        if (seen.has(item.sentence)) continue;
        seen.add(item.sentence);
        let choices: string[] | undefined;
        if (answerMode === 'omcirkelen') {
            const distractors = shuffle(UNIT_POOLS[grootheid].filter(u => u !== item.unit)).slice(0, 2);
            choices = shuffle([item.unit, ...distractors]);
        }
        out.push({
            id: Math.random().toString(36).substring(2, 9),
            sentence: item.sentence, value: item.value, unit: item.unit,
            grootheid, choices, isManuallyEdited: false,
        });
    }
    return out;
}
