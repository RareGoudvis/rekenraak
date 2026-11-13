// Metric ladders. factor = value relative to the SMALLEST unit, so every factor is a power of
// 10 and all conversions stay exact integers. Oppervlakte steps ×100 and includes the are-units
// ha/a/ca as aliases of hm²/dam²/m² (equal factors — handled by the strict-pair logic below).
export interface Unit { key: string; factor: number; }
export const LADDERS: Record<string, Unit[]> = {
    lengte: [{ key: 'km', factor: 1e6 }, { key: 'hm', factor: 1e5 }, { key: 'dam', factor: 1e4 }, { key: 'm', factor: 1e3 }, { key: 'dm', factor: 1e2 }, { key: 'cm', factor: 1e1 }, { key: 'mm', factor: 1 }],
    inhoud: [{ key: 'kl', factor: 1e6 }, { key: 'hl', factor: 1e5 }, { key: 'dal', factor: 1e4 }, { key: 'l', factor: 1e3 }, { key: 'dl', factor: 1e2 }, { key: 'cl', factor: 1e1 }, { key: 'ml', factor: 1 }],
    massa: [{ key: 'kg', factor: 1e6 }, { key: 'hg', factor: 1e5 }, { key: 'dag', factor: 1e4 }, { key: 'g', factor: 1e3 }, { key: 'dg', factor: 1e2 }, { key: 'cg', factor: 1e1 }, { key: 'mg', factor: 1 }],
    oppervlakte: [
        { key: 'km²', factor: 1e12 },
        { key: 'hm²', factor: 1e10 }, { key: 'ha', factor: 1e10 },
        { key: 'dam²', factor: 1e8 }, { key: 'a', factor: 1e8 },
        { key: 'm²', factor: 1e6 }, { key: 'ca', factor: 1e6 },
        { key: 'dm²', factor: 1e4 }, { key: 'cm²', factor: 1e2 }, { key: 'mm²', factor: 1 },
    ],
};

export function ladderFor(measure: string): Unit[] {
    return LADDERS[measure] ?? LADDERS.lengte;
}

// The measure whose ladder holds every one of these unit keys (the keys are unique across ladders), or null.
export function measureOfKeys(keys: string[]): string | null {
    return Object.keys(LADDERS).find(m => keys.every(k => LADDERS[m].some(u => u.key === k))) ?? null;
}
