// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { HerleidingExercise, MathBlock } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import HerleidingenConfig from '../components/configurator/plugins/HerleidingenConfig';
import { generateHerleidingExercises, vraagOf } from '../services/herleidingen/herleidingenGenerator';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInstructionOf } from '../services/oefenen/kiosk';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskDefaultV1 } from '../services/oefenen/kioskDefaults';
import { currentInput, useOefenStore } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { makeBlock } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Owner call 2026-10-11 (triage item 1): a one-quantity herleiding asks ONE thing. getal: the unit
// is shown, the pupil gives the number ("235 cm = __ m"); eenheid: the number is shown, the pupil
// gives the unit ("235 cm = 2,35 __"). Row setting `vraag` = getal | eenheid | afwisselend
// (default). It replaces writeUnits (number AND unit, value-equal, "(in m)" hint, copy guard).

afterEach(cleanup);

const ex = (from: Array<[number, string]>, to: Array<[number, string]>, blank: 'number' | 'unit' = 'number', format: HerleidingExercise['format'] = 'enkel-getal'): HerleidingExercise => ({
    id: 'h', format, blank, isManuallyEdited: false,
    fromParts: from.map(([value, key]) => ({ value, key })), toParts: to.map(([value, key]) => ({ value, key })),
});
const GETAL = ex([[3, 'm']], [[300, 'cm']]);
const EENHEID = ex([[300, 'cm']], [[3, 'm']], 'unit', 'enkel-eenheid');
const COMPOUND = ex([[235, 'cm']], [[2, 'm'], [35, 'cm']], 'number', 'enkel-samengesteld');
const LENGTE = { measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'] };
const SINGLE_FORMATS = ['enkel-getal', 'samengesteld-enkel'];
const d = kioskFor('herleidingen')!;

describe('vraagOf: old sheets and links keep what they asked', () => {
    test.each<[Record<string, unknown>, string]>([
        [{}, 'afwisselend'],
        [{ writeUnits: true }, 'afwisselend'],
        [{ writeUnits: false }, 'getal'],
        [{ vraag: 'eenheid', writeUnits: false }, 'eenheid'],
        [{ vraag: 'getal', writeUnits: true }, 'getal'],
    ])('%j → %s', (c, want) => expect(vraagOf(c)).toBe(want));

    test('a new block asks afwisselend: the registry seeds neither vraag nor writeUnits', () => {
        const c = makeBlock('herleidingen').constraints as Record<string, unknown>;
        expect(c.writeUnits).toBeUndefined();
        expect(vraagOf(c)).toBe('afwisselend');
    });
});

describe('generator', () => {
    const gen = (over: Record<string, unknown>, n = 16) => {
        const out: HerleidingExercise[] = [];
        for (let i = 0; i < 6; i++) out.push(...generateHerleidingExercises(makeBlock('herleidingen', { constraints: { ...LENGTE, ...over }, block: { numberOfExercises: n } })));
        return out;
    };
    test('getal: every one-quantity answer is a number blank', () => {
        for (const e of gen({ vraag: 'getal', formats: SINGLE_FORMATS })) expect(e.blank, JSON.stringify(e)).toBe('number');
    });
    test('eenheid: every one-quantity answer is a unit blank', () => {
        for (const e of gen({ vraag: 'eenheid', formats: SINGLE_FORMATS })) expect(e.blank, JSON.stringify(e)).toBe('unit');
    });
    test('afwisselend: both forms', () => {
        const blanks = new Set(gen({ vraag: 'afwisselend', formats: SINGLE_FORMATS }).map(e => e.blank));
        expect([...blanks].sort()).toEqual(['number', 'unit']);
    });
    test('a legacy writeUnits block reads afwisselend', () => {
        const blanks = new Set(gen({ writeUnits: true, formats: SINGLE_FORMATS }).map(e => e.blank));
        expect([...blanks].sort()).toEqual(['number', 'unit']);
    });
    test('compound answers and the are formats stay number blanks', () => {
        for (const e of gen({ vraag: 'eenheid', formats: ['enkel-samengesteld'] })) expect(e.blank).toBe('number');
        const opp = { measure: 'oppervlakte', units: ['m²', 'dm²', 'cm²', 'a', 'ca', 'ha'], vraag: 'eenheid', formats: ['vierkant-are', 'are-vierkant'] };
        for (const e of gen(opp)) expect(e.blank).toBe('number');
    });
    test('the unit blank holds the exact unit of the shown number', () => {
        for (const e of gen({ vraag: 'eenheid', formats: SINGLE_FORMATS })) {
            const f: Record<string, number> = { m: 1000, dm: 100, cm: 10, mm: 1 };
            const base = e.fromParts.reduce((s, p) => s + p.value * f[p.key], 0);
            expect(e.toParts[0].value * f[e.toParts[0].key]).toBe(base);
        }
    });
});

describe('kiosk: one field, exact', () => {
    const header = (e: HerleidingExercise, c: Record<string, unknown> = {}) => kioskInstructionOf('herleidingen', e, { ...LENGTE, ...c }, 'Zet om.');
    test('getal: the number field only, header names the target, the number is exact', () => {
        expect(kioskInputOf(d, GETAL, LENGTE)).toBe('number');
        expect(header(GETAL)).toBe('Zet om naar cm.');
        expect(header(GETAL, { writeUnits: true })).toBe('Zet om naar cm.');
        expect(checkAnswer(d, GETAL, LENGTE, '300')).toBe(true);
        expect(checkAnswer(d, GETAL, LENGTE, '3')).toBe(false);
        expect(d.keys?.({ ...LENGTE, writeUnits: true }) ?? []).toEqual([]);
    });
    test('eenheid: the unit buttons only, header "Welke eenheid?", the unit is exact', () => {
        expect(kioskInputOf(d, EENHEID, LENGTE)).toBe('choice');
        expect(header(EENHEID)).toBe('Welke eenheid?');
        expect(checkAnswer(d, EENHEID, LENGTE, 'm')).toBe(true);
        expect(checkAnswer(d, EENHEID, LENGTE, 'dm')).toBe(false);
    });
    test('a legacy writeUnits row is never number+unit', () => {
        const c = { ...LENGTE, writeUnits: true };
        expect(kioskInputOf(d, GETAL, c)).toBe('number');
        expect(kioskInputOf(d, EENHEID, c)).toBe('choice');
    });
    test('compound: a field per part, the paper header', () => {
        expect(kioskInputOf(d, COMPOUND, LENGTE)).toBe('multi-number');
        expect(header(COMPOUND)).toBe('Zet om.');
    });
    test('oppervlakte: one button per unit size, so ca never competes with m²', () => {
        const opp = { measure: 'oppervlakte', units: ['m²', 'dm²', 'cm²', 'a', 'ca', 'ha'] };
        const e = ex([[5, 'a']], [[500, 'm²']], 'unit', 'enkel-eenheid');
        const choices = d.choicesOf!(e, opp);
        expect(choices).toEqual(['ha', 'a', 'm²', 'dm²', 'cm²']);
        expect(checkAnswer(d, e, opp, 'm²')).toBe(true);
    });
});

describe('sheet: one blank per one-quantity exercise', () => {
    const blanks = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('span')].filter(s => s.style.borderBottom.startsWith('1.5px solid')).length;
    const block = (e: HerleidingExercise, extra: Record<string, unknown> = {}) =>
        ({ id: 'b', typeId: 'herleidingen', constraints: { ...LENGTE, ...extra }, herleidingExercises: [e] }) as unknown as MathBlock;
    test.each<[string, HerleidingExercise, Record<string, unknown>]>([
        ['getal', GETAL, {}],
        ['getal, legacy writeUnits', GETAL, { writeUnits: true }],
        ['eenheid', EENHEID, {}],
    ])('%s', (_n, e, c) => {
        const { container } = render(<HerleidingenViewer block={block(e, c)} showSolutions={false} />);
        expect(blanks(container)).toBe(1);
        expect(container.textContent).not.toMatch(/\(in /);
    });
    test('getal prints the target unit, eenheid the number', () => {
        const g = render(<HerleidingenViewer block={block(GETAL)} showSolutions={false} />);
        expect(g.container.textContent).toMatch(/=\s*cm/);
        cleanup();
        const u = render(<HerleidingenViewer block={block(EENHEID)} showSolutions={false} />);
        expect(u.container.textContent).toMatch(/=\s*3$/);
    });
});

describe('config: "Vraag"', () => {
    const configBlock = (c: Record<string, unknown>) => {
        const b = makeBlock('herleidingen', { id: 'cfg', constraints: c });
        useWorksheetStore.setState({ blocks: [b] } as never);
        return b;
    };
    const pressed = () => screen.getAllByRole('button').filter(b => ['Getal', 'Eenheid', 'Afwisselend'].includes(b.textContent ?? '') && b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
    test('a new block shows Afwisselend; a legacy writeUnits:false block shows Getal', () => {
        render(<HerleidingenConfig block={configBlock({})} />);
        expect(pressed()).toEqual(['Afwisselend']);
        cleanup();
        render(<HerleidingenConfig block={configBlock({ writeUnits: false })} />);
        expect(pressed()).toEqual(['Getal']);
    });
    test('the writeUnits and Doeleenheid switches are gone; a click sets vraag', () => {
        render(<HerleidingenConfig block={configBlock({})} />);
        expect(screen.queryByText(/eenheden zelf/)).toBeNull();
        expect(screen.queryByText('Doeleenheid tonen')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Eenheid' }));
        const after = useWorksheetStore.getState().blocks.find(x => x.id === 'cfg')!;
        expect((after.constraints as Record<string, unknown>).vraag).toBe('eenheid');
    });
});

describe('links: an old writeUnits link plays afwisselend, an old default link plays getal', () => {
    // An old link = the frozen 2026-10-09 seed plus what the teacher changed (the wire diffs against the seed).
    const linkType = (over: Record<string, unknown>): OefenType => ({
        typeId: 'herleidingen', leafId: 'herleidingen-lengte', label: 'Herleiden · lengte',
        constraints: { ...kioskDefaultV1('herleidingen-lengte')!.constraints, formats: SINGLE_FORMATS, ...over }, weight: 100,
    });
    const blanksOf = (t: OefenType) => {
        const s = decodeSessie(`#oefen=${encodeSessie(starterSessie({ types: [t] }))}`)!;
        const rng = mulberry32(5);
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const shown = nextExercise(s, s.types[0], new Set(), rng)!;
            const e = shown.exercise as HerleidingExercise;
            expect(kioskInputOf(d, e, shown.constraints)).not.toBe('number+unit');
            seen.add(e.blank);
        }
        return [...seen].sort();
    };
    test('writeUnits: true → both forms', () => expect(blanksOf(linkType({ writeUnits: true }))).toEqual(['number', 'unit']));
    test('the frozen default (writeUnits: false) → getal only', () => expect(blanksOf(linkType({}))).toEqual(['number']));
    test('a new builder row → afwisselend', () => {
        const leaf = listOefenLeaves().find(l => l.id === 'herleidingen-lengte')!;
        expect(vraagOf(leaf.constraints)).toBe('afwisselend');
    });
});

describe('kiosk screen', () => {
    const st = () => useOefenStore.getState();
    beforeEach(resetKiosk);
    const typeOf = (vraag: string): OefenType => ({
        typeId: 'herleidingen', leafId: 'herleidingen-lengte', label: 'Herleiden', limit: 3, weight: 1,
        constraints: { ...makeBlock('herleidingen').constraints, ...LENGTE, formats: ['enkel-getal'], vraag },
    });
    test('getal: a number field and the keypad, no unit buttons', () => {
        st().load(hashOf(starterSessie({ types: [typeOf('getal')] })));
        st().start();
        expect(currentInput(st().sessie, st().shown)!.kind).toBe('number');
        render(<OefenApp />);
        expect(screen.queryByRole('radiogroup', { name: 'Kies de eenheid' })).toBeNull();
        expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
        expect(screen.getByText(/^Zet om naar (m|dm|cm|mm)\.$/)).toBeTruthy();
    });
    test('eenheid: unit buttons only', () => {
        st().load(hashOf(starterSessie({ types: [typeOf('eenheid')] })));
        st().start();
        expect(currentInput(st().sessie, st().shown)!.kind).toBe('choice');
        render(<OefenApp />);
        expect(screen.queryByRole('group', { name: 'Cijfers' })).toBeNull();
        expect(screen.getByText('Welke eenheid?')).toBeTruthy();
    });
});
