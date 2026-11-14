import type { MathBlock } from '../../../services/math/types';
import type {
    AddSubConstraints, MulDivConstraints, MixedConstraints, CijferConstraints, ClockConstraints,
    FractionConstraints, BreukBewerkConstraints, GeldTeruggevenConstraints, GeldRekenenConstraints,
    GetallenasConstraints, GetallenrijConstraints, SplitsenConstraints, AfrondenConstraints,
    HerleidingenConstraints, BridgeMap,
} from '../../../services/math/constraintTypes';
import { MIXED_VARIANTS } from '../../../services/math/constraintTypes';
import { presetLabel } from '../../../config/numberRanges';
import { chosenJumps } from './shared/jumpSelection';

// One short Dutch line of a block's key content settings (EXERCISE_UI[typeId].summary), e.g.
// "Tot 1.000 · 2 termen · vrij · brug T moet". Each reads its family's constraints with the
// same fallbacks as that family's Config, so the line says what the panel shows.

const join = (parts: (string | number | false | null | undefined)[]) => parts.filter((p): p is string => typeof p === 'string' && p !== '').join(' · ');
const nl = (n: number) => n.toLocaleString('nl-BE');
const c = <C>(block: MathBlock) => (block.constraints ?? {}) as Partial<C>;

const OP_GLYPH: Record<string, string> = { '+': '+', '-': '−', x: '×', ':': ':' };

function bridgesText(bridges: BridgeMap | undefined): string | null {
    const parts = Object.entries(bridges ?? {})
        .filter(([, v]) => v === 'REQUIRED' || v === 'FORBIDDEN')
        .map(([k, v]) => `brug ${k} ${v === 'REQUIRED' ? 'moet' : 'niet'}`);
    return parts.length ? parts.join(', ') : null;
}

function numberTypeText(numberType: string | undefined, decimals?: number): string | null {
    if (numberType === 'decimal') return decimals ? `kommagetallen (${decimals} na de komma)` : 'kommagetallen';
    if (numberType === 'rational') return 'breuken';
    if (numberType === 'geheel') return 'gehele getallen';
    return null;
}

const presetText = (preset: string | undefined): string =>
    preset === 'compenseren' ? 'compenseren' : preset === 'tienvoud' ? 'met 10, 100, 1000' : 'vrij';

export function addSubSummary(block: MathBlock): string {
    const k = c<AddSubConstraints>(block);
    if (k.numberType === 'rational') return join(['breuken', k.equationType === 'puntoefening' && 'puntoefening']);
    return join([
        k.maxGetal && presetLabel(k.maxGetal),
        numberTypeText(k.numberType, k.decimalPlaces),
        `${Math.min(4, Math.max(2, k.termCount ?? 2))} termen`,
        presetText(k.preset),
        k.equationType === 'puntoefening' && 'puntoefening',
        bridgesText(k.bridges),
    ]);
}

export function mulDivSummary(block: MathBlock): string {
    const k = c<MulDivConstraints>(block);
    const isDiv = block.typeId === 'hr-std-delen';
    if (k.numberType === 'rational') return join(['breuken', k.equationType === 'puntoefening' && 'puntoefening']);
    const punt = k.equationType === 'puntoefening' && 'puntoefening';
    if (k.preset === 'tienvoud') return join([presetText('tienvoud'), punt]);
    const mode = k.multiplicationMode ?? 'tafels';
    if (k.numberType !== 'decimal' && mode === 'tafels') {
        const tables = (k.selectedTables ?? []).slice().sort((a, b) => a - b);
        return join([
            tables.length ? `${isDiv ? 'deeltafels' : 'tafels'} van ${tables.join(', ')}` : (isDiv ? 'deeltafels' : 'tafels'),
            k.tableLimit && `tot × ${k.tableLimit}`,
            punt,
        ]);
    }
    if (k.numberType !== 'decimal' && mode === 'met_rest') return join(['met rest', `N${k.metRestLevel ?? 1}`, k.maxGetal && presetLabel(k.maxGetal)]);
    return join([k.maxGetal && presetLabel(k.maxGetal), numberTypeText(k.numberType, k.decimalPlaces), punt]);
}

