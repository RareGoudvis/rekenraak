import type { BoardWidget } from '../boardTypes';
import { bool, boolList, custom, isHex, num, readProps, strList, text, type ModelOf } from './propSchema';

export const MAX_DICE = 6;
export const MAX_HISTORY = 20;
export const MAX_FACE_IMAGES = 20;

const parseColors = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.slice(0, MAX_DICE).map(c => (isHex(c) ? c : '#ffffff')) : undefined;
const parseIdx = (v: unknown): number[] | undefined =>
    Array.isArray(v) ? v.slice(0, MAX_DICE).map(n => (Number.isInteger(n) && (n as number) >= 0 ? n as number : 0)) : undefined;
const parseHistory = (v: unknown): string[][] | undefined =>
    Array.isArray(v) ? v.filter(Array.isArray).slice(-MAX_HISTORY).map(r => (r as unknown[]).map(String).slice(0, MAX_DICE)) : undefined;

// Defaults reproduce the pre-settings roller: one white 6-pip die, animated roll, no sum or
// history. Faces: images beat custom labels beat numbers 1..sides.
export const DOBBEL_SCHEMA = {
    count: num(1, 1, MAX_DICE, true),
    sides: num(6, 2, 100, true),
    custom: text('', 4000),                       // one label per line; non-empty = label faces
    faceImages: strList([], MAX_FACE_IMAGES),     // dataURLs; non-empty = picture faces
    dieColors: custom<string[]>([], parseColors), // per die; missing = white
    animate: bool(true),
    showSum: bool(false),                         // number faces only
    showHistory: bool(false),
    allowLock: bool(true),                        // tap a die to keep it on the next roll
    values: custom<number[]>([], parseIdx),       // face index per die (content)
    locked: boolList(MAX_DICE),                   // content
    history: custom<string[][]>([], parseHistory),// newest last (content)
};
export type DobbelModel = ModelOf<typeof DOBBEL_SCHEMA> & { labels: string[] };
export const DOBBEL_CONTENT_KEYS = ['values', 'locked', 'history', 'faceImages'] as const;

export function dobbelProps(w: BoardWidget): DobbelModel {
    const m = readProps(DOBBEL_SCHEMA, w.props);
    return { ...m, labels: m.custom.split('\n').map(s => s.trim()).filter(Boolean) };
}

export type FaceKind = 'pips' | 'number' | 'label' | 'image';
export function faceKind(m: DobbelModel): FaceKind {
    if (m.faceImages.length) return 'image';
    if (m.labels.length) return 'label';
    return m.sides === 6 ? 'pips' : 'number';
}
export const faceCount = (m: DobbelModel) =>
    m.faceImages.length || m.labels.length || m.sides;

// What a face index means as text (sum, history list, screen readers).
export function faceText(m: DobbelModel, idx: number): string {
    const k = faceKind(m);
    if (k === 'image') return `afb. ${idx + 1}`;
    if (k === 'label') return m.labels[idx % m.labels.length];
    return String(idx + 1);
}

// Black or white ink, whichever reads better on the die colour (WCAG relative luminance).
export function inkOn(hex: string): string {
    const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
    const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111' : '#fff';
}
