import { isHex } from './baseProps';
import { checklistItems } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Checklist + stappenplan share one list model. `props.list` (rows with an optional colour,
// empty rows kept so a row being typed never vanishes) wins; boards from before it keep
// their newline text (`items` / `text`) and read exactly as they did.

export interface ListItem { text: string; color: string | null }
export type CheckStyle = 'doorstreep' | 'vink' | 'vervaag';
export const CHECK_STYLES: ReadonlyArray<{ value: CheckStyle; label: string }> = [
    { value: 'doorstreep', label: 'Doorstrepen' },
    { value: 'vink', label: 'Enkel vinkje' },
    { value: 'vervaag', label: 'Vervagen' },
];

function readList(raw: unknown): ListItem[] | null {
    if (!Array.isArray(raw)) return null;
    return raw.map(r => {
        const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
        return { text: typeof o.text === 'string' ? o.text : typeof r === 'string' ? r : '', color: isHex(o.color) ? o.color : null };
    });
}

const indexList = (raw: unknown): number[] =>
    Array.isArray(raw) ? raw.filter((n): n is number => Number.isInteger(n) && n >= 0) : [];

const checkStyle = (v: unknown): CheckStyle => (v === 'vink' || v === 'vervaag' ? v : 'doorstreep');

export interface ChecklistProps {
    items: ListItem[];
    checked: number[];         // indexes into items
    round: boolean;
    checkStyle: CheckStyle;    // 'doorstreep' = today's strike + fade
    bigTap: boolean;
    numbered: boolean;
}

export function checklistProps(widget: BoardWidget): ChecklistProps {
    const p = widget.props ?? {};
    return {
        items: readList(p.list) ?? checklistItems(widget).map(text => ({ text, color: null })),
        checked: indexList(p.checked),
        round: p.round === true,
        checkStyle: checkStyle(p.checkStyle),
        bigTap: p.bigTap === true,
        numbered: p.numbered === true,
    };
}

export const DEFAULT_PLAN = '# Zo werk je\n1e stap: lees de opdracht\n2e stap: maak een schets\n## Daarna\ncontroleer je antwoord';

export interface StappenplanProps {
    items: ListItem[];         // '# ' = titel, '## ' = subtitel, other rows are steps
    numbered: boolean;
    tappable: boolean;         // tap a step to mark it done (off = today's static plan)
    done: number[];
    checkStyle: CheckStyle;
    bigTap: boolean;
}

export function stappenplanProps(widget: BoardWidget): StappenplanProps {
    const p = widget.props ?? {};
    const text = typeof p.text === 'string' ? p.text : DEFAULT_PLAN;
    return {
        items: readList(p.list) ?? text.split('\n').map(s => s.trimEnd()).filter(s => s.trim()).map(t => ({ text: t, color: null })),
        numbered: p.numbered !== false,
        tappable: p.tappable === true,
        done: indexList(p.done),
        checkStyle: checkStyle(p.checkStyle),
        bigTap: p.bigTap === true,
    };
}

export const listToText = (items: ListItem[]) => items.map(i => i.text).join('\n');
export const textToList = (text: string): ListItem[] => text.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ text: t, color: null }));

export const CHECKLIST_TEMPLATES: ReadonlyArray<{ name: string; items: string[] }> = [
    { name: 'Ochtendroutine', items: ['jas aan de kapstok', 'boekentas op je plaats', 'agenda op de bank', 'drinkfles klaar', 'stil aan de slag'] },
    { name: 'Opruimen', items: ['bank leeg', 'materiaal in de bak', 'papiertjes in de vuilbak', 'stoel aan de bank'] },
    { name: 'Werkje af', items: ['naam op je blad', 'alles ingevuld', 'nagekeken', 'in het bakje gelegd', 'keuzewerk gekozen'] },
    { name: 'Toets', items: ['naam en datum', 'lees elke vraag goed', 'reken op je kladblad', 'lees alles nog eens na', 'blad omdraaien'] },
    { name: 'Naar huis', items: ['agenda ingevuld', 'huiswerk in de boekentas', 'bank leeg', 'stoel op de bank', 'jas aan'] },
];

export const STAPPENPLAN_TEMPLATES: ReadonlyArray<{ name: string; items: string[] }> = [
    { name: 'Vraagstuk', items: ['# Zo los je een vraagstuk op', 'lees de opdracht twee keer', 'wat weet je? wat zoek je?', 'maak een schets of schema', 'reken uit', 'schrijf een antwoordzin', 'controleer: kan dit?'] },
    { name: 'Cijferen', items: ['# Cijferen', 'schrijf E onder E, T onder T', 'begin bij de eenheden', 'vergeet de onthouding niet', 'schrijf de uitkomst', 'controleer met een schatting'] },
    { name: 'Zelfstandig werken', items: ['# Zelfstandig werken', 'lees de opdracht', 'probeer het eerst zelf', 'vraag je buur', 'vraag de juf of meester', '## Klaar?', 'kies een keuzetaak'] },
    { name: 'Meten', items: ['# Meten met de meetlat', 'leg de 0 aan het begin', 'houd de lat recht', 'lees af aan het einde', 'schrijf de maat met de eenheid'] },
];

// ListEditor keeps every untouched row's identity, so one changed slot = a text/colour edit
// (ticks stay); anything else moved or removed rows (ticks restart).
export function isRowEdit(next: ListItem[], prev: ListItem[]): boolean {
    return next.length === prev.length && next.filter((it, i) => it !== prev[i]).length <= 1;
}
