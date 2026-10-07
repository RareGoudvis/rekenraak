// ── Global base settings (snapshot-on-add) ───────────────────────────────────
// A set of difficulty defaults the teacher sets once (sidebar → Geavanceerd →
// Basisinstellingen). When a new block is created, these are snapshotted into that
// block's constraints — NOT live-linked, so changing the base later never
// retro-affects existing blocks. Pure data (no React) so the store can import it.

import { NAT_CEILING, floorToPreset, type MaxPresetsFn, type MaxRange } from './numberRanges';
import { REGISTRY, SEED_FIT } from './exerciseRegistry';
import { LEAF_BY_ID } from './appstructure';
import type { Leerjaar } from './gradePresets';
import { PLACE_VALUES } from '../services/math/mathEngine';

export type BaseNumberType = 'natural' | 'decimal' | 'rational' | 'geheel';
export type BaseBridgePolicy = 'FREE' | 'REQUIRED' | 'FORBIDDEN';

export interface BaseSettings {
    baseMaxGetal: number;
    baseNumberType: BaseNumberType;
    // Place → present. Empty {} = no restriction. Keyed by place keys (E/T/H/D/…)
    // exactly like the per-block operand masks.
    baseOperand1Mask: Record<string, boolean>;
    baseOperand2Mask: Record<string, boolean>;
    // 'bruggetje' = carry/borrow across a place-value boundary (Dutch primary term).
    // Place → policy ('FREE'=MAG, 'REQUIRED'=MOET, 'FORBIDDEN'=GEEN). Empty {} = default.
    baseBridges: Record<string, BaseBridgePolicy>;
    baseDecimalPlaces: number;          // global decimal precision (1..3)
    baseUnitFractionsOnly: boolean;     // rational: stambreuken
    baseAllowMixed: boolean;            // rational: gemengde getallen
}

export const DEFAULT_BASE: BaseSettings = {
    baseMaxGetal: 1000,
    baseNumberType: 'natural',
    baseOperand1Mask: {},
    baseOperand2Mask: {},
    baseBridges: {},
    baseDecimalPlaces: 2,
    baseUnitFractionsOnly: false,
    baseAllowMixed: false,
};

const hasKeys = (o: Record<string, unknown>) => Object.keys(o).length > 0;

// Map the semantic base onto a type's own constraint keys. Writes a key ONLY if
// the type's realized registry defaults already declare it — that `key in
// defaults` guard is the graceful-degradation mechanism: a type with no max
// concept (e.g. temperatuur) simply receives nothing for max.
//
// "max number" has three different key names across generators:
//   maxGetal (most) / maxRange (cijferen) / maxNumber (MAB). Breuken is left out
//   on purpose — its maxTotal/maxDenominator aren't "the biggest number".
// `range` is the list the type's config will show (REGISTRY[typeId].maxPresets): the
//   seed floors into it, so a type with a lower didactic ceiling (deelbaarheid 1e5,
//   MAB 1000) gets its own top instead of a value its picker would snap to "Tot 10".
//   A null range (picker hidden) writes no max; without a range (the type declares no
//   maxPresets) the seed is copied, capped at NAT_CEILING.
// Masks + bridges only matter for place-value arithmetic (hoofdrekenen, cijferen,
// splitsen, mab) and are written only when the teacher actually set something, so
// an untouched base leaves each type's registry default intact. Nested objects are
// CLONED so two blocks never share a mutable mask/bridge object.
export function baseApply(
    base: BaseSettings,
    registryDefaults: Record<string, unknown>,
    range?: MaxRange | null,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    const capped = Math.min(base.baseMaxGetal, NAT_CEILING);
    const floored = range ? floorToPreset(base.baseMaxGetal, range.presets) : undefined;
    // null = these settings hide the max picker (tafels, cirkels, veelvouden): the type keeps
    // its registry default, or a later switch to a mode with a picker inherits an invisible
    // grade max that the picker then has to floor (a stale block and an extra undo step).
    if (range !== null) {
        if ('maxGetal' in registryDefaults) out.maxGetal = range?.key === 'maxGetal' ? floored : capped;
        if ('maxRange' in registryDefaults) out.maxRange = range?.key === 'maxRange' ? floored : capped;
        // maxNumber is MAB-only, and MAB draws place-value blocks up to 1000 — never hand it
        // the five/ten-digit base seeds the other types accept.
        if ('maxNumber' in registryDefaults) out.maxNumber = range?.key === 'maxNumber' ? floored : Math.min(base.baseMaxGetal, 9999);
    }

    if ('numberType' in registryDefaults) out.numberType = base.baseNumberType;

    if ('operand1Mask' in registryDefaults && hasKeys(base.baseOperand1Mask)) out.operand1Mask = { ...base.baseOperand1Mask };
    if ('operand2Mask' in registryDefaults && hasKeys(base.baseOperand2Mask)) out.operand2Mask = { ...base.baseOperand2Mask };

    if ('bridges' in registryDefaults && hasKeys(base.baseBridges)) out.bridges = { ...base.baseBridges };

    // Decimal precision + fraction-display defaults, only where the type owns them.
    if ('decimalPlaces' in registryDefaults) out.decimalPlaces = base.baseDecimalPlaces;
    if ('unitFractionsOnly' in registryDefaults) out.unitFractionsOnly = base.baseUnitFractionsOnly;
    if ('allowMixed' in registryDefaults) out.allowMixed = base.baseAllowMixed;

    return out;
}

