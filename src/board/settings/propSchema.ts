// Typed widget-props schemas: one table per kind gives both the read-time model (every field
// falls back to its default, so an old board renders exactly as before) and the load-time
// clean-up in parseBoardFile (a junk value is dropped, never coerced into the saved file).

export interface Field<T> {
    def: T;
    // undefined = the stored value is unusable; the default applies
    parse: (v: unknown) => T | undefined;
}
export type Schema = Record<string, Field<unknown>>;
export type ModelOf<S extends Schema> = { [K in keyof S]: S[K] extends Field<infer T> ? T : never };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
// Early builds wrote some numbers through text inputs; a numeric string still counts.
const toNum = (v: unknown): number | undefined => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
};

export const num = (def: number, min: number, max: number, integer = false): Field<number> => ({
    def,
    parse: (v) => {
        const n = toNum(v);
        if (n === undefined) return undefined;
        return clamp(integer ? Math.round(n) : n, min, max);
    },
});

export const bool = (def: boolean): Field<boolean> => ({ def, parse: (v) => (typeof v === 'boolean' ? v : undefined) });

export const oneOf = <T extends string | number>(def: T, options: readonly T[]): Field<T> => ({
    def,
    parse: (v) => (options.includes(v as T) ? (v as T) : undefined),
});

export const text = (def: string, maxLen = 2000): Field<string> => ({
    def,
    parse: (v) => (typeof v === 'string' ? v.slice(0, maxLen) : undefined),
});

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);
// '' = "not set" for colours whose default is derived (theme, dark board).
export const color = (def: string): Field<string> => ({
    def,
    parse: (v) => (isHex(v) || v === '' ? (v as string) : undefined),
});

export const numList = (def: number[], min: number, max: number, maxLen: number): Field<number[]> => ({
    def,
    parse: (v) => {
        if (!Array.isArray(v)) return undefined;
        const out = v.map(toNum).filter((n): n is number => n !== undefined).map(n => clamp(n, min, max));
        return out.slice(0, maxLen);
    },
});

export const strList = (def: string[], maxLen: number, maxItemLen = 400_000): Field<string[]> => ({
    def,
    parse: (v) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').map(s => s.slice(0, maxItemLen)).slice(0, maxLen) : undefined),
});

export const boolList = (maxLen: number): Field<boolean[]> => ({
    def: [],
    parse: (v) => (Array.isArray(v) ? v.slice(0, maxLen).map(b => b === true) : undefined),
});

// A field with its own validator (nested shapes: dice history, lap list).
export const custom = <T>(def: T, parse: (v: unknown) => T | undefined): Field<T> => ({ def, parse });

export function readProps<S extends Schema>(schema: S, props: Record<string, unknown> | undefined): ModelOf<S> {
    const p = props ?? {};
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema)) {
        const v = key in p ? field.parse(p[key]) : undefined;
        out[key] = v === undefined ? field.def : v;
    }
    return out as ModelOf<S>;
}

// Load-time: keep every key the schema doesn't own (title, showHeader, other kinds' extras) and
// every owned key whose value parses; drop the rest so the read-time default takes over.
export function cleanProps(schema: Schema, props: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(props)) {
        const field = schema[key];
        if (!field) { out[key] = v; continue; }
        const parsed = field.parse(v);
        if (parsed !== undefined) out[key] = parsed;
    }
    return out;
}
