// The sheet's maths face as a literal, for JS that cannot resolve a CSS variable (canvas
// measureText, layout estimates). Everything that renders uses var(--font-sheet-math).
// SYNC: theme.css --font-sheet-math
export const SHEET_MATH_FONT = "'Azeret Mono', monospace";

// One pickable sheet font. `value` is the CSS font-family written onto a --font-sheet-*
// token; `load` pulls a self-hosted @fontsource face in on first use (Latin 400 + 700 only)
// so the default bundle stays Ubuntu + Azeret Mono. No load = shipped already, or a system
// font that only exists on a computer that has it installed.
export interface FontOption {
    label: string;
    value: string;
    load?: () => Promise<unknown>;
}

// Shown under every picker: a system font is not on the paper of a computer that lacks it.
export const INSTALLED_SUFFIX = '(als geïnstalleerd)';

// Words: opdrachten, titel, koptekst, veldlabels, voettekst.
export const TEXT_FONT_OPTIONS: FontOption[] = [
    { label: 'Ubuntu (standaard)', value: "'Ubuntu', system-ui, sans-serif" },
    { label: 'Andika', value: "'Andika', 'Ubuntu', sans-serif", load: () => Promise.all([import('@fontsource/andika/latin-400.css'), import('@fontsource/andika/latin-700.css')]) },
    { label: 'Atkinson Hyperlegible', value: "'Atkinson Hyperlegible', 'Ubuntu', sans-serif", load: () => Promise.all([import('@fontsource/atkinson-hyperlegible/latin-400.css'), import('@fontsource/atkinson-hyperlegible/latin-700.css')]) },
    { label: 'Lexend', value: "'Lexend', 'Ubuntu', sans-serif", load: () => Promise.all([import('@fontsource/lexend/latin-400.css'), import('@fontsource/lexend/latin-700.css')]) },
    { label: `Arial ${INSTALLED_SUFFIX}`, value: "Arial, 'Helvetica Neue', 'Ubuntu', sans-serif" },
    { label: `Verdana ${INSTALLED_SUFFIX}`, value: "Verdana, Geneva, 'Ubuntu', sans-serif" },
    { label: `Comic Sans MS ${INSTALLED_SUFFIX}`, value: "'Comic Sans MS', 'Comic Neue', 'Ubuntu', sans-serif" },
    { label: `Calibri ${INSTALLED_SUFFIX}`, value: "Calibri, Carlito, 'Ubuntu', sans-serif" },
];

// Digits. Monospace only: column arithmetic (cijferen, staartdelingen) lines up only when
// every glyph shares one advance.
export const MATH_FONT_OPTIONS: FontOption[] = [
    { label: 'Azeret Mono (standaard)', value: SHEET_MATH_FONT },
    { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Azeret Mono', monospace", load: () => Promise.all([import('@fontsource/jetbrains-mono/latin-400.css'), import('@fontsource/jetbrains-mono/latin-700.css')]) },
    { label: `Consolas ${INSTALLED_SUFFIX}`, value: "Consolas, 'Azeret Mono', monospace" },
    { label: `Courier New ${INSTALLED_SUFFIX}`, value: "'Courier New', Courier, 'Azeret Mono', monospace" },
];

const loaded = new Map<string, Promise<unknown>>();

// Load a self-hosted face the first time a sheet uses it (picked, or a loaded sheet that
// carries it). Unknown values and system / shipped fonts resolve at once.
export function ensureFontLoaded(value: string | undefined): Promise<unknown> {
    if (!value) return Promise.resolve();
    const opt = [...TEXT_FONT_OPTIONS, ...MATH_FONT_OPTIONS].find(o => o.value === value);
    if (!opt?.load) return Promise.resolve();
    let p = loaded.get(value);
    if (!p) {
        // A failed chunk must not stick: the next use retries instead of keeping the fallback.
        p = opt.load().catch((e) => { loaded.delete(value); console.warn('[fonts] could not load', opt.label, e); });
        loaded.set(value, p);
    }
    return p;
}
