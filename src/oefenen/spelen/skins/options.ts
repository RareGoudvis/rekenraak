import type { SkinChoices, SkinMeta } from './types';

// The pre-start choices of a skin (Bom: tijd and doel; Bever, Zombies: niveau). Pure, plus the
// last pick per skin on this device, so one tap on Start replays it.

export const OPTIONS_KEY = 'rekenraak_spelen_opties_v1';

/** The picked value per option: the given one when it is a real choice, else the option's default. */
export function choicesOf(meta: SkinMeta, picked: SkinChoices = {}): SkinChoices {
    const out: SkinChoices = {};
    for (const o of meta.options ?? []) out[o.id] = o.choices.some(c => c.value === picked[o.id]) ? picked[o.id] : o.default;
    return out;
}

/** The meta a round starts with: the picks recorded, their round patches merged in. */
export function resolveMeta(meta: SkinMeta, picked: SkinChoices = {}): SkinMeta {
    if (!meta.options?.length) return meta;
    const chosen = choicesOf(meta, picked);
    let round = { ...meta.round };
    for (const o of meta.options) round = { ...round, ...o.choices.find(c => c.value === chosen[o.id])?.round };
    // A pick with a clock (Schatkist's 3 minuten) makes an untimed game timed.
    return { ...meta, round, chosen, timed: meta.timed || !!round.seconds };
}

function readAll(): Record<string, SkinChoices> {
    try {
        const v: unknown = JSON.parse(globalThis.localStorage?.getItem(OPTIONS_KEY) ?? '{}');
        return v && typeof v === 'object' ? v as Record<string, SkinChoices> : {};
    } catch { return {}; }
}

/** The last pick for this skin on this device (checked against its options). */
export const loadChoices = (meta: SkinMeta): SkinChoices => choicesOf(meta, readAll()[meta.id] ?? {});

export function saveChoices(id: string, chosen: SkinChoices): void {
    try { globalThis.localStorage?.setItem(OPTIONS_KEY, JSON.stringify({ ...readAll(), [id]: chosen })); } catch { /* private mode: this visit only */ }
}