export function gemengdSummary(block: MathBlock): string {
    const k = c<MixedConstraints>(block);
    const ids = k.variants?.length ? k.variants : ['+', '-', 'x', ':'];
    const ops = MIXED_VARIANTS.filter(v => ids.includes(v.id))
        .map(v => OP_GLYPH[v.op] + (v.preset === 'compenseren' ? ' comp.' : v.preset === 'tienvoud' ? ' tienvoud' : ''));
    return join([
        k.maxGetal && presetLabel(k.maxGetal),
        ops.join(' '),
        (k.mix ?? 'random') === 'cycle' ? 'om de beurt' : 'willekeurig',
    ]);
}

export function cijferSummary(block: MathBlock): string {
    const k = c<CijferConstraints>(block);
    const terms = k.operator === '+' ? Math.min(Math.max(2, k.numberOfTerms || 2), 4) : 2;
    return join([
        presetLabel(k.maxRange || 1000),
        k.numberType === 'decimal' && `${k.decimalPlaces || 2} na de komma`,
        k.operator === '+' && `${terms} termen`,
        k.operator === ':' && k.withRemainder && 'met rest',
        k.withEstimation && 'met schatting',
        (k.operator === '+' || k.operator === '-') && bridgesText(k.bridges),
    ]);
}

const FRACTION_SUBTYPE: Record<string, string> = {
    kleuren: 'kleuren', herkennen: 'herkennen', lijnstuk: 'lijnstuk', veelhoek: 'veelhoek',
    hoeveelheid: 'hoeveelheid concreet', 'hoeveelheid-rechthoek': 'hoeveelheid schematisch', 'hoeveelheid-abstract': 'hoeveelheid abstract',
};

export function fractionSummary(block: MathBlock): string {
    const k = c<FractionConstraints>(block);
    const subType = k.subType ?? 'kleuren';
    return join([
        FRACTION_SUBTYPE[subType] ?? subType,
        `noemer ${k.minDenominator ?? 2} tot ${k.maxDenominator ?? 8}`,
        k.allowImproper && 'ook onecht',
    ]);
}

const BEWERK_SUBTYPE: Record<string, string> = { gemengd: 'gemengd getal', gelijknamig: 'gelijknamig maken', vereenvoudigen: 'vereenvoudigen' };
const BEWERK_DIRECTION: Record<string, string> = { 'naar-gemengd': 'breuk → gemengd', 'naar-breuk': 'gemengd → breuk', beide: 'beide richtingen' };

export function breukBewerkSummary(block: MathBlock): string {
    const k = c<BreukBewerkConstraints>(block);
    const subType = k.subType ?? 'gemengd';
    if (subType === 'gemengd') {
        return join([BEWERK_SUBTYPE.gemengd, BEWERK_DIRECTION[k.direction ?? 'naar-gemengd'], `tot ${k.maxNumerator ?? 10}/${k.maxDenominator ?? 10}`]);
    }
    return join([BEWERK_SUBTYPE[subType] ?? subType, `noemer ${k.minDenominator ?? 2} tot ${k.maxDenominator ?? 10}`, k.allowImproper && 'ook onecht']);
}

const TIME_SHORT: Record<string, string> = {
    uren: 'uren', halve_uren: 'halve uren', kwartier_over: 'kwart over', kwartier_voor: 'kwart voor',
    nauwkeurig_5: "5'", nauwkeurig_1: "1'",
};
const CLOCK_MODE: Record<string, string> = { lezen: 'lezen', tekenen: 'tekenen', omzetten: 'omzetten' };

export function clockSummary(block: MathBlock): string {
    const k = c<ClockConstraints>(block);
    const types = k.timeTypes ?? ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'];
    return join([
        `${k.clockType ?? 'analoog'} ${CLOCK_MODE[k.exerciseMode ?? 'lezen']}`,
        k.is24hour ? '24 uur' : '12 uur',
        types.map(t => TIME_SHORT[t] ?? t).join(', '),
    ]);
}

