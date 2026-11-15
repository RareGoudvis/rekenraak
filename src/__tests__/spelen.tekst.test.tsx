// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { loadEenvoudigData, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../config/eenvoudig/nav';
import type { Leerjaar } from '../config/gradePresets';
import { buildZelfSessie, choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { nextExercise } from '../services/oefenen/scheduler';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { mulberry32, numberChoicesOf } from '../oefenen/spelen/distractors';
import { choiceCanPlay, PACK_MAX_GRADE, SPEL_MAX_GRADE, spelChoiceOf, spelContentOf, spelQuestionOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useOefenStore } from '../oefenen/useOefenStore';
import SpelKeypad from '../oefenen/spelen/SpelKeypad';
import { TEKST_LEAVES } from '../oefenen/spelen/content/tekst/tekstLeaves';
import { tekstContentOf } from '../oefenen/spelen/content/tekst/tekstPack';
import { KLOK_PACK } from '../oefenen/spelen/content/klok/klokPack';
import type { OefenSessie } from '../services/oefenen/types';
import { resetKiosk } from './helpers/oefenKiosk';

// The tekst pack (owner 2026-11-15) and the sums to leerjaar 6: every admitted leaf asks one value on a line of
// text, the kiosk checks exactly the right pick, the content kind and length pick the games, and Nakijken replays it.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const GRADES = [1, 2, 3, 4, 5, 6] as const;
const topics = () => EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => t.hasCards).map(t => t.id);
const choice = (g: number, topic: string, label: string) => {
    const c = choicesFor(data, g as Leerjaar, topic).find(x => x.label === label);
    if (!c) throw new Error(`no choice ${g} ${topic} ${label}`);
    return c;
};
const skinIds = (c: ZelfChoice, g: number) => skinsFor(SKINS, spelContentOf(c, g)!).map(s => s.meta.id);
const TAP = ['ballonnen', 'zeehond', 'pakjesband', 'mollen'];

// Questions of a choice's tekst variants over many made exercises (seeded), with the session they came from.
function tekstQuestions(c: ZelfChoice, g: number, perVariant = 30): { q: SpelQuestion; s: OefenSessie; leafId: string; v: CardVariant }[] {
    const played = spelChoiceOf(c, g).vars.filter(v => v.leafId in TEKST_LEAVES);
    const out: { q: SpelQuestion; s: OefenSessie; leafId: string; v: CardVariant }[] = [];
    for (const v of played) {
        const s = buildZelfSessie({ ...c, vars: [v] }, { kind: 'count', n: 10 }, 0, g);
        const rng = mulberry32(g * 101 + out.length);
        let got = 0;
        for (let i = 0; i < perVariant; i++) {
            const made = nextExercise(s, s.types[0], new Set(), rng);
            const q = made && spelQuestionOf(s.types[0], 0, made);
            if (q) { out.push({ q, s, leafId: v.leafId, v }); got++; }
        }
        // Every admitted variant has a game form for most of its exercises (a repeated digit or a rij past midnight draws again).
        expect(got, `${g} ${c.label} ${v.leafId}`).toBeGreaterThan(perVariant / 3);
    }
    return out;
}

