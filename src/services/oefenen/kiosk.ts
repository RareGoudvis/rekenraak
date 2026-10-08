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

/** The card header: the descriptor's kiosk wording when it has one, else the paper instruction. */
export function kioskInstructionOf(typeId: string, ex: unknown, c: Record<string, unknown>, paper: string): string {
    const ki = kioskFor(typeId)?.kioskInstruction;
    return (typeof ki === 'function' ? ki(ex, c) : ki) ?? paper;
}

/** The type has a descriptor and it can check these settings (registry defaults fill gaps). */
export function kioskSupports(typeId: string, constraints: Record<string, unknown> = {}): boolean {
    const def = REGISTRY[typeId];
    if (!def?.kiosk) return false;
    const c = { ...(def.defaultConstraints(typeId) as Record<string, unknown>), ...constraints };
    return def.kiosk.supported?.(c) ?? true;
}

// Sidebar number-kind phrases → the one word a pupil's stats row needs.
const KIND_OF_PHRASE: Record<string, string> = {
    'Natuurlijke getallen': 'natuurlijk', 'Decimale getallen': 'decimaal', 'Kommagetallen': 'decimaal',
    'Rationale getallen': 'breuken', 'Gehele getallen': 'geheel',
};
// A leaf whose path names no number kind (Bewerkingen met breuken › Optellen) pins it instead.
const KIND_OF_NUMBER_TYPE: Record<string, string> = { natural: 'natuurlijk', decimal: 'decimaal', rational: 'breuken', geheel: 'geheel' };

const bare = (s: string) => s.replace(/\s*\([^)]*\)$/, '').trim();
// Only a capitalised word is lowered: "Twee getallen" → "twee getallen", "H/T/E" stays.
const lowerFirst = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** Short name for the oefenmodus builder and the pupil's stats: "Optellen · natuurlijk". */
export function kioskLabel(leaf: AppLeaf): string {
    if (leaf.shortLabel) return leaf.shortLabel;
    const [, sub, type, child] = leaf.path.split(' › ').map(bare);
    const kindPhrase = [type, child].find(p => p !== undefined && KIND_OF_PHRASE[p]);
    const numberType = leaf.defaultConstraints?.numberType;
    const kind = kindPhrase ? KIND_OF_PHRASE[kindPhrase] : typeof numberType === 'string' ? KIND_OF_NUMBER_TYPE[numberType] : undefined;
    // Afronden › Natuurlijke getallen › Eenvoudig: the subdomain is the subject.
    const name = KIND_OF_PHRASE[type] ? sub : type;
    const detail = child !== undefined && !KIND_OF_PHRASE[child] ? lowerFirst(child) : undefined;
    return [name, kind, detail].filter(Boolean).join(' · ');
}

const KIOSK_LABELS: Record<string, string> = Object.fromEntries(flattenLeaves().map(l => [l.id, kioskLabel(l)]));
export const kioskLabelOf = (leafId: string): string | undefined => KIOSK_LABELS[leafId];

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
    'hr-std-gemengd-nat', 'hr-std-gemengd-dec',
    'cijferen-optellen-nat', 'cijferen-optellen-dec', 'cijferen-aftrekken-nat', 'cijferen-aftrekken-dec',
    'cijferen-vermenigvuldigen-nat', 'cijferen-vermenigvuldigen-dec', 'cijferen-delen-nat', 'cijferen-delen-dec',
    'plaatswaarde-waarde', 'plaatswaarde-plaats', 'plaatswaarde-omcirkelen', 'vergelijken-kiezen', 'vergelijken-representaties',
    'even-oneven-cirkels', 'romeinse-herkennen', 'romeinse-schrijven', 'getalbegrip-functie', 'mab-herkennen',
    'schattend-nat', 'schattend-dec', 'handig-rekenvolgorde', 'controleren-negenproef', 'controleren-omgekeerde',
    'vormleer-hoeken-herkennen', 'vormleer-vierhoeken',
    'temperatuur-aflezen', 'temperatuur-verschil', 'massa-weegschaal-aflezen', 'oppervlakte-rooster', 'oppervlakte-berekenen',
    'maateenheid-kiezen', 'herleidingen-lengte', 'herleidingen-inhoud', 'herleidingen-massa', 'herleidingen-oppervlakte',
    'geld-herkennen', 'geld-teruggeven', 'geld-rekenen-korting', 'geld-rekenen-intrest', 'lengte-meten', 'omtrek',
    'splitsen-basis', 'splitsen-boom', 'splitsen-harten', 'splitsen-positietabel',
    'getalbegrip-ordenen-nat', 'getalbegrip-ordenen-dec', 'getalbegrip-ordenen-rat', 'getalbegrip-ordenen-geh',
    'getalbegrip-getallenassen-nat', 'getalbegrip-getallenassen-dec', 'getalbegrip-getallenassen-rat', 'getalbegrip-getallenassen-geh',
    'getalbegrip-getallenrijen-nat', 'getalbegrip-getallenrijen-dec', 'getalbegrip-getallenrijen-rat', 'getalbegrip-getallenrijen-geh',
    'breuken-rangschikken', 'patronen-nat', 'patronen-dec', 'patronen-geh', 'patronen-kettingsommen', 'deelbaarheid-veelvouden',
    'breuken-herkennen', 'breuken-hoeveelheid', 'breuken-gemengd', 'breuken-gelijknamig', 'breuken-vereenvoudigen',
    'verbanden-tabel', 'verbanden-paren', 'procenten-verbanden',
    'klok-analoog-lezen', 'klok-analoog-omzetten', 'klok-digitaal-tekenen', 'tijdsduur-berekenen',
    // Phase C (interactive on the card)
    'even-oneven-rooster',
    'deelbaarheid-tabel', 'deelbaarheid-rooster', 'deelbaarheid-omcirkelen', 'deelbaarheid-kleurraster',
];

export const KIOSK_KEY_TABLE_V1: readonly string[] = [
    'subType', 'maxGetal', 'numberMask', 'chooseTarget', 'setSize', 'decimalPlaces', 'leftRep', 'rightRep',
    'leftMask', 'rightMask', 'leftFracN', 'leftFracD', 'rightFracN', 'rightFracD', 'numberType', 'roundTargets',
    'roosterSize', 'percents', 'scaffold', 'bridges', 'operand1Mask', 'operand2Mask', 'fractionDifficulty',
    'mixedNumber1', 'mixedNumber2', 'maxNumerator1', 'maxDenominator1', 'maxNumerator2', 'maxDenominator2',
    'linkFractions', 'multiplicationMode', 'selectedTables', 'tableLimit',
];
