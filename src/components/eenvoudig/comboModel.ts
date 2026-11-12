// The Combinatie / Zelf samenstellen builder as plain data: one state object per flyout, turned
// into the constraints of the real `hr-std-gemengd` block (variants + perVariant) and back.
// Pure (no React) so the tests can prove the round trip and that every setting generates.

import { getMaskPlaces } from '../../services/math/mathEngine';
import { seedConstraints, DEFAULT_BASE } from '../../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../../config/gradePresets';
import { GRADE_MAX } from '../../config/eenvoudig/cards';
import type { MixedVariantId } from '../../services/math/constraintTypes';
import { clipMetRestLevel, metRestLevelFits } from '../../config/numberRanges';

export type ComboOpId = '+' | '-' | 'x' | ':';
export const COMBO_OPS: ComboOpId[] = ['+', '-', 'x', ':'];
export const OP_NAME: Record<ComboOpId, string> = { '+': 'Optellen', '-': 'Aftrekken', 'x': 'Vermenigvuldigen', ':': 'Delen' };
export const OP_SYMBOL: Record<ComboOpId, string> = { '+': '+', '-': '−', 'x': '×', ':': ':' };
// The tafels a teacher can tick; 15 is the Flemish "tafel van 15" extension.
export const COMBO_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15];
// The range buttons of the natural flyout (the hoofdrekenen list up to the leerplan ceiling of leerjaar 5).
export const COMBO_STEPS = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000];
// Met rest (: only): the delers and niveaus of the delen config (SYNC: NaturalSettings MET_REST_TABLES).
export const REST_DELERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const REST_LEVELS = [1, 2, 3] as const;
export const restLevelFits = (s: ComboState, level: number): boolean => metRestLevelFits(level, maxOf(s));
// The niveau that generates: the picked one, or lower when the range cuts it off (as the delen config clips it).
export const restLevelOf = (s: ComboState, o: ComboOpState): number => clipMetRestLevel(o.restLevel, maxOf(s));

// Kommagetallen are built on two decimals and a ceiling of 100, the hoofdrekenen default of the -dec leaf.
const DEC_MAX = 100;
const DEC_PLACES = 2;

export type Bridge = 'any' | 'none' | string[];

export interface ComboOpState {
    on: boolean;
    // Place keys (E, T, H, t, h...) that must carry a digit in the first / second number; empty = anything goes.
    a: string[];
    b: string[];
    br: Bridge;
    // x and : only: ask the tafels, or free numbers built from the places; : also niet-opgaand ('rest').
    mode: 'tafels' | 'num' | 'rest';
    tables: number[];
    // Met rest: the niveau (N1-N3) and the kladlijn for the deler's multiples, as the delen config writes them.
    restLevel: number;
    klad: boolean;
}

export interface ComboState {
    kind: 'nat' | 'komma';
    max: number;
    ops: Record<ComboOpId, ComboOpState>;
}

const blankOp = (): ComboOpState => ({ on: false, a: [], b: [], br: 'any', mode: 'tafels', tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], restLevel: 1, klad: false });

export function defaultComboMax(grade: Leerjaar): number {
    return [...COMBO_STEPS].filter(m => m <= GRADE_MAX[grade]).pop() ?? 1000;
}

// Combinatie starts with + and -; Zelf samenstellen starts with just its own operation, free numbers for x and :.
export function newCombo(grade: Leerjaar, only?: ComboOpId, kind: 'nat' | 'komma' = 'nat'): ComboState {
    const ops = Object.fromEntries(COMBO_OPS.map(k => [k, blankOp()])) as Record<ComboOpId, ComboOpState>;
    if (only) {
        ops[only].on = true;
        if (only === 'x' || only === ':') ops[only].mode = 'num';
    } else {
        ops['+'].on = true;
        ops['-'].on = true;
    }
    return { kind, max: defaultComboMax(grade), ops };
}

export const maxOf = (s: ComboState): number => (s.kind === 'komma' ? DEC_MAX : s.max);

// Place keys high to low, as the mask buttons show them.
export const placesOf = (s: ComboState): string[] =>
    (s.kind === 'komma' ? getMaskPlaces(DEC_MAX, 'decimal', DEC_PLACES) : getMaskPlaces(s.max, 'natural')).map(p => p.key);

const WEIGHT: Record<string, number> = Object.fromEntries(getMaskPlaces(1e9, 'decimal', 4).map(p => [p.key, p.weight]));

// A place can carry out only when there is room above it: a bridge out of E needs a max past 10.
export const bridgePlacesOf = (s: ComboState): string[] =>
    placesOf(s).filter(k => WEIGHT[k] * 10 < maxOf(s));

export interface BridgeChoice { id: string; label: string; value: Bridge }

export function bridgeChoices(s: ComboState): BridgeChoice[] {
    const low = [...bridgePlacesOf(s)].reverse().slice(0, 3);
    const out: BridgeChoice[] = [
        { id: 'any', label: 'Maakt niet uit', value: 'any' },
        { id: 'none', label: 'Zonder brug', value: 'none' },
        ...low.map(k => ({ id: k, label: `Brug ${k}`, value: [k] as Bridge })),
    ];
    if (low.length >= 2) out.push({ id: low.slice(0, 2).join('+'), label: `Brug ${low[0]} en ${low[1]}`, value: low.slice(0, 2) });
    return out;
}