describe('the tekst pack: every admitted leaf', () => {
    const all: { q: SpelQuestion; s: OefenSessie; leafId: string; g: number; chars?: number }[] = [];
    beforeAll(() => {
        for (const g of GRADES) for (const t of topics()) for (const c of choicesFor(data, g, t)) {
            if (!choiceCanPlay(c, g)) continue;
            for (const x of tekstQuestions(c, g)) all.push({ ...x, g, chars: tekstContentOf(x.v).answerChars });
        }
    });

    test('many leaves and leerjaren take part', () => {
        expect(all.length).toBeGreaterThan(3000);
        expect(new Set(all.map(x => x.leafId)).size).toBeGreaterThanOrEqual(40);
        expect(new Set(all.map(x => x.g))).toEqual(new Set(GRADES));
    });

    test('a non-empty line with one ? and unique options holding the answer', () => {
        for (const { q, leafId } of all) {
            expect(q.text.trim().length, leafId).toBeGreaterThan(2);
            expect(q.text.split('?').length - 1, q.text).toBe(1);
            expect(new Set(q.choices).size, q.text).toBe(q.choices.length);
            expect(q.choices.length, q.text).toBeGreaterThanOrEqual(2);
            expect(q.choices, q.text).toContain(q.answer);
        }
    });

    test('the kiosk check passes the answer and refuses every other option (one valid value)', () => {
        for (const { q, s } of all) {
            const type = s.types[q.slot];
            const d = kioskFor(type.typeId)!;
            q.choices.forEach((c, i) => {
                const given = q.kioskAnswers?.[i] ?? c;
                expect(checkAnswer(d, q.exercise, q.constraints, given, type.exactForm), `${q.text} ${c}`).toBe(c === q.answer);
            });
        }
    });

    test('number questions are plain numbers (every game; a comma or minus shows as a view), a word only taps', () => {
        for (const { q } of all) {
            if (q.kind === 'number') {
                // Whole numbers ≥ 0 as they are; a comma or minus as "1.5" / "-3" with "1,5" / "−3" on the targets.
                for (const c of q.choices) expect(c, q.text).toMatch(/^-?\d+(\.\d+)?$/);
                if (q.choices.every(c => /^\d+$/.test(c)) && !q.views) continue;
                expect(q.views, q.text).toHaveLength(q.choices.length);
            } else {
                expect(q.kind).toBe('choice');
                expect(q.views, q.text).toHaveLength(q.choices.length);
            }
        }
    });

    test('no answer is longer than its variant says (answerChars hides the small targets)', () => {
        for (const { q, chars } of all) {
            if (chars === undefined) continue;
            const shown = q.views?.map(v => v.text ?? '') ?? q.choices;
            // Digits and a minus count; the comma, like the thousands space, does not. The slips are no longer either.
            for (const o of shown) expect(o.replace(/[\s,]/g, '').length, `${q.text} ${o}`).toBeLessThanOrEqual(chars);
        }
    });
});

describe('a few leaves by hand', () => {
    const first = (c: ZelfChoice, g: number, leafId: string) => tekstQuestions(c, g).find(x => x.leafId === leafId)!.q;

    test('afronden: a rooster asks one number as a simpel exercise; the slips are the wrong way, place or none', () => {
        const qs = tekstQuestions(choice(3, 'Vergelijken, ordenen, afronden', 'Afronden'), 3);
        const rooster = qs.find(x => x.leafId === 'afronden-nat-rooster')!.q;
        expect(rooster.kind).toBe('number');
        expect(rooster.text).toMatch(/^\d[\d ]* ≈ \? \(op (tiental|honderdtal)\)$/);
        expect(rooster.constraints.subType).toBe('simpel');
        const ex = rooster.exercise as { number: number; targetKey: string };
        const w = ex.targetKey === 'T' ? 10 : 100;
        // 685 op T: 690; the other way 680, op H 700, unrounded 685.
        const n = ex.number, right = Number(rooster.answer);
        expect(right % w).toBe(0);
        expect(rooster.choices.map(Number).some(v => v === n || v === right - w || v === right + w || v % (w * 10) === 0)).toBe(true);
    });

    test('words: vergelijken < = >, deelbaar ja / nee with the asked divisor as the row, even / oneven', () => {
        const vg = first(choice(1, 'Vergelijken, ordenen, afronden', 'Groter of kleiner'), 1, 'vergelijken-getallen');
        expect(vg.choices).toEqual(['<', '=', '>']);
        expect(vg.views!.map(v => v.label)).toEqual(['kleiner dan', 'gelijk aan', 'groter dan']);
        const db = first(choice(2, 'Deelbaarheid', 'Deelbaar: 2 of 10?'), 2, 'deelbaarheid-tabel');
        expect(db.choices).toEqual(['ja', 'nee']);
        expect(db.text).toMatch(/^\d+ deelbaar door (2|10): \?$/);
        expect((db.constraints.divisors as number[]).length).toBe(1);
        const eo = first(choice(2, 'Deelbaarheid', 'Even of oneven groeperen'), 2, 'even-oneven-cirkels');
        expect(eo.choices).toEqual(['even', 'oneven']);
    });

    test('geld teruggeven: euro amounts typed or tapped, the kiosk gets euro + cent fields', () => {
        const q = first(choice(2, 'Geld', 'Geld teruggeven'), 2, 'geld-teruggeven');
        expect(q.kind).toBe('number');
        expect(q.text).toMatch(/^Je betaalt €\s[\d,]+ met €\s\d+\. Je krijgt €\s\? terug\.$/);
        const i = q.choices.indexOf(q.answer);
        expect(q.views![i].text).toMatch(/^\d+,\d\d$/);
        expect(q.kioskAnswers![i]).toHaveLength(2);
    });

    test('plaatswaarde names the digit by its value only when it is there once, else by its place in words', () => {
        const qs = tekstQuestions(choice(3, 'Getallen lezen en plaatswaarde', 'Plaatswaarde'), 3, 60);
        for (const { q } of qs) {
            // A repeated digit with its place ("In 667 is de 6 bij de tientallen ? waard") is just as clear; never "op T".
            expect(q.text, q.text).not.toMatch(/op [EeTHDthd]{1,2} = \?/);
            const m = /^In ([\d ]+) (?:is|staat) de (\d) (?!bij de \S+ \? waard)/.exec(q.text);
            if (!m) continue;
            expect(m[1].replace(/\s/g, '').split(m[2]).length - 1, q.text).toBe(1);
        }
        expect(qs.some(x => x.leafId === 'plaatswaarde-plaats')).toBe(true);
    });

    test('the generic number slips: unique, never the answer, the grain kept (afronden op H: hundreds)', () => {
        for (let seed = 0; seed < 50; seed++) {
            const c = numberChoicesOf(4700, mulberry32(seed), 4, [[4800]], 100);
            expect(new Set(c).size).toBe(4);
            expect(c).toContain(4700);
            expect(c.every(v => v % 100 === 0 && v >= 0)).toBe(true);
        }
    });
});

