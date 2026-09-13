import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { VormleerExercise } from '../services/math/types';
import { layoutScenario, rectSegDist, rectRectDist } from '../services/vormleer/scenarioLayout';

// Covers the punt-lijn scenario builder (the one both modes read) and the hoeken
// 'meten' angle range — the parts of vormleerGenerator not exercised by name-only
// assertions elsewhere in the matrix sweep.

describe('vormleer punt-lijn scenarios', () => {
    const concepts = ['punt', 'lijnstuk', 'evenwijdig', 'snijdend', 'loodrecht'];
    const scenarios = (over: Record<string, unknown>, n = 12) => {
        const out: VormleerExercise[] = [];
        for (let i = 0; i < n; i++) {
            const block = makeBlock('vormleer-punt-lijn', { constraints: { kind: 'punt-lijn', concepts, ...over } });
            out.push(...(generateFor(block) as VormleerExercise[]));
        }
        return out;
    };

    test.each(['herkennen', 'tekenen'])('%s: every element is named at every niveau', (mode) => {
        for (const niveau of [1, 2, 3]) {
            for (const ex of scenarios({ mode, niveau }, 6)) {
                expect(ex.elements?.length, `niveau ${niveau} drew nothing`).toBeGreaterThan(0);
                for (const el of ex.elements!) {
                    expect(el.name.length).toBeGreaterThan(0);
                    expect(el.label.length).toBeGreaterThan(0);
                    // Points are uppercase, rechten lowercase; a lijnstuk is bracketed both ends.
                    if (el.type === 'punt') expect(el.name).toBe(el.name.toUpperCase());
                    if (el.type === 'rechte') expect(el.name).toBe(el.name.toLowerCase());
                    if (el.type === 'lijnstuk') expect(el.label).toBe(`[${el.name}]`);
                    if (el.type === 'halfrechte') expect(el.label).toBe(`[${el.name}`);
                }
                for (const st of ex.steps ?? []) expect(st.text.length).toBeGreaterThan(0);
            }
        }
    });

    test('both modes produce the same scenario shape per niveau', () => {
        const shape = (mode: string, niveau: number) => {
            const counts = new Set(scenarios({ mode, niveau }, 8).map(ex => ex.steps?.length));
            return [...counts].sort();
        };
        for (const niveau of [1, 2, 3]) {
            expect(shape('tekenen', niveau)).toEqual(shape('herkennen', niveau));
        }
    });

    test('niveau 1 = one element, niveau 2 = one two-part step, niveau 3 = three steps', () => {
        for (const ex of scenarios({ mode: 'herkennen', niveau: 1 }, 8)) {
            // A relation pill at niveau 1 still shows its classic pair; the plain
            // begrippen draw exactly one element.
            expect(ex.steps!.length).toBe(1);
            if (['punt', 'rechte', 'halfrechte', 'lijnstuk'].includes(ex.concept)) expect(ex.elements!.length).toBe(1);
        }
        for (const ex of scenarios({ mode: 'tekenen', niveau: 2 }, 8)) {
            expect(ex.steps!.length).toBe(1);
            expect(ex.elements!.length).toBeGreaterThanOrEqual(2);
            expect(ex.steps![0].rel).toBeTruthy();
        }
        for (const ex of scenarios({ mode: 'tekenen', niveau: 3 }, 8)) {
            expect(ex.steps!.length).toBe(3);
            expect(ex.steps!.slice(1).every(s => !!s.rel)).toBe(true);
        }
    });

    test('herkennen sentences always have a blank to fill in', () => {
        for (const niveau of [1, 2, 3]) {
            for (const ex of scenarios({ mode: 'herkennen', niveau }, 6)) {
                const blanks = (ex.steps ?? []).filter(s => s.answer !== undefined);
                expect(blanks.length, `niveau ${niveau} has no blank`).toBeGreaterThan(0);
                for (const b of blanks) expect(b.answer!.length).toBeGreaterThan(0);
            }
        }
    });

    test('the stand pills draw truly flat elements', () => {
        for (const ex of scenarios({ mode: 'tekenen', niveau: 1, allowHorizontaal: true, allowVerticaal: true, concepts: ['rechte'] }, 10)) {
            for (const el of ex.elements!) {
                if (!el.orient) continue;
                const [a, b] = el.pts;
                if (el.orient === 'horizontaal') expect(Math.abs(a.y - b.y)).toBeLessThan(1e-9);
                else expect(Math.abs(a.x - b.x)).toBeLessThan(1e-9);
            }
        }
        // Both pills off: nothing claims an orientation.
        for (const ex of scenarios({ mode: 'tekenen', niveau: 1 }, 6)) {
            expect(ex.elements!.every(el => !el.orient)).toBe(true);
        }
    });

    test('rechte labels are lowercase and skip the ambiguous l/o', () => {
        for (const ex of scenarios({ mode: 'herkennen', niveau: 1, concepts: ['rechte'] }, 10)) {
            for (const el of ex.elements!) {
                expect(el.name).toBe(el.name.toLowerCase());
                expect(el.name).not.toBe('l');
                expect(el.name).not.toBe('o');
            }
        }
    });
});

