import { describe, test, expect } from 'vitest';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { LEERJAREN } from '../config/gradePresets';
import { ZELF_LABELS } from '../oefenen/zelf/zelfLabels';
import { choicesFor, numberKindOf, usableVariants } from '../oefenen/zelf/zelfSessie';
import { resolveCard } from '../config/eenvoudig/resolveCard';

const KOMMA_TOPIC = 'Kommagetallen en procenten';

describe('Zelf oefenen labels', () => {
    test('every heading the picker can show has a child label (new cards cannot slip through)', async () => {
        const data = await loadEenvoudigData();
        const missing = new Set<string>();
        let seen = 0;
        for (const g of LEERJAREN) {
            for (const t of usableVariants(data, g).keys()) {
                for (const c of choicesFor(data, g, t)) {
                    if (!c.source) continue;
                    seen++;
                    const label = ZELF_LABELS[t]?.[c.source];
                    if (label === undefined) missing.add(`${t} :: ${c.source}`);
                    else expect(c.label).toBe(label);
                    // The picker button stays short: at most 4 words.
                    expect(c.label.split(/\s+/).length, c.label).toBeLessThanOrEqual(4);
                }
            }
        }
        expect(seen).toBeGreaterThan(80);
        expect([...missing], 'add these to src/oefenen/zelf/zelfLabels.ts').toEqual([]);
    });

    test('no label table row is stale (every row is used somewhere)', async () => {
        const data = await loadEenvoudigData();
        const used = new Set<string>();
        for (const g of LEERJAREN) for (const t of usableVariants(data, g).keys()) for (const c of choicesFor(data, g, t)) if (c.source) used.add(`${t} :: ${c.source}`);
        const stale = Object.entries(ZELF_LABELS).flatMap(([t, rows]) => Object.keys(rows).map(o => `${t} :: ${o}`)).filter(k => !used.has(k));
        expect(stale).toEqual([]);
    });

    test('no choice mixes procent with kommagetal variants', async () => {
        const data = await loadEenvoudigData();
        let withProcent = 0;
        for (const g of LEERJAREN) {
            for (const t of usableVariants(data, g).keys()) {
                const cards = usableVariants(data, g).get(t)!;
                for (const c of choicesFor(data, g, t)) {
                    const kinds = new Set(c.vars.map(v => numberKindOf(cards.find(x => x.vars.includes(v))!.card, v)));
                    expect(kinds.has('procent') && kinds.has('komma'), `${g} ${t} ${c.label}`).toBe(false);
                    if (kinds.has('procent')) withProcent++;
                }
            }
        }
        expect(withProcent).toBeGreaterThan(0);
        // The topic offers them apart, with no "Alles door elkaar".
        for (const g of [5, 6] as const) {
            const labels = choicesFor(data, g, KOMMA_TOPIC).map(c => c.label);
            expect(labels).toEqual(['Breuken', 'Kommagetallen', 'Procenten']);
        }
        expect(choicesFor(data, 4, KOMMA_TOPIC).map(c => c.label)).toEqual(['Breuken', 'Kommagetallen']);
    });

    test('procent choice really holds the procent exercises', async () => {
        const data = await loadEenvoudigData();
        const procent = choicesFor(data, 6, KOMMA_TOPIC).find(c => c.label === 'Procenten')!;
        expect(procent.vars.some(v => resolveCard(v).typeId === 'procenten')).toBe(true);
    });
});
