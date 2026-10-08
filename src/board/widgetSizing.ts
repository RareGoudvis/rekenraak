import type { BoardWidget, WidgetKind } from './boardTypes';

// Natural (design) width per widget kind. The frame's zoom = w / naturalW, so
// dragging the corner is a pure uniform zoom: content never reflows, it only
// gets bigger/smaller — and `zoom` (unlike transform:scale) affects layout, so
// the frame's height follows automatically.
export const NATURAL_W: Record<WidgetKind, number> = {
    exercise: 660,     // full exercise row (625px viewer budget + card padding)
    tekst: 360,
    datum: 340,
    klok: 300,
    afbeelding: 420,
    namen: 340,
    weer: 360,
    geluid: 360,
    werksymbolen: 440,
    timer: 300,
    stopwatch: 320,
    dobbelsteen: 320,
    adem: 320,
    groepjes: 460,
    checklist: 360,
    stappenplan: 400,
    getallenlijn: 640,
    positietabel: 480,
    honderdveld: 470,
    breukviz: 300,
    mabmat: 560,
    'geld-item': 100,
};

export function naturalWidth(kind: WidgetKind): number {
    return NATURAL_W[kind] ?? 400;
}

// Default title-bar text per kind; exercise widgets get the catalog label at add time.
export const TITLE_DEFAULTS: Record<WidgetKind, string> = {
    exercise: 'Oefeningen', tekst: 'Notitie', datum: 'Datum', klok: 'Klok',
    afbeelding: 'Afbeelding', namen: 'Namenkiezer', weer: 'Weer',
    geluid: 'Geluidsniveau', werksymbolen: 'Werksymbolen',
    timer: 'Timer', stopwatch: 'Stopwatch', dobbelsteen: 'Dobbelstenen', adem: 'Ademhaling',
    groepjes: 'Groepjesmaker', checklist: 'Checklist', stappenplan: 'Stappenplan',
    getallenlijn: 'Getallenlijn', positietabel: 'Positietabel', honderdveld: 'Honderdveld', breukviz: 'Breuken',
    mabmat: 'MAB-materiaal', 'geld-item': 'Geld',
};

// Kinds whose title bar shows the ⚙ (they have an inspector panel).
export const KINDS_WITH_SETTINGS: WidgetKind[] = [
    'exercise', 'klok', 'weer', 'namen', 'datum', 'werksymbolen',
    'timer', 'dobbelsteen', 'adem', 'groepjes', 'checklist', 'stappenplan',
    'getallenlijn', 'positietabel', 'honderdveld', 'breukviz', 'mabmat',
];

export function widgetTitle(widget: BoardWidget): string {
    const t = widget.props?.title;
    return typeof t === 'string' && t.trim() ? t : (TITLE_DEFAULTS[widget.kind] ?? 'Widget');
}

// ── Klok widget props (shared by KlokWidget + its settings panel) ────────────
export interface KlokProps {
    hours: number;
    minutes: number;
    showAnalog: boolean;
    showDigital: boolean;
    showText: boolean;                  // written time under the clock
    textStyle: 'digitaal' | 'tekst';    // 07:45 vs "kwart voor 8"
    showHourHand: boolean;
    showMinuteHand: boolean;
}

export function klokProps(widget: BoardWidget): KlokProps {
    const p = widget.props ?? {};
    return {
        hours: Number(p.hours ?? 9),
        minutes: Number(p.minutes ?? 0),
        showAnalog: p.showAnalog !== false,
        showDigital: p.showDigital === true,
        showText: p.showText === true,
        textStyle: p.textStyle === 'tekst' ? 'tekst' : 'digitaal',
        showHourHand: p.showHourHand !== false,
        showMinuteHand: p.showMinuteHand !== false,
    };
}

// ── Weer widget props (shared by WeerWidget + its settings panel) ────────────
export interface WeerProps {
    showWeather: boolean;      // icon + description
    showTemp: boolean;         // current temperature
    showMinMax: boolean;       // today's min/max
    showSun: boolean;          // sunrise/sunset
    showRainPct: boolean;      // precipitation probability
    showRainMm: boolean;       // precipitation volume
}

export function weerProps(widget: BoardWidget): WeerProps {
    const p = widget.props ?? {};
    return {
        showWeather: p.showWeather !== false,
        showTemp: p.showTemp !== false,
        showMinMax: p.showMinMax === true,
        showSun: p.showSun === true,
        showRainPct: p.showRainPct === true,
        showRainMm: p.showRainMm === true,
    };
}

