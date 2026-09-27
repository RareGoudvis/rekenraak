import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MathBlock } from '../services/math/types';
import { numberToDutchWords } from '../services/splitsen/dutchWords';
import { generateSplitsenExercises, recomputeSplitsenExercise } from '../services/splitsen/splitsenGenerator';
import { generateAfrondenExercises, targetsFor, usableTargets, roundTo, targetHeading } from '../services/afronden/afrondenGenerator';
import { generateVergelijkenExercises } from '../services/vergelijken/vergelijkenGenerator';
import { repText } from '../services/vergelijken/representations';
import { generatePlaatswaardeExercises } from '../services/plaatswaarde/plaatswaardeGenerator';
import { NAT_CEILING } from '../config/numberRanges';

// Getalbegrip generators at the 1e9 ceiling, checked against references written here from
// scratch (string digits, integer rounding, a word parser) rather than the engine's helpers.

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

beforeEach(() => {
    const rnd = mulberry32(20260927);
    vi.spyOn(Math, 'random').mockImplementation(rnd);
});
afterEach(() => vi.restoreAllMocks());

function block(typeId: string, constraints: Record<string, unknown>, numberOfExercises = 40): MathBlock {
    return { id: `b-${typeId}`, typeId, numberOfExercises, constraints } as unknown as MathBlock;
}

// Independent place table: key → exponent of ten.
const EXP: Record<string, number> = { Mrd: 9, HM: 8, TM: 7, M: 6, HD: 5, TD: 4, D: 3, H: 2, T: 1, E: 0 };
// Digit of a natural number at 10^exp, read off its decimal string.
const digitOf = (n: number, exp: number): number => {
    const s = String(Math.round(n));
    const i = s.length - 1 - exp;
    return i < 0 ? 0 : Number(s[i]);
};

// ── Dutch words ────────────────────────────────────────────────────────────────

const UNITS = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
    'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'];
const TENS_W: Record<string, number> = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };

function parseUnderHundred(w: string): number {
    if (w === '') return 0;
    const u = UNITS.indexOf(w);
    if (u >= 0) return u;
    if (w in TENS_W) return TENS_W[w];
    const m = /^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)(en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/.exec(w);
    if (!m) throw new Error(`unparsed "${w}"`);
    // The trema is required exactly after twee / drie (tweeëntwintig, drieëntwintig).
    const wantsTrema = m[1] === 'twee' || m[1] === 'drie';
    if ((m[2] === 'ën') !== wantsTrema) throw new Error(`bad joiner in "${w}"`);
    return UNITS.indexOf(m[1]) + TENS_W[m[3]];
}
function parseUnderThousand(w: string): number {
    const i = w.indexOf('honderd');
    if (i < 0) return parseUnderHundred(w);
    const head = w.slice(0, i);
    if (head === 'een') throw new Error(`"eenhonderd" in "${w}"`);
    return (head === '' ? 1 : UNITS.indexOf(head)) * 100 + parseUnderHundred(w.slice(i + 7));
}
function parseChunk(w: string): number {
    const i = w.indexOf('duizend');
    if (i < 0) return parseUnderThousand(w);
    const head = w.slice(0, i);
    if (head === 'een') throw new Error(`"eenduizend" in "${w}"`);
    return (head === '' ? 1 : parseUnderThousand(head)) * 1000 + parseUnderThousand(w.slice(i + 7));
}
function parseDutch(s: string): number {
    if (s === 'nul') return 0;
    let acc = 0, cur = 0;
    for (const tok of s.split(' ')) {
        if (tok === 'miljard') { acc += cur * 1e9; cur = 0; }
        else if (tok === 'miljoen') { acc += cur * 1e6; cur = 0; }
        else cur = parseChunk(tok);
    }
    return acc + cur;
}

