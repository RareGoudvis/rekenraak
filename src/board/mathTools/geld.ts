import type { BoardWidget } from '../boardTypes';
import { isObj, num, oneOf, bool } from './shared';

// ── Geld-palet (device setting, not part of a board) ─────────────────────────
export type GeldType = 'bill' | 'euro-coin' | 'cent-coin';
export const GELD_CATALOGUE: ReadonlyArray<{ denom: number; type: GeldType }> = [
    { denom: 50000, type: 'bill' }, { denom: 20000, type: 'bill' }, { denom: 10000, type: 'bill' },
    { denom: 5000, type: 'bill' }, { denom: 2000, type: 'bill' }, { denom: 1000, type: 'bill' }, { denom: 500, type: 'bill' },
    { denom: 200, type: 'euro-coin' }, { denom: 100, type: 'euro-coin' },
    { denom: 50, type: 'cent-coin' }, { denom: 20, type: 'cent-coin' }, { denom: 10, type: 'cent-coin' }, { denom: 5, type: 'cent-coin' },
    { denom: 2, type: 'cent-coin' }, { denom: 1, type: 'cent-coin' },
];
export interface GeldPaletSettings {
    denoms: number[];          // shown in the dock, catalogue order
    style: 'tekening' | 'realistisch';
    showLabels: boolean;       // amount caption under every dropped piece
    snap: boolean;             // drops land on the board grid
    showSum: boolean;          // "Samen: € …" readout in the dock
    size: number;              // piece scale (1 = today)
}
export const GELD_PALET_KEY = 'rekenraak_board_geldpalet_v1';
export const DEFAULT_GELD_PALET: GeldPaletSettings = {
    denoms: GELD_CATALOGUE.map(g => g.denom), style: 'tekening', showLabels: false, snap: false, showSum: false, size: 1,
};

export function parseGeldPalet(raw: unknown): GeldPaletSettings {
    const p = isObj(raw) ? raw : {};
    const picked = Array.isArray(p.denoms) ? p.denoms : DEFAULT_GELD_PALET.denoms;
    const denoms = GELD_CATALOGUE.map(g => g.denom).filter(d => picked.includes(d));
    return {
        denoms: denoms.length ? denoms : [...DEFAULT_GELD_PALET.denoms],
        style: oneOf(p.style, ['tekening', 'realistisch'] as const, 'tekening'),
        showLabels: bool(p.showLabels, false),
        snap: bool(p.snap, false),
        showSum: bool(p.showSum, false),
        size: Math.min(2, Math.max(0.6, num(p.size, 1))),
    };
}

export function loadGeldPalet(): GeldPaletSettings {
    try {
        return parseGeldPalet(JSON.parse(localStorage.getItem(GELD_PALET_KEY) ?? 'null'));
    } catch {
        return { ...DEFAULT_GELD_PALET };
    }
}

export function saveGeldPalet(s: GeldPaletSettings): void {
    try {
        localStorage.setItem(GELD_PALET_KEY, JSON.stringify(s));
    } catch {
        // Storage refused (private mode): the dock still works for this session.
    }
}

// Piece size is not a prop: the frame zooms content by w / NATURAL_W, so the dock sets w.
export interface GeldItemProps { denom: number; type: GeldType; style: 'tekening' | 'realistisch'; showLabel: boolean; }
export function geldItemProps(widget: BoardWidget): GeldItemProps {
    const p = widget.props ?? {};
    const hit = GELD_CATALOGUE.find(g => g.denom === num(p.denom, 100));
    return {
        denom: hit?.denom ?? 100,
        type: hit?.type ?? 'euro-coin',
        style: p.geldStyle === 'realistisch' ? 'realistisch' : 'tekening',
        showLabel: bool(p.showLabel, false),
    };
}

// Base frame widths of a dropped piece at size 1 (what the dock always used).
export const geldItemWidth = (type: GeldType, size: number): number => Math.round((type === 'bill' ? 110 : 74) * size);
