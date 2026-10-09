// Settings models of the wiskunde-gereedschap widgets (getallenlijn, positietabel, honderdveld,
// breukviz, mabmat, geld). Each normaliser is the validator: any prop a board file carries is read
// through it, so a missing or junk value falls back to a default and an old board renders as before.

// ── shared validators ────────────────────────────────────────────────────────
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
// Old boards stored some numbers as strings (number inputs); Number() keeps reading them.
export const num = (v: unknown, fallback: number): number => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return finite(n) ? n : fallback;
};
export const int = (v: unknown, fallback: number, lo: number, hi: number): number =>
    Math.min(hi, Math.max(lo, Math.round(num(v, fallback))));
export const oneOf = <T extends string>(v: unknown, opts: readonly T[], fallback: T): T =>
    (typeof v === 'string' && (opts as readonly string[]).includes(v) ? v : fallback) as T;
export const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
// #rgb / #rrggbb only: a colour lands in inline styles, so nothing else may pass.
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
export const color = (v: unknown, fallback: string): string => (isHexColor(v) ? v : fallback);

// Tool palette: strong enough for a digibord, light enough to read black digits on.
export const TOOL_COLORS = ['#fde047', '#86efac', '#93c5fd', '#fca5a5', '#d8b4fe', '#fdba74'] as const;
// Ink colours for markers / arcs drawn ON a white tool (need contrast, not a pastel).
export const INK_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#111827'] as const;

// Round away float noise (0.1 + 0.2) before a value becomes a label or a key.
export const clean = (v: number): number => Math.round(v * 1e9) / 1e9;