describe('the sums to leerjaar 6', () => {
    test('grade limits: + − × : to 6, a pack without its own limit (the klok) to 3', () => {
        expect(SPEL_MAX_GRADE).toBe(6);
        expect(PACK_MAX_GRADE).toBe(3);
        expect(KLOK_PACK.maxGrade).toBeUndefined();
        for (const g of [4, 5, 6] as const) {
            for (const t of ['Hoofdrekenen · Optellen', 'Hoofdrekenen · Aftrekken', 'Hoofdrekenen · Vermenigvuldigen', 'Hoofdrekenen · Delen']) {
                expect(choicesFor(data, g, t).some(c => choiceCanPlay(c, g)), `${g} ${t}`).toBe(true);
            }
        }
        const tafels = [...new Set(topics().filter(t => /tafels$/.test(t)))];
        expect(tafels.some(t => choicesFor(data, 5, t).some(c => choiceCanPlay(c, 5)))).toBe(true);
        expect(tafels.some(t => choicesFor(data, 6, t).some(c => choiceCanPlay(c, 6)))).toBe(true);
    });

    test('answerChars at leerjaar 5–6: long sums hide every tap game and keep the keypad ones', () => {
        for (const g of [5, 6] as const) {
            const c = choicesFor(data, g, 'Hoofdrekenen · Optellen').find(x => choiceCanPlay(x, g) && (spelContentOf(x, g)!.answerChars ?? 0) > 5)!;
            expect(c, `leerjaar ${g}`).toBeTruthy();
            const content = spelContentOf(c, g)!;
            expect(content.kind).toBe('number');
            const ids = skinIds(c, g);
            for (const tap of [...TAP, 'eieren']) expect(ids).not.toContain(tap);
            expect(ids).toEqual(expect.arrayContaining(['pinguintoren', 'zombies', 'race']));
        }
        const l6 = choicesFor(data, 6, 'Hoofdrekenen · Optellen').map(c => spelContentOf(c, 6)?.answerChars ?? 0);
        expect(Math.max(...l6)).toBeGreaterThanOrEqual(10);
    });

    test('SpelKeypad takes a 10-digit answer (keys and keyboard)', () => {
        const onAnswer = vi.fn();
        render(<SpelKeypad onAnswer={onAnswer} questionKey="q1" />);
        for (const k of '1000000000') act(() => { fireEvent.keyDown(window, { key: k }); });
        expect(screen.getByLabelText('Jouw antwoord').textContent).toBe('1000000000');
        act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
        expect(onAnswer).toHaveBeenCalledWith('1000000000');
    });

    test('a kommagetal mix no tap target holds plays whole in the keypad games, with the comma (leerjaar 5 Afronden)', () => {
        const c = choice(5, 'Vergelijken, ordenen, afronden', 'Afronden');
        expect(choiceCanPlay(c, 5)).toBe(true);
        const leaves = new Set(spelChoiceOf(c, 5).vars.map(v => v.leafId));
        expect(leaves.has('afronden-dec-rooster')).toBe(true);
        expect(spelContentOf(c, 5)).toMatchObject({ kind: 'number', keys: [','] });
    });
});