// The viewer draws exactly what layoutScenario returns, so checking it here is
// checking the sheet: a name may never sit on a stroke or on another name.
describe('vormleer scenario label placement', () => {
    // Deterministic RNG so a failure names one reproducible seed.
    const mulberry32 = (seed: number) => () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    test('no label touches a stroke or another label, over 200 seeded scenarios', () => {
        const native = Math.random;
        const failures: string[] = [];
        try {
            for (let seed = 1; seed <= 200; seed++) {
                Math.random = mulberry32(seed);
                const niveau = (seed % 3) + 1;
                const block = makeBlock('vormleer-punt-lijn', {
                    constraints: {
                        kind: 'punt-lijn', mode: seed % 2 ? 'herkennen' : 'tekenen', niveau,
                        concepts: ['punt', 'rechte', 'halfrechte', 'lijnstuk', 'evenwijdig', 'snijdend', 'loodrecht'],
                        allowHorizontaal: seed % 4 < 2, allowVerticaal: seed % 4 > 1,
                    },
                });
                // The two figure sizes the viewer uses (niveau 1 minis and the wider ones).
                for (const size of [115, 150]) {
                    for (const ex of generateFor(block) as VormleerExercise[]) {
                        const fs = 0.62 * 17.33;
                        const { labels, segs } = layoutScenario(ex.elements ?? [], size, fs);
                        labels.forEach((lb, i) => {
                            for (const sg of segs) {
                                if (rectSegDist(lb.rect, sg) <= 0) failures.push(`seed ${seed} size ${size}: "${lb.text}" sits on a stroke`);
                            }
                            for (let j = i + 1; j < labels.length; j++) {
                                if (rectRectDist(lb.rect, labels[j].rect) <= 0) failures.push(`seed ${seed} size ${size}: "${lb.text}" overlaps "${labels[j].text}"`);
                            }
                            const r = lb.rect;
                            if (r.x < -1 || r.y < -1 || r.x + r.w > size + 1 || r.y + r.h > size + 1) {
                                failures.push(`seed ${seed} size ${size}: "${lb.text}" falls outside the figure box`);
                            }
                        });
                    }
                }
            }
        } finally {
            Math.random = native;
        }
        expect(failures.slice(0, 5)).toEqual([]);
    });
});

describe('vormleer hoeken tekenen', () => {
    test('naming on gives three letters, off gives one', () => {
        const on = generateFor(makeBlock('vormleer-hoeken', { constraints: { kind: 'hoek', mode: 'tekenen' } })) as VormleerExercise[];
        for (const ex of on) expect(ex.labels?.length).toBe(3);
        const off = generateFor(makeBlock('vormleer-hoeken', { constraints: { kind: 'hoek', mode: 'tekenen', nameAngles: false } })) as VormleerExercise[];
        for (const ex of off) expect(ex.labels?.length).toBe(1);
    });
});

describe('vormleer hoeken meten', () => {
    test('angles are multiples of 5 between 20 and 160 (or exactly 90)', () => {
        const block = makeBlock('vormleer-hoeken', { constraints: { kind: 'hoek', mode: 'meten' }, block: { numberOfExercises: 40 } });
        const data = generateFor(block) as VormleerExercise[];
        for (const ex of data) {
            expect(ex.angleDeg).toBeGreaterThanOrEqual(20);
            expect(ex.angleDeg).toBeLessThanOrEqual(160);
            expect((ex.angleDeg ?? 0) % 5).toBe(0);
        }
    });
});
