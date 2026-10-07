import type { MathBlock, GeldExercise, GeldDenomination, GeldDenominationType, GeldWisselExercise, GeldTeruggevenExercise } from '../math/types';
import { countOefeningen, repeatNote } from '../generationNotes';
import type { GeldConstraints, GeldWisselConstraints, GeldTeruggevenConstraints } from '../math/constraintTypes';

// All denominations in cents, largest first
const DENOMINATION_CATALOGUE: { valueCents: number; type: GeldDenominationType }[] = [
    { valueCents: 50000, type: 'bill' },       // €500
    { valueCents: 20000, type: 'bill' },       // €200
    { valueCents: 10000, type: 'bill' },       // €100
    { valueCents:  5000, type: 'bill' },       // €50
    { valueCents:  2000, type: 'bill' },       // €20
    { valueCents:  1000, type: 'bill' },       // €10
    { valueCents:   500, type: 'bill' },       // €5
    { valueCents:   200, type: 'euro-coin' },  // €2
    { valueCents:   100, type: 'euro-coin' },  // €1
    { valueCents:    50, type: 'cent-coin' },  // 50c
    { valueCents:    20, type: 'cent-coin' },  // 20c
    { valueCents:    10, type: 'cent-coin' },  // 10c
    { valueCents:     5, type: 'cent-coin' },  // 5c
];

const MAX_ITEMS_PER_EXERCISE = 12;
const MAX_DRAW_ATTEMPTS = 200;

function breakdownAmount(
    amountCents: number,
    allowedValues: Set<number>,
    rng: () => number,
): GeldDenomination[] {
    const allowed = DENOMINATION_CATALOGUE.filter(d => allowedValues.has(d.valueCents));
    const result: GeldDenomination[] = [];
    let remaining = amountCents;
    let totalItems = 0;

    for (const denom of allowed) {
        if (remaining <= 0 || totalItems >= MAX_ITEMS_PER_EXERCISE) break;
        // Add randomness: 20% chance to skip largest if something smaller still fits
        const nextDenom = allowed[allowed.indexOf(denom) + 1];
        if (nextDenom && remaining >= nextDenom.valueCents && rng() < 0.2) continue;

        const maxCount = Math.min(
            Math.floor(remaining / denom.valueCents),
            MAX_ITEMS_PER_EXERCISE - totalItems,
        );
        if (maxCount <= 0) continue;
        result.push({ valueCents: denom.valueCents, type: denom.type, count: maxCount });
        remaining -= denom.valueCents * maxCount;
        totalItems += maxCount;
    }

    // remaining > 0 = not drawable within the cap; the caller redraws the amount
    return result;
}

