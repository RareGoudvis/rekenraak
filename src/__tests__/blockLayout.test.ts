import { describe, test, expect } from 'vitest';
import { minWidthUnits, tierWidthPx, type WidthUnits } from '../services/layout/blockLayout';
import { makeBlock } from './helpers/makeBlock';

// The width clamp has two regimes: with a measured content width it answers the smallest
// tier that holds it (never below an editorial veto), and without one it falls back to the
// per-type table measured at default settings. Both are pinned here — the fallback because
// it still runs on the first frame, the measured path because it is what lets a small
// block go half or quarter width at all.

const measure = (px: number, atWidth: WidthUnits = 4) => ({ intrinsicPx: px, atWidth });

describe('minWidthUnits — fallback (no measurement)', () => {
    // herleidingen stands in for "the table says full width" (verbanden and tijdsduur dropped to ½)
    // when its tabel columns became font-relative `ch` widths instead of a fixed 220px split.
    test('a full-width table entry still claims the full width, as it did before measuring', () => {
        expect(minWidthUnits(makeBlock('herleidingen', { block: { numberOfExercises: 3 } }))).toBe(4);
    });

    test('hoofdrekenen at a million needs the full width', () => {
        const block = makeBlock('hr-std-optellen', { constraints: { numberType: 'natural', maxGetal: 1000000 } });
        expect(minWidthUnits(block)).toBe(4);
    });

    test('hoofdrekenen at 100 fits a quarter', () => {
        const block = makeBlock('hr-std-optellen', { constraints: { numberType: 'natural', maxGetal: 100 } });
        expect(minWidthUnits(block)).toBe(1);
    });

    // maxGetal is shared by the whole +-x: settings bag but only 'andere'/'vrij' reads it,
    // so a tafels block was being sent to the full width by a slider it never uses.
    test('tafels fit a quarter whatever maxGetal says, because the table bounds them', () => {
        const block = makeBlock('hr-std-vermenigvuldigen', {
            constraints: { numberType: 'natural', maxGetal: 1000000, multiplicationMode: 'tafels', selectedTables: [2, 5, 10], tableLimit: 10 },
        });
        expect(minWidthUnits(block)).toBe(1);
    });

    test('delen met rest needs a half — the rest blank does not fit beside the quotient', () => {
        const block = makeBlock('hr-std-delen', {
            constraints: { numberType: 'natural', maxGetal: 100, multiplicationMode: 'met_rest', selectedTables: [3, 4], metRestLevel: 1 },
        });
        expect(minWidthUnits(block)).toBe(2);
    });
});