describe('numberToDutchWords up to een miljard', () => {
    test.each<[number, string]>([
        [0, 'nul'],
        [1, 'een'],
        [21, 'eenentwintig'],
        [22, 'tweeëntwintig'],
        [23, 'drieëntwintig'],
        [100, 'honderd'],
        [1000, 'duizend'],
        [1001, 'duizendeen'],
        [1_000_000, 'een miljoen'],
        [1_000_001, 'een miljoen een'],
        [2_500_000, 'twee miljoen vijfhonderdduizend'],
        [325_400_023, 'driehonderdvijfentwintig miljoen vierhonderdduizenddrieëntwintig'],
        [999_999_999, 'negenhonderdnegenennegentig miljoen negenhonderdnegenennegentigduizendnegenhonderdnegenennegentig'],
        [1_000_000_000, 'een miljard'],
        [1_000_000_023, 'een miljard drieëntwintig'],
        [3.45, 'drie komma vier vijf'],
    ])('%d → %s', (n, words) => {
        expect(numberToDutchWords(n)).toBe(words);
    });

    test('never undefined / NaN, clean spacing, round-trips (1000 random n ≤ 1e9)', () => {
        const samples = [0, 1, 10, 11, 99, 101, 110, 999, 1100, 10_000, 100_000, 999_999, 1_000_000, 10_000_000, 100_000_000, 1e9];
        for (let i = 0; i < 1000; i++) samples.push(Math.floor(Math.random() * (NAT_CEILING + 1)));
        for (const n of samples) {
            const w = numberToDutchWords(n);
            expect(w, `n=${n}`).not.toMatch(/undefined|NaN/);
            expect(w, `n=${n}`).toMatch(/^\S+( \S+)*$/);
            expect(parseDutch(w), `n=${n}: ${w}`).toBe(n);
        }
    });

    test('non-finite and negative input never leak undefined', () => {
        expect(numberToDutchWords(NaN)).toBe('');
        expect(numberToDutchWords(Infinity)).toBe('');
        expect(numberToDutchWords(-5)).toBe('min vijf');
    });
});

// ── Splitsen positie-* at 1e9 ─────────────────────────────────────────────────

type Part = { key: string; digit: number; weight: number };
const sumParts = (parts: Part[]) => parts.reduce((a, p) => a + p.digit * 10 ** EXP[p.key], 0);

