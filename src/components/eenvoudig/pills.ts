// The short variant buttons under a card: which variants fit in one row and what each is called.

import type { CardType } from '../../config/eenvoudig/cards';

// Short words for the questions the cards ask most; null = the label has no good short form.
function pillLabel(q: string, l: string): string | null {
    if (q === 'Met of zonder brug?') {
        if (l === 'Zonder brug') return 'Zonder';
        if (l === 'Maakt niet uit') return 'Vrij';
        if (l === 'Meerdere bruggen') return 'Meer';
        return l.replace('Brug bij ', '');
    }
    if (q === 'Welke sprong?') {
        const m = l.match(/(?:sprongen van|met)\s+([\d .]*\d)/i);
        return m ? m[1].trim() : null;
    }
    if (q === 'Hoe nauwkeurig?') {
        const k = ([[/kwartier/i, 'Kwartier'], [/5 minuten/, '5 min'], [/1 minuut|de minuut/, '1 min'], [/halve/i, 'Half uur'], [/uren/i, 'Uur']] as const).find(([r]) => r.test(l));
        return k ? k[1] : null;
    }
    return l.length <= 11 ? l : null;
}

export interface PillPlan {
    lead: string;
    // Variant indexes that get their own button, with the button text.
    shown: { index: number; text: string }[];
    // Variants that did not fit ("+3").
    hidden: number;
    // A card whose variants have no short names says how many there are instead of showing buttons.
    summary: string | null;
}

// SYNC: the row is one line of the card (216px card, 10px padding, 3px accent line): the width guess is per character.
const ROW_WIDTH = 190;

export function planPills(x: CardType): PillPlan {
    if (x.vars.length < 2) return { lead: '', shown: [], hidden: 0, summary: null };
    const labels = x.vars.map(v => pillLabel(x.q, v.l));
    if (labels.some(l => l == null)) return { lead: '', shown: [], hidden: 0, summary: `${x.vars.length} varianten` };
    const lead = x.q === 'Met of zonder brug?' ? 'Brug' : x.q === 'Welke sprong?' ? 'Sprong' : '';
    let room = ROW_WIDTH - (lead ? lead.length * 6.2 + 5 : 0);
    const shown: PillPlan['shown'] = [];
    for (let i = 0; i < labels.length; i++) {
        const text = labels[i] as string;
        const w = text.length * 6.3 + 15;
        const reserve = i < labels.length - 1 ? 32 : 0;
        if (room - w - reserve < 0) break;
        room -= w + 3;
        shown.push({ index: i, text });
    }
    return { lead, shown, hidden: labels.length - shown.length, summary: null };
}
