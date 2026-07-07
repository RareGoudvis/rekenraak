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
};

export function naturalWidth(kind: WidgetKind): number {
    return NATURAL_W[kind] ?? 400;
}

// Default title-bar text per kind; exercise widgets get the catalog label at add time.
export const TITLE_DEFAULTS: Record<WidgetKind, string> = {
    exercise: 'Oefeningen', tekst: 'Notitie', datum: 'Datum', klok: 'Klok',
    afbeelding: 'Afbeelding', namen: 'Namenkiezer', weer: 'Weer',
    geluid: 'Geluidsniveau', werksymbolen: 'Werksymbolen',
};

// Kinds whose title bar shows the ⚙ (they have an inspector panel).
export const KINDS_WITH_SETTINGS: WidgetKind[] = ['exercise', 'klok', 'weer', 'namen', 'datum', 'werksymbolen'];

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