// The max list a NEW block's config will show, picked from the block as it will be merged:
// registry defaults → the base's number type (baseApply writes it) → leaf override, so a
// decimal leaf or a decimal base both land on the decimal list.
export function baseRangeFor(
    base: BaseSettings,
    registryDefaults: Record<string, unknown>,
    override: Record<string, unknown> | undefined,
    maxPresets: MaxPresetsFn | undefined,
): MaxRange | null | undefined {
    if (!maxPresets) return undefined;
    const numberType = 'numberType' in registryDefaults ? { numberType: base.baseNumberType } : {};
    return maxPresets({ ...registryDefaults, ...numberType, ...(override ?? {}) });
}

export interface SeedInput {
    typeId: string;
    base: BaseSettings;
    // The leaf's defaultConstraints, a curriculum's locked constraints or an ad-hoc override.
    override?: Record<string, unknown>;
    // The picked leerjaar, if any. With a leaf marked gradeSetsMax it beats the leaf's pinned
    // max; pass null for a curriculum's locked constraints, which are the author's, not a seed.
    grade?: Leerjaar | null;
    leafId?: string;
}

const PLACE_WEIGHT: Record<string, number> = Object.fromEntries(PLACE_VALUES.map(p => [p.key, p.weight]));
const MAX_KEYS = ['maxGetal', 'maxRange', 'maxNumber'] as const;

// Keep only the places a number up to `max` has (masks: weight ≤ max) or can carry out of
// (bridges: weight < max, like getBridgePlaces). Unknown keys stay.
function trimPlaces<V>(obj: Record<string, V>, max: number, inclusive: boolean): Record<string, V> {
    return Object.fromEntries(Object.entries(obj).filter(([k]) => {
        const w = PLACE_WEIGHT[k];
        return w === undefined || (inclusive ? w <= max : w < max);
    }));
}

// A new block's constraints: registry defaults → base snapshot → override, so a leaf that
// pins a value (splitsen-basis maxGetal:10) wins. The store, the sidebar hover card, the
// MassAdd preview and the test helper all call this, so a preview is the block it adds.
export function seedConstraints({ typeId, base, override: leafOverride, grade, leafId }: SeedInput): Record<string, unknown> {
    const def = REGISTRY[typeId];
    if (!def) return { ...(leafOverride ?? {}) };
    const defaults = def.defaultConstraints(typeId) as Record<string, unknown>;
    const range = baseRangeFor(base, defaults, leafOverride, def.maxPresets);
    let override = leafOverride;
    if (grade != null && range && override && leafId && LEAF_BY_ID[leafId]?.gradeSetsMax) {
        const { [range.key]: _pinnedMax, ...rest } = override;
        void _pinnedMax;
        override = rest;
    }
    const snapshot = baseApply(base, defaults, range);
    const merged: Record<string, unknown> = { ...defaults, ...snapshot, ...(override ?? {}) };

    // A leerjaar-6 HM mask on a block whose max is 1 000 (decimal hr, MAB, splitsen basis)
    // asks for a place the block can never show: trim the base's places to the block's own
    // max, and fall back to the type's default when nothing is left.
    const maxKey = MAX_KEYS.find(k => typeof merged[k] === 'number');
    if (maxKey) {
        const max = merged[maxKey] as number;
        for (const key of ['operand1Mask', 'operand2Mask', 'bridges'] as const) {
            if (!(key in snapshot) || (override && key in override)) continue;
            const trimmed = trimPlaces(snapshot[key] as Record<string, unknown>, max, key !== 'bridges');
            merged[key] = Object.keys(trimmed).length > 0 ? trimmed : defaults[key];
        }
    }
    // Same idea for settings that hang on the max (rounding targets, an axis span).
    return SEED_FIT[typeId]?.(merged) ?? merged;
}
