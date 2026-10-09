import type { BoardWidget } from '../boardTypes';
import { bool, color, num, oneOf, readProps, text, type ModelOf } from './propSchema';

// Defaults reproduce the pre-settings note: 26px mono, left, transparent, ink follows the board.
// Text colour = the baseline accentkleur (props.accent) when one is picked.
export const TEKST_SCHEMA = {
    text: text('', 20000),                                     // content
    // Not `fontSize`: that key is the baseline Tekstgrootte step every kind shares (baseProps).
    textPx: num(26, 12, 120, true),
    font: oneOf('mono', ['mono', 'sans'] as const),
    bold: bool(false),
    italic: bool(false),
    align: oneOf('left', ['left', 'center', 'right'] as const),
    bg: color(''),                                             // '' = transparent
    padding: num(0, 0, 48, true),
    wrap: oneOf('terugloop', ['terugloop', 'eenregel'] as const),   // eenregel = lines never wrap, card scrolls
    bullets: oneOf('geen', ['geen', 'bolletjes', 'nummers'] as const),
    lines: bool(false),                                        // notebook ruling behind the text
    lineColor: color('#93c5fd'),
};
export type TekstModel = ModelOf<typeof TEKST_SCHEMA>;
export const TEKST_CONTENT_KEYS = ['text'] as const;

export const tekstProps = (w: BoardWidget): TekstModel => readProps(TEKST_SCHEMA, w.props);

export const TEKST_LINE_HEIGHT = 1.4;
export const TEKST_FONTS: Record<TekstModel['font'], string> = {
    mono: "'Azeret Mono', monospace",
    sans: "'Ubuntu', system-ui, sans-serif",
};