function seededRng(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

export function generateGeldExercises(block: MathBlock): GeldExercise[] {
    return generateGeldExercisesNoted(block).items;
}

export function generateGeldExercisesNoted(block: MathBlock): { items: GeldExercise[]; note: string | null } {
    const {
        maxGetal = 10,
        format = 'euros',
        allowedDenominations = DENOMINATION_CATALOGUE.map(d => d.valueCents),
    } = block.constraints as GeldConstraints;

    const n = block.numberOfExercises || 6;
    const maxCents = maxGetal * 100;
    const allowedSet = new Set<number>(allowedDenominations as number[]);
    const isTekenen = block.typeId === 'geld-tekenen';

    // Smallest allowed denomination determines minimum amount
    const allowedSorted = [...allowedSet].filter(v => v <= maxCents).sort((a, b) => a - b);
    const minCents = allowedSorted[0] ?? 5;

    // reachable[k]: k * 5 cents can be paid exactly with the ticked set (unbounded coin change).
    const reachable = new Uint8Array(Math.floor(maxCents / 5) + 1);
    reachable[0] = 1;
    for (let k = 1; k < reachable.length; k++) {
        for (const v of allowedSorted) if (v % 5 === 0 && k * 5 >= v && reachable[k - v / 5]) { reachable[k] = 1; break; }
    }
    let widened = 0;      // herkennen: exercises paid with coins the teacher did not tick
    let unpayable = 0;    // tekenen: exercises whose amount the ticked set cannot make

    const exercises: GeldExercise[] = [];
    // Seeded from Math.random, NOT Date.now(): the DEV harnesses replace Math.random with
    // a seeded PRNG (window.__rekenraak.seed) and a wall-clock seed made these generators
    // the only ones that could not be diffed across two runs.
    const rng = seededRng(Math.floor(Math.random() * 0x10000));

    for (let i = 0; i < n; i++) {
        let finalAmount = 0;
        let denominations: GeldDenomination[] = [];
        // Redraw when the breakdown cannot reach the amount (item cap, or a denomination set
        // greedy cannot pay exactly): the key must equal what is drawn on the sheet.
        for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS; attempt++) {
            // Pick random amount, rounded to nearest allowed min denomination
            const raw = Math.floor(rng() * (maxCents - minCents + 1)) + minCents;
            const amountCents = Math.round(raw / minCents) * minCents;

            // 'euros' format asks for a whole-euro answer, so the amount itself must be whole
            // (was: only without cent coins, and the key then rounded the cents away).
            finalAmount = format === 'euros'
                ? Math.max(100, Math.round(amountCents / 100) * 100)
                : amountCents;

            if (isTekenen) {
                // Tekenen: student draws, we don't generate denominations — but the amount must be drawable from the ticked set
                const payable = finalAmount % 5 === 0 && finalAmount / 5 < reachable.length && reachable[finalAmount / 5] === 1;
                if (payable) break;
                if (attempt === MAX_DRAW_ATTEMPTS - 1) unpayable++;
                continue;
            }
            denominations = breakdownAmount(finalAmount, allowedSet, rng);
            const drawnCents = denominations.reduce((sum, d) => sum + d.valueCents * d.count, 0);
            if (drawnCents === finalAmount) break;
            if (attempt === MAX_DRAW_ATTEMPTS - 1) {
                // Amount too big for the ticked coins within the item cap: the drawn money is the amount,
                // as long as that is a real price (not 0, whole euros in euros format).
                if (drawnCents > 0 && (format !== 'euros' || drawnCents % 100 === 0)) { finalAmount = drawnCents; break; }
                // Impossible settings (nothing ticked, only bills above the max, 5c-only in euros): pay with
                // the whole catalogue so the amount stays a real price, and say so in the note.
                const wide = new Set(DENOMINATION_CATALOGUE.filter(d => d.valueCents <= Math.max(maxCents, 5)).map(d => d.valueCents));
                let fixed = false;
                for (let r = 0; r < MAX_DRAW_ATTEMPTS && !fixed; r++) {
                    const retry = breakdownAmount(finalAmount, wide, rng);
                    if (retry.reduce((sum, d) => sum + d.valueCents * d.count, 0) === finalAmount) { denominations = retry; fixed = true; }
                }
                widened++;
                if (!fixed) finalAmount = drawnCents;
            }
        }

        exercises.push({
            id: `geld-${Date.now()}-${i}-${Math.floor(rng() * 9999)}`,
            amountCents: finalAmount,
            denominations,
            isManuallyEdited: false,
        });
    }

    const parts: string[] = [];
    if (widened > 0) parts.push(`De gekozen coupures volstaan niet voor ${countOefeningen(widened)}; daarvoor zijn ook andere coupures gebruikt.`);
    if (unpayable > 0) parts.push(`Bij ${countOefeningen(unpayable)} is het bedrag niet met de gekozen coupures te leggen.`);
    return { items: exercises, note: parts.length ? parts.join(' ') : null };
}

export function generateGeldWisselExercises(block: MathBlock): GeldWisselExercise[] {
    const exerciseBills: number[] = (block.constraints as GeldWisselConstraints).exerciseBills ?? [500];
    const n = block.numberOfExercises || 4;
    return Array.from({ length: n }, (_, i) => ({
        id: `geld-wissel-${Date.now()}-${i}`,
        // cycle through exerciseBills; if fewer entries than exercises, repeat last
        billValueCents: exerciseBills[i] ?? exerciseBills[exerciseBills.length - 1] ?? 500,
        isManuallyEdited: false,
    }));
}

