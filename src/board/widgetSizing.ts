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
    geluid: 340,
};

export function naturalWidth(kind: WidgetKind): number {
    return NATURAL_W[kind] ?? 400;
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