// ── Namenkiezer class list (localStorage, app-wide) ─────────────────────────
export const NAMES_KEY = 'rekenraak_board_names_v1';
export function loadNames(): string[] {
    return (localStorage.getItem(NAMES_KEY) ?? '')
        .split('\n').map(s => s.trim()).filter(Boolean);
}

// ── Datum widget props ───────────────────────────────────────────────────────
export interface DatumProps {
    showWeekday: boolean;
    showDate: boolean;
    showTime: boolean;
    showSeconds: boolean;
    color: string;             // accent key from DATUM_COLORS
}
export const DATUM_COLORS: Record<string, { border: string; bg: string; text: string }> = {
    blauw: { border: 'rgba(30,64,175,0.35)', bg: 'rgba(30,64,175,0.07)', text: '#1e40af' },
    groen: { border: 'rgba(22,101,52,0.35)', bg: 'rgba(22,163,74,0.08)', text: '#166534' },
    paars: { border: 'rgba(107,33,168,0.35)', bg: 'rgba(147,51,234,0.08)', text: '#6b21a8' },
    oranje: { border: 'rgba(154,52,18,0.35)', bg: 'rgba(234,88,12,0.08)', text: '#9a3412' },
    grijs: { border: 'rgba(55,65,81,0.35)', bg: 'rgba(107,114,128,0.08)', text: '#374151' },
};
export function datumProps(widget: BoardWidget): DatumProps {
    const p = widget.props ?? {};
    return {
        showWeekday: p.showWeekday !== false,
        showDate: p.showDate !== false,
        showTime: p.showTime === true,
        showSeconds: p.showSeconds === true,
        color: typeof p.color === 'string' && p.color in DATUM_COLORS ? p.color : 'blauw',
    };
}

// ── Dobbelsteen widget props ─────────────────────────────────────────────────
export interface DobbelProps {
    count: number;             // 1-3 dice
    sides: number;             // 6 (pips) or 2-20 (number faces); ignored with custom list
    custom: string[];          // non-empty = roll strings instead of numbers
}
export function dobbelProps(widget: BoardWidget): DobbelProps {
    const p = widget.props ?? {};
    const custom = typeof p.custom === 'string'
        ? p.custom.split('\n').map(s => s.trim()).filter(Boolean) : [];
    return {
        count: Math.min(3, Math.max(1, Number(p.count ?? 1))),
        sides: Math.min(20, Math.max(2, Number(p.sides ?? 6))),
        custom,
    };
}

// ── Ademhaling widget props ──────────────────────────────────────────────────
export interface AdemProps { inSec: number; holdSec: number; outSec: number; }
export function ademProps(widget: BoardWidget): AdemProps {
    const p = widget.props ?? {};
    return {
        inSec: Math.max(1, Number(p.inSec ?? 4)),
        holdSec: Math.max(0, Number(p.holdSec ?? 4)),
        outSec: Math.max(1, Number(p.outSec ?? 4)),
    };
}

// ── Groepjesmaker ────────────────────────────────────────────────────────────
export interface GroepjesProps {
    mode: 'aantal' | 'grootte';
    groups: number;            // when mode = 'aantal'
    size: number;              // when mode = 'grootte'
    mustTogether: string;      // lines of "Naam, Naam" pairs
    cannotTogether: string;
}
export function groepjesProps(widget: BoardWidget): GroepjesProps {
    const p = widget.props ?? {};
    return {
        mode: p.mode === 'grootte' ? 'grootte' : 'aantal',
        groups: Math.max(2, Number(p.groups ?? 3)),
        size: Math.max(2, Number(p.size ?? 4)),
        mustTogether: typeof p.mustTogether === 'string' ? p.mustTogether : '',
        cannotTogether: typeof p.cannotTogether === 'string' ? p.cannotTogether : '',
    };
}

function parsePairs(text: string): Array<[string, string]> {
    return text.split('\n')
        .map(l => l.split(',').map(s => s.trim()).filter(Boolean))
        .filter(a => a.length >= 2)
        .map(a => [a[0], a[1]] as [string, string]);
}