describe('minWidthUnits — measured', () => {
    // Measured at a width where the viewer is already 1-up, so the reflow rule stays out of
    // the way and the tier is purely the arithmetic.
    const oneUp = () => makeBlock('rekenvolgorde', { block: { numberOfExercises: 1, widthUnits: 1 } });

    test('narrow content fits a quarter', () => {
        expect(tierWidthPx(1)).toBeGreaterThan(140);
        expect(minWidthUnits(oneUp(), measure(130, 1))).toBe(1);
    });

    test('content wider than a quarter cell is promoted to a half', () => {
        expect(tierWidthPx(1)).toBeLessThan(300);
        expect(tierWidthPx(2)).toBeGreaterThan(300);
        expect(minWidthUnits(oneUp(), measure(300, 1))).toBe(2);
    });

    test('content wider than a half cell is promoted to the full width', () => {
        expect(minWidthUnits(oneUp(), measure(600, 1))).toBe(4);
    });

    test('a measurement never beats an editorial veto', () => {
        // A number line measures narrow at a quarter and still may not go there: its axis
        // labels collide long before anything overflows.
        const as = makeBlock('getallenas', { block: { numberOfExercises: 1 } });
        expect(minWidthUnits(as, measure(80, 1))).toBe(4);
        // The to-scale rulers and the two layout blocks keep the whole width.
        expect(minWidthUnits(makeBlock('omtrek'), measure(80, 1))).toBe(4);
        expect(minWidthUnits(makeBlock('layout-lege-pagina'), measure(10, 1))).toBe(4);
    });

    test('a reflowing block measured at full width is allowed one tier narrower', () => {
        // 2-up at full width: 500px of content fits nowhere narrower on paper, but the
        // viewer goes 1-up in a half cell, so denying the half would be a guess.
        const block = makeBlock('rekenvolgorde', { block: { numberOfExercises: 4, widthUnits: 4 } });
        expect(minWidthUnits(block, measure(500, 4))).toBe(2);
        // Measured AT the half the viewer is already 1-up, so that measurement is the
        // whole truth and the quarter opens on its own arithmetic.
        expect(minWidthUnits(block, measure(140, 2))).toBe(1);
    });

    test('all entries are judged: the full-width entry cannot keep a quarter shut', () => {
        // Measured 2-up at full (500px), then 2-up at a half (300px): the half entry proves
        // the block fits there and reflows, so the quarter opens — the full entry alone
        // would have said "one step below 4" for good.
        const block = makeBlock('rekenvolgorde', { block: { numberOfExercises: 4, widthUnits: 2 } });
        expect(minWidthUnits(block, [measure(500, 4), { ...measure(300, 2), reflows: true }])).toBe(1);
        // Then measured AT the quarter and overflowing: that demand wins and stays.
        expect(minWidthUnits(block, [measure(500, 4), { ...measure(300, 2), reflows: true }, measure(200, 1)])).toBe(2);
    });

    test('the grid-reported column count beats the per-type perRow table', () => {
        // The table says splitsen is 1-up at a half, but the viewer's grid reports 2
        // columns: the wide probe is a reflow artefact and the quarter may open.
        const block = makeBlock('splitsen', { constraints: { layout: 'verliefde-harten', maxGetal: 20 }, block: { numberOfExercises: 4, widthUnits: 2 } });
        expect(minWidthUnits(block, { ...measure(280, 2), reflows: true })).toBe(1);
        // A 1-up grid at the same width means 280px is the honest single-item minimum.
        expect(minWidthUnits(block, { ...measure(280, 2), reflows: false })).toBe(2);
    });

    test('a 1-up type is never opened up by the reflow rule', () => {
        // getallenrijen renders one sequence per row at every width, so a wide measurement
        // means exactly what it says.
        const block = makeBlock('getallenrijen', { block: { numberOfExercises: 4, widthUnits: 4 } });
        expect(minWidthUnits(block, measure(600, 4))).toBe(4);
    });

    test('the measured path ignores the settings gates the fallback applies', () => {
        // Decimal hoofdrekenen is barred from a quarter by the fallback table; a real
        // measurement of 120px says otherwise, and the measurement wins.
        const block = makeBlock('hr-std-optellen', { constraints: { numberType: 'decimal', maxGetal: 100 }, block: { widthUnits: 1, numberOfExercises: 1 } });
        expect(minWidthUnits(block)).toBe(2);
        expect(minWidthUnits(block, measure(120, 1))).toBe(1);
    });
});

