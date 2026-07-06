import type { MathBlock, TijdsduurExercise } from '../math/types';

// Tijdsduur berekenen — begin | einde | duur rows with one blank each.
// Times in minutes since 00:00; endMin > 1440 means "over middernacht".

const GRANULARITY_STEP: Record<string, number> = {
    'heel-uur': 60, 'kwartier': 15, 'vijf-min': 5, 'een-min': 1,
};

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

export function generateTijdsduurExercises(block: MathBlock): TijdsduurExercise[] {
    const c = block.constraints;
    const granularity: string[] = c.granularity ?? ['kwartier'];
    const blanks: ('duur' | 'einde' | 'begin')[] = c.blanks ?? ['duur'];
    const maxDuurMin: number = c.maxDuurMin ?? 240;
    const overMidnight: boolean = c.overMidnight ?? false;
    const count = block.numberOfExercises || 6;

    const steps = granularity.map(g => GRANULARITY_STEP[g]).filter(Boolean);
    const stepPool = steps.length ? steps : [15];

    const out: TijdsduurExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const step = pick(stepPool);
        // Daytime starts (06:00–22:00) keep the exercises relatable.
        const startMin = randInt(Math.ceil(360 / step), Math.floor(1320 / step)) * step;
        const duur = randInt(1, Math.max(1, Math.floor(maxDuurMin / step))) * step;
        const endMin = startMin + duur;
        if (!overMidnight && endMin >= 1440) continue;
        const key = `${startMin}-${endMin}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            id: Math.random().toString(36).substring(2, 9),
            startMin, endMin, blank: pick(blanks.length ? blanks : ['duur']),
            isManuallyEdited: false,
        });
    }
    return out;
}

// "3 u 45 min" / "45 min" / "3 u" — duration formatting for viewer + solutions.
export function formatDuur(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} u`;
    return `${h} u ${m} min`;
}