describe('the picker and the choice topics', () => {
    test('vergelijken, deelbaarheid and even / oneven are tap content: Ballonnen, Zeehondjes, Pakjesband, Mollen only', () => {
        for (const [g, t, label] of [
            [1, 'Vergelijken, ordenen, afronden', 'Groter of kleiner'], [3, 'Vergelijken, ordenen, afronden', 'Vergelijken en ordenen'],
            [6, 'Vergelijken, ordenen, afronden', 'Vergelijken en ordenen'],
            [2, 'Deelbaarheid', 'Deelbaar: 2 of 10?'], [2, 'Deelbaarheid', 'Even of oneven groeperen'], [6, 'Deelbaarheid', 'Deelbaar door 3'],
        ] as const) {
            const c = choice(g, t, label);
            expect(spelContentOf(c, g), label).toMatchObject({ kind: 'choice', boards: [] });
            expect(skinIds(c, g), label).toEqual(['ballonnen', 'zeehond', 'pakjesband', 'mollen']);
        }
    });

    test('a number topic plays everywhere but on the boards (L1 Splitsbomen, L3 Afronden)', () => {
        const ids = skinIds(choice(1, 'Splitsen', 'Splitsbomen'), 1);
        expect(ids).toEqual(expect.arrayContaining(['pinguintoren', 'ballonnen', 'schatkist']));
        expect(ids).not.toContain('hartjes');
        expect(ids).not.toContain('honingraat');
        expect(skinIds(choice(3, 'Vergelijken, ordenen, afronden', 'Afronden'), 3)).toEqual(expect.arrayContaining(['bom', 'eieren']));
    });

    test('coverage: the playable Zelf oefenen choices per leerjaar (8 / 20 / 32 / 13 / 0 / 0 before)', () => {
        const count = (g: number) => topics().flatMap(t => choicesFor(data, g as Leerjaar, t)).filter(c => choiceCanPlay(c, g)).length;
        const got = GRADES.map(count);
        const floor = [16, 40, 58, 54, 45, 48];
        got.forEach((n, i) => expect(n, `leerjaar ${i + 1}`).toBeGreaterThanOrEqual(floor[i]));
    });
});

describe('Nakijken replays a tekst mistake in the kiosk', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); useSpelStore.getState().otherGame(); });

    for (const [kind, g, topic, label, skin] of [
        ['number (afronden)', 3, 'Vergelijken, ordenen, afronden', 'Afronden', 'pinguintoren'],
        ['tap number (geld)', 2, 'Geld', 'Geld teruggeven', 'ballonnen'],
        ['words (vergelijken)', 2, 'Vergelijken, ordenen, afronden', 'Groter of kleiner', 'mollen'],
        ['ja / nee (deelbaarheid)', 2, 'Deelbaarheid', 'Deelbaar: 2 of 10?', 'zeehond'],
    ] as const) {
        test(kind, () => {
            const sp = () => useSpelStore.getState();
            sp().start({ choice: choice(g, topic, label), grade: g, topicId: topic, meta: skinById(skin)!.meta, now: 1_000_000 });
            const q = sp().question!;
            expect(q).toBeTruthy();
            sp().answer(q.kind === 'number' && skinById(skin)!.meta.input === 'keypad' ? String(Number(q.answer) + 1) : q.choices.find(c => c !== q.answer)!, 1_000_100);
            expect(sp().feedback!.correct).toBe(false);
            sp().next(1_000_200);
            const q2 = sp().question!;
            sp().answer(q2.answer, 1_000_300);
            expect(sp().feedback!.correct).toBe(true);
            useSpelStore.setState({ phase: 'end' });
            sp().nakijken();
            const k = useOefenStore.getState();
            expect(k.sessie!.title).toBe('Nakijken');
            expect(k.fixed).toHaveLength(1);
            expect(k.shown!.exercise).toEqual(q.exercise);
            expect(k.shown!.constraints).toEqual(q.constraints);
            // The kiosk's own right answer for that exercise is the game's answer.
            const d = kioskFor(k.sessie!.types[k.shown!.slot].typeId)!;
            const right = q.kioskAnswers?.[q.choices.indexOf(q.answer)] ?? q.answer;
            expect(checkAnswer(d, k.shown!.exercise, k.shown!.constraints, right)).toBe(true);
        });
    }
});
