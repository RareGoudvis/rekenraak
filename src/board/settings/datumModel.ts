import { datumProps, DATUM_COLORS, type DatumProps } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Datum widget on top of datumProps: date format, letter case, extra lines (week number,
// day of the year, season, a countdown to a chosen date) and the background tint.

export type DatumFormat = 'lang' | 'kort' | 'numeriek';
export type DatumCase = 'normaal' | 'hoofdletters' | 'klein';

export interface DatumModel extends DatumProps {
    format: DatumFormat;       // 'lang' = today's "9 oktober 2026"
    textCase: DatumCase;       // 'normaal' = today's capitalised weekday
    showYear: boolean;
    showWeek: boolean;
    showDayOfYear: boolean;
    showSeason: boolean;
    countdownDate: string | null;   // YYYY-MM-DD
    countdownLabel: string;
    tint: boolean;             // the soft background + border (today)
}

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function datumModel(widget: BoardWidget): DatumModel {
    const p = widget.props ?? {};
    return {
        ...datumProps(widget),
        format: p.format === 'kort' || p.format === 'numeriek' ? p.format : 'lang',
        textCase: p.textCase === 'hoofdletters' || p.textCase === 'klein' ? p.textCase : 'normaal',
        showYear: p.showYear !== false,
        showWeek: p.showWeek === true,
        showDayOfYear: p.showDayOfYear === true,
        showSeason: p.showSeason === true,
        countdownDate: isDay(p.countdownDate) ? p.countdownDate : null,
        countdownLabel: typeof p.countdownLabel === 'string' && p.countdownLabel.trim() ? p.countdownLabel : 'de vakantie',
        tint: p.tint !== false,
    };
}

// Accent colour wins; else the legacy named colour (DATUM_COLORS) the card was made with.
export function datumColors(m: DatumModel, accent: string | null): { border: string; bg: string; text: string } {
    if (!accent) return DATUM_COLORS[m.color];
    return { text: accent, border: `color-mix(in srgb, ${accent} 35%, transparent)`, bg: `color-mix(in srgb, ${accent} 8%, transparent)` };
}

export function formatDate(d: Date, m: Pick<DatumModel, 'format' | 'showYear'>): string {
    if (m.format === 'numeriek') {
        const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
        return m.showYear ? `${dd}/${mm}/${d.getFullYear()}` : `${dd}/${mm}`;
    }
    return d.toLocaleDateString('nl-BE', { day: 'numeric', month: m.format === 'kort' ? 'short' : 'long', ...(m.showYear ? { year: 'numeric' } : {}) });
}

// ISO 8601 week (Monday start; week 1 holds the year's first Thursday) — the Belgian agenda week.
export function isoWeek(d: Date): number {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function dayOfYear(d: Date): number {
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86_400_000) + 1;
}

// Astronomical seasons on their usual calendar days (21/3, 21/6, 23/9, 21/12), as taught in class.
export function season(d: Date): { name: string; icon: string } {
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    if (md >= 1221 || md < 321) return { name: 'winter', icon: '❄️' };
    if (md < 621) return { name: 'lente', icon: '🌷' };
    if (md < 923) return { name: 'zomer', icon: '☀️' };
    return { name: 'herfst', icon: '🍂' };
}

// Whole calendar days from `today` to `target` (YYYY-MM-DD); negative once it has passed.
export function daysUntil(today: Date, target: string): number {
    const [y, mo, da] = target.split('-').map(Number);
    return Math.round((Date.UTC(y, mo - 1, da) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}

export function countdownText(days: number, label: string): string | null {
    if (days < 0) return null;
    if (days === 0) return `Vandaag: ${label}!`;
    return `Nog ${days} ${days === 1 ? 'dag' : 'dagen'} tot ${label}`;
}