describe('splitsen positie layouts at 1e9', () => {
    test('positie-tabel: ten columns Mrd…E, digits add up, words read back, high columns filled', () => {
        const exs = generateSplitsenExercises(block('splitsen', { layout: 'positie-tabel', maxGetal: 1e9 }, 200));
        const filled = new Set<string>();
        for (const ex of exs) {
            const cols = ex.placeBreakdown as Part[];
            expect(cols.map(p => p.key)).toEqual(['Mrd', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E']);
            expect(Number.isFinite(ex.total) && ex.total >= 1 && ex.total <= 1e9).toBe(true);
            for (const p of cols) expect(p.digit, `${ex.total} ${p.key}`).toBe(digitOf(ex.total, EXP[p.key]));
            expect(sumParts(cols)).toBe(ex.total);
            expect(parseDutch(ex.words!)).toBe(ex.total);
            cols.filter(p => p.digit).forEach(p => filled.add(p.key));
        }
        for (const k of ['HM', 'TM', 'M']) expect(filled.has(k), k).toBe(true);
    });

    test.each(['positie-benen', 'positie-math'])('%s: non-zero places sum to the total, free and masked', (layout) => {
        const masks: Record<string, boolean>[] = [{}, { HM: true, E: true }, { TM: true, M: true, D: true }, { Mrd: true }];
        for (const operand1Mask of masks) {
            const exs = generateSplitsenExercises(block('splitsen', { layout, maxGetal: 1e9, operand1Mask }, 20));
            expect(exs.length).toBeGreaterThan(0);
            for (const ex of exs) {
                const parts = ex.placeBreakdown as Part[];
                expect(parts.every(p => p.digit >= 1 && p.digit <= 9)).toBe(true);
                expect(sumParts(parts), `${layout} ${JSON.stringify(operand1Mask)}`).toBe(ex.total);
                if (Object.keys(operand1Mask).length && !operand1Mask.Mrd) {
                    expect(parts.map(p => p.key).sort()).toEqual(Object.keys(operand1Mask).sort());
                }
            }
        }
    });

    test('recompute: a typed total up to 1e9 keeps every digit, above it caps at the ceiling', () => {
        const b = block('splitsen', { layout: 'positie-tabel', maxGetal: 1000 }, 1);
        const [ex] = generateSplitsenExercises(b);
        const r = recomputeSplitsenExercise(b, ex, 987_654_321);
        expect(r.total).toBe(987_654_321);
        expect(sumParts(r.placeBreakdown as Part[])).toBe(987_654_321);
        expect(parseDutch(r.words!)).toBe(987_654_321);
        const capped = recomputeSplitsenExercise(b, ex, 5e9);
        expect(capped.total).toBe(NAT_CEILING);
        expect(capped.words).toBe('een miljard');
        expect(sumParts(capped.placeBreakdown as Part[])).toBe(NAT_CEILING);

        const benen = block('splitsen', { layout: 'positie-benen', maxGetal: 1e9 }, 1);
        const rb = recomputeSplitsenExercise(benen, generateSplitsenExercises(benen)[0], 400_030_005);
        expect((rb.placeBreakdown as Part[]).map(p => p.key)).toEqual(['HM', 'TD', 'E']);

        const basic = block('splitsen', { layout: 'basic', maxGetal: 1_000_000, rowsPerBox: 4 }, 1);
        const rp = recomputeSplitsenExercise(basic, generateSplitsenExercises(basic)[0], 999_999_999);
        for (const p of rp.pairs!) expect(p.given + p.answer).toBe(999_999_999);
    });
});

// ── Afronden to M / TM / HM ───────────────────────────────────────────────────

// Half-up integer rounding (positive n), no floats involved.
const roundRef = (n: number, w: number) => {
    const q = Math.floor(n / w), r = n - q * w;
    return (2 * r >= w ? q + 1 : q) * w;
};

describe('afronden big targets', () => {
    test('existing targets keep their order; the new ones are appended', () => {
        expect(targetsFor('natural').map(t => t.key)).toEqual(['T', 'H', 'D', 'TD', 'HD', 'M', 'TM', 'HM', 'Mrd']);
    });

    test('the millions read 1M / 10M / 100M / 1MLD in the config and on the sheet; the rest keep theirs', () => {
        const t = Object.fromEntries(targetsFor('natural').map(x => [x.key, x]));
        expect(['M', 'TM', 'HM', 'Mrd'].map(k => [t[k].label, targetHeading(t[k])])).toEqual([['1M', '1M'], ['10M', '10M'], ['100M', '100M'], ['1MLD', '1MLD']]);
        expect(t.HD.label).toBe('honderdduizendtal');
        expect(['T', 'H', 'D', 'TD', 'HD'].map(k => targetHeading(t[k]))).toEqual(['T', 'H', 'D', 'TD', 'HD']);
    });

    test('1MLD is offered only once the max reaches a billion', () => {
        const all = targetsFor('natural').map(t => t.key);
        const usable = (max: number) => usableTargets('natural', max, 0, all).map(t => t.key);
        expect(usable(100_000_000)).not.toContain('Mrd');
        expect(usable(999_999_999)).not.toContain('Mrd');
        expect(usable(1e9)).toContain('Mrd');
    });

    test('rounding to 1MLD gives 0 or 1 000 000 000, as the reference does', () => {
        for (const n of [1, 499_999_999, 500_000_000, 500_000_001, 999_999_999, 1e9]) expect(roundTo(n, 1e9), String(n)).toBe(roundRef(n, 1e9));
        const exs = generateAfrondenExercises(block('afronden', {
            subType: 'simpel', numberType: 'natural', maxGetal: 1e9, roundTargets: ['Mrd'],
        }, 50));
        for (const ex of exs) {
            expect(ex.targetKey).toBe('Mrd');
            expect([0, 1e9]).toContain(roundTo(ex.number!, 1e9));
            expect(roundTo(ex.number!, 1e9)).toBe(roundRef(ex.number!, 1e9));
        }
    });

    test('a target is only usable below the max, so schattend (≤ 1e5) and today\'s sheets see no new one', () => {
        const all = targetsFor('natural').map(t => t.key);
        const usable = (max: number) => usableTargets('natural', max, 0, all).map(t => t.key);
        expect(usable(1000)).toEqual(['T', 'H']);
        expect(usable(100_000)).toEqual(['T', 'H', 'D', 'TD']);
        expect(usable(1_000_000)).toEqual(['T', 'H', 'D', 'TD', 'HD']);
        expect(usable(1e9)).toEqual(all);
    });

    test('simpel at 1e9 rounds to M / TM / HM exactly', () => {
        const exs = generateAfrondenExercises(block('afronden', {
            subType: 'simpel', numberType: 'natural', maxGetal: 1e9, roundTargets: ['M', 'TM', 'HM'],
        }, 300));
        expect(exs.length).toBe(300);
        const seen = new Set<string>();
        for (const ex of exs) {
            const n = ex.number!;
            expect(Number.isInteger(n) && n >= 1 && n <= 1e9).toBe(true);
            const w = 10 ** EXP[ex.targetKey!];
            seen.add(ex.targetKey!);
            expect(roundTo(n, w), `${n} op ${ex.targetKey}`).toBe(roundRef(n, w));
        }
        expect([...seen].sort()).toEqual(['HM', 'M', 'TM']);
        for (const n of [500_000, 1_499_999, 1_500_000, 949_999_999, 950_000_000, 999_999_999]) {
            for (const w of [1e6, 1e7, 1e8]) expect(roundTo(n, w)).toBe(roundRef(n, w));
        }
    });

    test('rooster at 1e9 with a masked number stays finite and in range', () => {
        const exs = generateAfrondenExercises(block('afronden', {
            subType: 'rooster', numberType: 'natural', maxGetal: 1e9, roundTargets: ['HD', 'HM'], numberMask: { HM: true, TD: true },
        }, 4));
        for (const ex of exs) for (const n of ex.numbers!) {
            expect(Number.isFinite(n) && n <= 1e9).toBe(true);
            expect(digitOf(n, 8)).toBeGreaterThan(0);
            expect(digitOf(n, 4)).toBeGreaterThan(0);
        }
    });
});

// ── Vergelijken representations ───────────────────────────────────────────────

const REP_KEYS: Array<[string, number]> = [['Mrd', 1e9], ['HM', 1e8], ['TM', 1e7], ['M', 1e6], ['HD', 1e5], ['TD', 1e4], ['D', 1e3], ['H', 100], ['T', 10], ['E', 1], ['t', 0.1], ['h', 0.01]];
const WORD_W: Record<string, number> = {
    miljard: 1e9, miljarden: 1e9, honderdmiljoen: 1e8, honderdmiljoenen: 1e8, tienmiljoen: 1e7, tienmiljoenen: 1e7,
    miljoen: 1e6, miljoenen: 1e6, honderdduizendtal: 1e5, honderdduizendtallen: 1e5, tienduizendtal: 1e4, tienduizendtallen: 1e4,
    duizendtal: 1e3, duizendtallen: 1e3, honderdtal: 100, honderdtallen: 100, tiental: 10, tientallen: 10,
    eenheid: 1, eenheden: 1, tiende: 0.1, tienden: 0.1, honderdste: 0.01, honderdsten: 0.01,
};

const PLURALS = new Set(['miljarden', 'honderdmiljoenen', 'tienmiljoenen', 'miljoenen', 'honderdduizendtallen', 'tienduizendtallen',
    'duizendtallen', 'honderdtallen', 'tientallen', 'eenheden', 'tienden', 'honderdsten']);

// Sum in hundredths so 0,1 + 0,2 style float drift can't fake a mismatch.
function fromLetters(s: string): number {
    if (s === '0') return 0;
    const re = /(\d)(Mrd|HM|TM|HD|TD|M|D|H|T|E|t|h)/g;
    let total = 0, consumed = 0;
    for (const m of s.matchAll(re)) { total += Number(m[1]) * Math.round(REP_KEYS.find(k => k[0] === m[2])![1] * 100); consumed += m[0].length; }
    expect(consumed, s).toBe(s.length);
    return total / 100;
}
function fromWords(s: string): number {
    if (s === '0') return 0;
    const toks = s.split(' ');
    let total = 0;
    for (let i = 0; i < toks.length; i += 2) {
        const d = Number(toks[i]);
        expect(toks[i + 1] in WORD_W, toks[i + 1]).toBe(true);
        // "1 tiental" singular, "3 tientallen" plural.
        expect(PLURALS.has(toks[i + 1]), s).toBe(d > 1);
        total += d * Math.round(WORD_W[toks[i + 1]] * 100);
    }
    return total / 100;
}

// The pre-1e9 D…h list, kept as the reference for values it could already spell.
function legacyLetters(v: number): string {
    const parts = REP_KEYS.slice(6).map(([k, w]) => ({ k, d: Math.floor(Math.round(v * 1e6) / Math.round(w * 1e6)) % 10 })).filter(x => x.d > 0);
    return parts.length ? parts.map(x => `${x.d}${x.k}`).join('') : '0';
}

describe('vergelijken representations are complete up to Mrd', () => {
    test('plaatswaarde and woorden reconstruct the value (≥ TD and decimals)', () => {
        const samples = [0.01, 0.1, 5.4, 10_000, 12_345.67, 1_000_000, 987_654_321.09, 1e9, 400_000_006];
        for (let i = 0; i < 500; i++) samples.push(Math.floor(Math.random() * 1e11) / 100);
        for (const v of samples) {
            expect(fromLetters(repText(v, 'plaatswaarde')), `${v}`).toBe(v);
            expect(fromWords(repText(v, 'woorden')), `${v}`).toBe(v);
        }
    });

    test('values below 1e4 print exactly as before', () => {
        for (let i = 0; i < 2000; i++) {
            const v = Math.floor(Math.random() * 1e6) / 100;
            expect(repText(v, 'plaatswaarde')).toBe(legacyLetters(v));
        }
        expect(repText(5.4, 'woorden')).toBe('5 eenheden 4 tienden');
        expect(repText(1.1, 'woorden')).toBe('1 eenheid 1 tiende');
    });

    test('getallen and kiezen at 1e9 stay finite, in range, and honour a big mask', () => {
        const free = generateVergelijkenExercises(block('vergelijken', { subType: 'getallen', maxGetal: 1e9 }, 30));
        for (const ex of free) for (const n of [ex.a!, ex.b!]) expect(Number.isInteger(n) && n >= 1 && n <= 1e9).toBe(true);
        const masked = generateVergelijkenExercises(block('vergelijken', { subType: 'kiezen', maxGetal: 1e9, setSize: 4, numberMask: { HM: true, TM: true, E: true } }, 10));
        expect(masked.length).toBe(10);
        for (const ex of masked) for (const n of ex.numbers!) {
            const nonZero = Object.entries(EXP).filter(([, e]) => digitOf(n, e) > 0).map(([k]) => k).sort();
            expect(nonZero).toEqual(['E', 'HM', 'TM']);
        }
    });
});

// ── Plaatswaarde at 1e9 ───────────────────────────────────────────────────────

describe('plaatswaarde asks about the high places at 1e9', () => {
    test('placeKey always names a non-zero digit of the number; TM and HM get asked', () => {
        const exs = generatePlaatswaardeExercises(block('plaatswaarde', { subType: 'plaats', maxGetal: 1e9 }, 400));
        const asked = new Set<string>();
        for (const ex of exs) {
            expect(Number.isInteger(ex.number) && ex.number >= 1 && ex.number <= 1e9).toBe(true);
            expect(ex.placeKey in EXP, ex.placeKey).toBe(true);
            expect(digitOf(ex.number, EXP[ex.placeKey]), `${ex.number} ${ex.placeKey}`).toBeGreaterThan(0);
            asked.add(ex.placeKey);
        }
        for (const k of ['HM', 'TM', 'M', 'HD']) expect(asked.has(k), k).toBe(true);
    });

    test('a Mrd / HM / TM mask builds exactly those places', () => {
        const [top] = generatePlaatswaardeExercises(block('plaatswaarde', { subType: 'waarde', maxGetal: 1e9, numberMask: { Mrd: true } }, 1));
        expect(top.number).toBe(1e9);
        expect(top.placeKey).toBe('Mrd');
        const exs = generatePlaatswaardeExercises(block('plaatswaarde', { subType: 'waarde', maxGetal: 1e9, numberMask: { HM: true, TM: true, D: true } }, 20));
        for (const ex of exs) {
            const nonZero = Object.entries(EXP).filter(([, e]) => digitOf(ex.number, e) > 0).map(([k]) => k).sort();
            expect(nonZero).toEqual(['D', 'HM', 'TM']);
            expect(['D', 'HM', 'TM']).toContain(ex.placeKey);
        }
    });
});
