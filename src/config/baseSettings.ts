// ── Global base settings (snapshot-on-add) ───────────────────────────────────
// A set of difficulty defaults the teacher sets once (sidebar → Geavanceerd →
// Basisinstellingen). When a new block is created, these are snapshotted into that
// block's constraints — NOT live-linked, so changing the base later never
// retro-affects existing blocks. Pure data (no React) so the store can import it.

import { NAT_CEILING, floorToPreset, type MaxPresetsFn, type MaxRange } from './numberRanges';

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
//   Without a range the seed is copied, capped at NAT_CEILING.
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
    if ('maxGetal' in registryDefaults) out.maxGetal = range?.key === 'maxGetal' ? floored : capped;
    if ('maxRange' in registryDefaults) out.maxRange = range?.key === 'maxRange' ? floored : capped;
    // maxNumber is MAB-only, and MAB draws place-value blocks up to 1000 — never hand it
    // the five/ten-digit base seeds the other types accept.
    if ('maxNumber' in registryDefaults) out.maxNumber = range?.key === 'maxNumber' ? floored : Math.min(base.baseMaxGetal, 9999);

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