// The floors below read `block.constraints`, so a measurement of a tiny probe width must
// not be able to talk a type below what the settings say it needs — these all pass a
// generous measurement (or none) to isolate the floor itself.
describe('minWidthUnits — settings-shaped editorial floors (C1 step 0)', () => {
    test('getallenas / getallenrijen / getalfunctie stay full width regardless of settings', () => {
        expect(minWidthUnits(makeBlock('getallenas'), measure(10, 1))).toBe(4);
        expect(minWidthUnits(makeBlock('getallenrijen'), measure(10, 1))).toBe(4);
        expect(minWidthUnits(makeBlock('getalfunctie'), measure(10, 1))).toBe(4);
    });

    test('getalpatronen / kettingsommen / even-oneven floor at a half', () => {
        expect(minWidthUnits(makeBlock('getalpatronen'), measure(10, 1))).toBe(2);
        expect(minWidthUnits(makeBlock('kettingsommen'), measure(10, 1))).toBe(2);
        expect(minWidthUnits(makeBlock('even-oneven'), measure(10, 1))).toBe(2);
    });

    test('deelbaarheid: veelvouden floors at a half, tabel depends on the divisor count', () => {
        const veelvouden = makeBlock('deelbaarheid', { constraints: { layout: 'veelvouden' } });
        expect(minWidthUnits(veelvouden, measure(10, 1))).toBe(2);

        const smallTable = makeBlock('deelbaarheid', { constraints: { layout: 'tabel', divisors: [2, 3, 5] } });
        expect(minWidthUnits(smallTable, measure(10, 1))).toBe(2);

        const bigTable = makeBlock('deelbaarheid', { constraints: { layout: 'tabel', divisors: [2, 3, 4, 5, 10] } });
        expect(minWidthUnits(bigTable, measure(10, 1))).toBe(4);
    });

    test('splitsen: positie-tabel / positie-benen scale with maxGetal, positie-math floors at a half', () => {
        const tabelSmall = makeBlock('splitsen', { constraints: { layout: 'positie-tabel', maxGetal: 100 } });
        expect(minWidthUnits(tabelSmall, measure(10, 1))).toBe(2);
        const tabelBig = makeBlock('splitsen', { constraints: { layout: 'positie-tabel', maxGetal: 1000 } });
        expect(minWidthUnits(tabelBig, measure(10, 1))).toBe(4);

        const benenSmall = makeBlock('splitsen', { constraints: { layout: 'positie-benen', maxGetal: 100 } });
        expect(minWidthUnits(benenSmall, measure(10, 1))).toBe(1);
        const benenBig = makeBlock('splitsen', { constraints: { layout: 'positie-benen', maxGetal: 1000 } });
        expect(minWidthUnits(benenBig, measure(10, 1))).toBe(2);

        const math = makeBlock('splitsen', { constraints: { layout: 'positie-math', maxGetal: 100 } });
        expect(minWidthUnits(math, measure(10, 1))).toBe(2);
    });

    test('breuken hoeveelheid floors at a half, other subtypes stay unfloored', () => {
        const hoeveelheid = makeBlock('breuken', { constraints: { subType: 'hoeveelheid' } });
        expect(minWidthUnits(hoeveelheid, measure(10, 1))).toBe(2);
        const lijnstuk = makeBlock('breuken', { constraints: { subType: 'lijnstuk' } });
        expect(minWidthUnits(lijnstuk, measure(10, 1))).toBe(1);
    });

    test('mab-tekenen can go to a quarter, mab-herkennen stays at a half', () => {
        expect(minWidthUnits(makeBlock('mab-tekenen'), measure(10, 1))).toBe(1);
        expect(minWidthUnits(makeBlock('mab-herkennen'), measure(10, 1))).toBe(2);
    });

    // C3: ordenen/breuken-rangschikken never wrap a row onto a second line, so a row too
    // wide for its column has no fallback but a wider one — the floor is 2 or 4, never 1.
    test('ordenen: a short natural-number row floors at a half', () => {
        const block = makeBlock('ordenen', { constraints: { numberType: 'natural', maxGetal: 100, count: 3 } });
        expect(minWidthUnits(block, measure(10, 1))).toBe(2);
    });

    test('ordenen: a long row of big/many numbers needs the full width', () => {
        const block = makeBlock('ordenen', { constraints: { numberType: 'natural', maxGetal: 100000, count: 8 } });
        expect(minWidthUnits(block, measure(10, 1))).toBe(4);
    });

    test('breuken-rangschikken: small denominators floor at a half', () => {
        const block = makeBlock('breuken-rangschikken', { constraints: { maxDenominator: 10, count: 4 } });
        expect(minWidthUnits(block, measure(10, 1))).toBe(2);
    });

    test('breuken-rangschikken: wide denominators and a long row need the full width', () => {
        const block = makeBlock('breuken-rangschikken', { constraints: { maxDenominator: 1000, count: 5 } });
        expect(minWidthUnits(block, measure(10, 1))).toBe(4);
    });
});