export const bridgeId = (b: Bridge): string => (b === 'any' || b === 'none' ? b : b.join('+'));

const toMask = (keys: string[]): Record<string, boolean> => Object.fromEntries(keys.map(k => [k, true]));
const keysOf = (mask: unknown): string[] =>
    mask && typeof mask === 'object' ? Object.entries(mask as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => k) : [];

function bridgeMap(s: ComboState, br: Bridge): Record<string, 'REQUIRED' | 'FORBIDDEN'> {
    if (br === 'any') return {};
    return Object.fromEntries(bridgePlacesOf(s).map(k => [k, br !== 'none' && br.includes(k) ? 'REQUIRED' : 'FORBIDDEN'])) as Record<string, 'REQUIRED' | 'FORBIDDEN'>;
}

export const comboLeafId = (s: ComboState): string => (s.kind === 'komma' ? 'hr-std-gemengd-dec' : 'hr-std-gemengd-nat');

export const activeOps = (s: ComboState): ComboOpId[] => COMBO_OPS.filter(k => s.ops[k].on);

// A combination is the same block for every teacher: it seeds from the leerjaar's own preset, like a card.
export function comboConstraints(s: ComboState, grade: Leerjaar): Record<string, unknown> {
    const perVariant: Record<string, Record<string, unknown>> = {};
    for (const k of activeOps(s)) {
        const o = s.ops[k];
        if (k === '+' || k === '-') {
            perVariant[k] = { operand1Mask: toMask(o.a), operand2Mask: toMask(o.b), bridges: bridgeMap(s, o.br) };
        } else if (s.kind === 'komma') {
            // Kommagetal times or divided by a natural number (minimumdoelen 2.2): only the first number is shaped.
            perVariant[k] = { operand1Mask: toMask(o.a), operand2Mask: {} };
        } else if (k === ':' && o.mode === 'rest') {
            // A deler of 0 or 1 makes no rest; a tafel pick outside 2-12 falls back to the default delers.
            const delers = o.tables.filter(t => REST_DELERS.includes(t));
            perVariant[k] = {
                multiplicationMode: 'met_rest', selectedTables: delers.length ? delers : blankOp().tables.filter(t => t > 1),
                metRestLevel: restLevelOf(s, o), ...(o.klad && { metRestKladlijn: true }),
            };
        } else if (o.mode === 'tafels') {
            perVariant[k] = { multiplicationMode: 'tafels', selectedTables: o.tables, tableLimit: 10 };
        } else {
            perVariant[k] = { multiplicationMode: 'andere', operand1Mask: toMask(o.a), operand2Mask: toMask(o.b) };
        }
    }
    const variants: MixedVariantId[] = activeOps(s);
    const override = {
        numberType: s.kind === 'komma' ? 'decimal' : 'natural',
        maxGetal: maxOf(s),
        ...(s.kind === 'komma' ? { decimalPlaces: DEC_PLACES } : {}),
        variants,
        mix: 'random',
        perVariant,
    };
    return seedConstraints({
        typeId: 'hr-std-gemengd',
        base: { ...DEFAULT_BASE, ...GRADE_PRESETS[grade] },
        override,
        grade,
        leafId: comboLeafId(s),
    });
}

// Read a block's constraints back into the flyout (editing a block that came from it).
export function comboFromConstraints(c: Record<string, unknown>, grade: Leerjaar): ComboState | null {
    const variants = Array.isArray(c.variants) ? (c.variants as string[]) : null;
    if (!variants) return null;
    const kind = c.numberType === 'decimal' ? 'komma' : 'nat';
    const s = newCombo(grade, undefined, kind);
    if (kind === 'nat' && typeof c.maxGetal === 'number') s.max = c.maxGetal;
    COMBO_OPS.forEach(k => { s.ops[k].on = false; });
    const per = (c.perVariant ?? {}) as Record<string, Record<string, unknown>>;
    for (const k of COMBO_OPS) {
        if (!variants.includes(k)) continue;
        const o = s.ops[k];
        const p = per[k] ?? {};
        o.on = true;
        o.a = keysOf(p.operand1Mask);
        o.b = keysOf(p.operand2Mask);
        if (p.multiplicationMode === 'andere') o.mode = 'num';
        else if (p.multiplicationMode === 'tafels') o.mode = 'tafels';
        else if (p.multiplicationMode === 'met_rest' && k === ':') o.mode = 'rest';
        else o.mode = k === 'x' || k === ':' ? 'num' : 'tafels';
        if (Array.isArray(p.selectedTables)) o.tables = p.selectedTables as number[];
        if (typeof p.metRestLevel === 'number') o.restLevel = p.metRestLevel;
        o.klad = p.metRestKladlijn === true;
        const br = (p.bridges ?? {}) as Record<string, string>;
        const req = Object.keys(br).filter(key => br[key] === 'REQUIRED');
        const forb = Object.keys(br).filter(key => br[key] === 'FORBIDDEN');
        o.br = req.length ? req : forb.length ? 'none' : 'any';
    }
    return s;
}