const BILL_DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

// Belgian prices are rounded to 5ct, so only multiples of 5 are used
const CENTEN_POOLS: Record<string, number[]> = {
    vijfentwintig: [25, 50, 75],
    tien:          [10, 20, 30, 40, 50, 60, 70, 80, 90],
    vijf:          [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
};

export function generateGeldTeruggevenExercises(block: MathBlock): GeldTeruggevenExercise[] {
    return generateGeldTeruggevenExercisesNoted(block).items;
}

export function generateGeldTeruggevenExercisesNoted(block: MathBlock): { items: GeldTeruggevenExercise[]; note: string | null } {
    const {
        minPriceEuros = 1,
        maxPriceEuros = 49,
        payWithOptions = [1000, 2000, 5000],
        centenDeel = 'vijf',
    } = block.constraints as GeldTeruggevenConstraints;
    const n = block.numberOfExercises || 4;
    // Seeded from Math.random, NOT Date.now(): the DEV harnesses replace Math.random with
    // a seeded PRNG (window.__rekenraak.seed) and a wall-clock seed made these generators
    // the only ones that could not be diffed across two runs.
    const rng = seededRng(Math.floor(Math.random() * 0x10000));
    const exercises: GeldTeruggevenExercise[] = [];
    const used = new Set<string>();
    const cenPool = CENTEN_POOLS[centenDeel as string] ?? CENTEN_POOLS.vijf;

    let attempts = 0;
    while (exercises.length < n && attempts < 20000) {
        attempts++;
        const options = (payWithOptions as number[]).filter(v => BILL_DENOMINATIONS.includes(v));
        if (options.length === 0) break;
        const payWithCents = options[Math.floor(rng() * options.length)];
        const maxPriceForPayWith = Math.floor(payWithCents / 100) - 1;
        const effectiveMax = Math.min(maxPriceEuros, maxPriceForPayWith);
        if (effectiveMax < minPriceEuros) continue;

        const priceEuros = Math.floor(rng() * (effectiveMax - minPriceEuros + 1)) + minPriceEuros;
        const centsPart = cenPool[Math.floor(rng() * cenPool.length)];
        const priceCents = priceEuros * 100 + centsPart;
        const key = `${priceCents}-${payWithCents}`;
        if (used.has(key)) continue;
        used.add(key);

        const waypointCents = Math.ceil(priceCents / 100) * 100;
        const step1Cents = waypointCents - priceCents;
        const step2Cents = payWithCents - waypointCents;
        const changeCents = payWithCents - priceCents;

        exercises.push({
            id: `geld-tg-${Date.now()}-${exercises.length}`,
            priceCents,
            payWithCents,
            changeCents,
            waypointCents,
            step1Cents,
            step2Cents,
            isManuallyEdited: false,
        });
    }
    // A narrow price/pay-with space (e.g. only €5 notes) runs out of distinct sums; repeat rather than fall short.
    const distinct = exercises.length;
    for (let i = 0; distinct > 0 && exercises.length < n; i++) {
        exercises.push({ ...exercises[i % distinct], id: `geld-tg-${Date.now()}-${exercises.length}` });
    }
    return { items: exercises, note: repeatNote(exercises.length - distinct) };
}

export function formatAmount(amountCents: number, format: string): string {
    // Whole-euro form only when there are no cents to lose (older sheets can hold cents here)
    if (format === 'euros' && amountCents % 100 === 0) {
        return `€${amountCents / 100}`;
    }
    const euros = Math.floor(amountCents / 100);
    const cents = amountCents % 100;
    return `€${euros},${String(cents).padStart(2, '0')}`;
}

export function denominationLabel(valueCents: number): string {
    if (valueCents >= 100) return `€${valueCents / 100}`;
    return `${valueCents}c`;
}

export { DENOMINATION_CATALOGUE };
