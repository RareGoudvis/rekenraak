import type { KioskDescriptor, KioskInput } from './types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { flattenLeaves, type AppLeaf } from '../../config/appstructure';

// Registry lookups for the oefenmodus: which types and leaves a pupil can practise.

export function kioskFor(typeId: string): KioskDescriptor | null {
    return REGISTRY[typeId]?.kiosk ?? null;
}

export function kioskInputOf(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): KioskInput {
    return d.inputOf?.(ex, c) ?? d.input;
}

/** The type has a descriptor and it can check these settings (registry defaults fill gaps). */
export function kioskSupports(typeId: string, constraints: Record<string, unknown> = {}): boolean {
    const def = REGISTRY[typeId];
    if (!def?.kiosk) return false;
    const c = { ...(def.defaultConstraints(typeId) as Record<string, unknown>), ...constraints };
    return def.kiosk.supported?.(c) ?? true;
}

/** Sidebar leaves a teacher can put in an oefensessie, in sidebar order. */
export function kioskCapableLeaves(): AppLeaf[] {
    return flattenLeaves().filter(l => kioskSupports(l.typeId, l.defaultConstraints ?? {}));
}

// ── Share-link tables (OefenWire v1) ─────────────────────────────────────────
// A link names a leaf and a constraint key by its index here, so these lists are frozen:
// APPEND ONLY, never reorder or delete (old links would decode to another leaf / setting).
// oefenen.session.test.ts pins both; a new kiosk-capable leaf or key goes at the end.

export const KIOSK_LEAF_TABLE_V1: readonly string[] = [
    'vergelijken-getallen', 'afronden-nat-simpel', 'afronden-dec-simpel', 'procenten-nemen', 'procenten-welk',
    'hr-std-optellen-nat', 'hr-std-optellen-dec', 'hr-std-aftrekken-nat', 'hr-std-aftrekken-dec',
    'hr-std-vermenigvuldigen-nat', 'hr-std-vermenigvuldigen-dec', 'hr-std-delen-nat', 'hr-std-delen-dec',
    'hr-std-optellen-rat', 'hr-std-aftrekken-rat', 'hr-std-vermenigvuldigen-rat', 'hr-std-delen-rat',
];

export const KIOSK_KEY_TABLE_V1: readonly string[] = [
    'subType', 'maxGetal', 'numberMask', 'chooseTarget', 'setSize', 'decimalPlaces', 'leftRep', 'rightRep',
    'leftMask', 'rightMask', 'leftFracN', 'leftFracD', 'rightFracN', 'rightFracD', 'numberType', 'roundTargets',
    'roosterSize', 'percents', 'scaffold', 'bridges', 'operand1Mask', 'operand2Mask', 'fractionDifficulty',
    'mixedNumber1', 'mixedNumber2', 'maxNumerator1', 'maxDenominator1', 'maxNumerator2', 'maxDenominator2',
    'linkFractions', 'multiplicationMode', 'selectedTables', 'tableLimit',
];