// Shuffle + repair: must-together pairs merge into one dealt unit (union-find);
// cannot-together violations trigger a full re-shuffle, max 300 attempts.
export function makeGroups(names: string[], cfg: GroepjesProps): { groups: string[][]; ok: boolean } {
    const must = parsePairs(cfg.mustTogether);
    const cannot = parsePairs(cfg.cannotTogether);
    const parent = new Map<string, string>(names.map(n => [n, n]));
    const find = (x: string): string => { const p = parent.get(x); if (p === undefined || p === x) return x; const r = find(p); parent.set(x, r); return r; };
    for (const [a, b] of must) if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
    const unitMap = new Map<string, string[]>();
    for (const n of names) {
        const r = find(n);
        unitMap.set(r, [...(unitMap.get(r) ?? []), n]);
    }
    const units = [...unitMap.values()];
    const nGroups = cfg.mode === 'aantal' ? Math.min(cfg.groups, names.length) : Math.max(1, Math.round(names.length / cfg.size));

    const violates = (groups: string[][]) => cannot.some(([a, b]) => groups.some(g => g.includes(a) && g.includes(b)));

    for (let attempt = 0; attempt < 300; attempt++) {
        const shuffled = [...units];
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        const groups: string[][] = Array.from({ length: nGroups }, () => []);
        // Deal each unit onto the currently smallest group (balances sizes with merged units).
        for (const u of shuffled) {
            groups.sort((a, b) => a.length - b.length);
            groups[0].push(...u);
        }
        if (!violates(groups)) return { groups: groups.filter(g => g.length), ok: true };
    }
    // Unsolvable rules: return a best-effort deal with a warning flag.
    const groups: string[][] = Array.from({ length: nGroups }, () => []);
    units.forEach((u, i) => groups[i % nGroups].push(...u));
    return { groups: groups.filter(g => g.length), ok: false };
}

// ── Checklist / Stappenplan ──────────────────────────────────────────────────
export function checklistItems(widget: BoardWidget): string[] {
    const t = typeof widget.props?.items === 'string' ? widget.props.items : 'boek klaar\npotlood klaar\naan de slag!';
    return t.split('\n').map(s => s.trim()).filter(Boolean);
}

// ── Getallenlijn (leeg, wiskunde-gereedschap) ────────────────────────────────
export interface GetallenlijnProps { min: number; max: number; ticks: number; labels: 'alles' | 'uiteinden' | 'geen'; }
export function getallenlijnProps(widget: BoardWidget): GetallenlijnProps {
    const p = widget.props ?? {};
    return {
        min: Number(p.min ?? 0),
        max: Number(p.max ?? 100),
        ticks: Math.min(21, Math.max(2, Number(p.ticks ?? 11))),
        labels: p.labels === 'uiteinden' || p.labels === 'geen' ? p.labels : 'alles',
    };
}

// ── Positietabel (leeg) ──────────────────────────────────────────────────────
export const POSITIE_KOLOMMEN = [
    { key: 'D', label: 'D' }, { key: 'H', label: 'H' }, { key: 'T', label: 'T' }, { key: 'E', label: 'E' },
    { key: 't', label: 't' }, { key: 'h', label: 'h' },
] as const;
export function positietabelProps(widget: BoardWidget): { columns: string[]; rows: number } {
    const p = widget.props ?? {};
    const cols = Array.isArray(p.columns) ? (p.columns as string[]).filter(c => POSITIE_KOLOMMEN.some(k => k.key === c)) : ['H', 'T', 'E'];
    return { columns: cols.length ? cols : ['H', 'T', 'E'], rows: Math.min(8, Math.max(1, Number(p.rows ?? 3))) };
}

// ── Breukenvisualisatie ──────────────────────────────────────────────────────
export interface BreukvizProps { n: number; d: number; shape: 'cirkel' | 'pizza' | 'lijn'; stambreuk: boolean; }
export function breukvizProps(widget: BoardWidget): BreukvizProps {
    const p = widget.props ?? {};
    const d = Math.min(12, Math.max(2, Number(p.d ?? 4)));
    const stambreuk = p.stambreuk === true;
    return {
        d,
        n: stambreuk ? 1 : Math.min(d, Math.max(1, Number(p.n ?? 1))),
        shape: p.shape === 'pizza' || p.shape === 'lijn' ? p.shape : 'cirkel',
        stambreuk,
    };
}

// ── Werksymbolen widget props ────────────────────────────────────────────────
export const WERKSYMBOLEN = [
    { key: 'stil', label: 'Stil werken' },
    { key: 'fluisteren', label: 'Fluisteren' },
    { key: 'buur', label: 'Vraag de buur' },
    { key: 'samen', label: 'Samenwerken' },
    { key: 'juf', label: 'Vraag de juf/meester' },
] as const;
export interface WerksymbolenProps {
    active: string;
    vertical: boolean;
    iconOnly: boolean;
    enabled: string[];         // visible mode keys
}
export function werksymbolenProps(widget: BoardWidget): WerksymbolenProps {
    const p = widget.props ?? {};
    return {
        active: typeof p.active === 'string' ? p.active : 'stil',
        vertical: p.vertical === true,
        iconOnly: p.iconOnly === true,
        enabled: Array.isArray(p.enabled) ? p.enabled as string[] : WERKSYMBOLEN.map(m => m.key),
    };
}