const euro = (cents: number) => `€${nl(cents / 100)}`;

export function geldTeruggevenSummary(block: MathBlock): string {
    const k = c<GeldTeruggevenConstraints>(block);
    const max = k.maxPriceEuros ?? 49;
    // SYNC: the prijsbereik presets in GeldTeruggevenConfig (max 0 = tot €1, 1 = tot €2, else max + 1).
    const top = max === 0 ? 1 : max === 1 ? 2 : max + 1;
    const pay = (k.payWithOptions ?? [1000, 2000, 5000]).slice().sort((a, b) => a - b);
    return join([`prijs tot €${nl(top)}`, `betalen met ${pay.map(euro).join(', ')}`]);
}

const GELD_REKENEN: Record<string, string> = { korting: 'korting', winst: 'winst en verlies', intrest: 'intrest' };

export function geldRekenenSummary(block: MathBlock): string {
    const k = c<GeldRekenenConstraints>(block);
    const subType = k.subType ?? 'korting';
    return join([
        GELD_REKENEN[subType] ?? subType,
        subType !== 'winst' && (k.percents ?? [10, 25, 50]).map(p => `${p} %`).join(', '),
        `tot € ${nl(k.maxEuro ?? 100)}`,
        (k.wholeEuros ?? true) && "hele euro's",
    ]);
}

const AXIS_DIRECTION: Record<string, string> = { right: 'stijgend', left: 'dalend', beide: 'stijgend en dalend' };
const jumpText = (k: Partial<GetallenasConstraints>) =>
    k.numberType === 'rational' ? `sprong 1/${k.fractionStep ?? 4}` : `sprong ${chosenJumps(k).map(j => nl(j)).join(', ')}`;

export function getallenasSummary(block: MathBlock): string {
    const k = c<GetallenasConstraints>(block);
    return join([
        k.numberType !== 'rational' && presetLabel(k.maxGetal ?? 100),
        numberTypeText(k.numberType),
        jumpText(k),
        AXIS_DIRECTION[k.direction ?? 'right'],
        k.hardMode && 'meer lege vakjes',
    ]);
}

export function getallenrijSummary(block: MathBlock): string {
    const k = c<GetallenrijConstraints>(block);
    return join([
        k.numberType !== 'rational' && presetLabel(k.maxGetal ?? 100),
        numberTypeText(k.numberType),
        jumpText(k),
        AXIS_DIRECTION[k.direction ?? 'right'],
        k.hardMode && 'meer lege vakjes',
    ]);
}

const SPLITS_LAYOUT: Record<string, string> = {
    basic: 'rooster', splitsboom: 'splitsboom', 'verliefde-harten': 'verliefde harten',
    'positie-tabel': 'positietabel', 'positie-benen': 'splitsbenen', 'positie-math': 'plaatswaarden',
};

export function splitsenSummary(block: MathBlock): string {
    const k = c<SplitsenConstraints>(block);
    return join([
        presetLabel(k.maxGetal ?? 10),
        SPLITS_LAYOUT[k.layout ?? 'basic'] ?? k.layout,
        (k.decimalPlaces ?? 0) > 0 && `${k.decimalPlaces} na de komma`,
        k.fixedTotal != null && `altijd ${nl(k.fixedTotal)}`,
    ]);
}

export function afrondenSummary(block: MathBlock): string {
    const k = c<AfrondenConstraints>(block);
    const isDecimal = k.numberType === 'decimal';
    const targets = k.roundTargets ?? (isDecimal ? ['E', 't'] : ['T', 'H']);
    return join([
        presetLabel(k.maxGetal ?? (isDecimal ? 100 : 1000)),
        isDecimal && `${k.decimalPlaces ?? 2} na de komma`,
        `op ${targets.join(', ')}`,
    ]);
}

export function herleidingenSummary(block: MathBlock): string {
    const k = c<HerleidingenConstraints>(block);
    const units = k.units ?? [];
    return join([
        k.measure ?? 'lengte',
        units.length ? units.join(', ') : null,
        `tot ${nl(k.maxEnkel ?? 100)}`,
    ]);
}
