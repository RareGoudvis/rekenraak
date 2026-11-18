// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import type { Leerjaar } from '../config/gradePresets';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { choiceCanPlay, kioskAnswerOf, spelContentOf, spelKeysOf } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useOefenStore } from '../oefenen/useOefenStore';
import { SpelVisual } from '../oefenen/spelen/SpelVisual';
import type { SpelVisual as Visual } from '../oefenen/spelen/content/pack';
import { resetKiosk } from './helpers/oefenKiosk';

// The picture questions (owner 2026-11-18): Geld tellen (coins on the sign), the thermometer, the getallenlijn and
// getallen lezen open to the games; the kiosk checks every answer and Nakijken replays a mistake in the kiosk.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); useSpelStore.getState().otherGame(); });
afterEach(cleanup);

const sp = () => useSpelStore.getState();
const choice = (g: number, topic: string, label: string): ZelfChoice => {
    const c = choicesFor(data, g as Leerjaar, topic).find(x => x.label === label);
    if (!c) throw new Error(`no choice ${g} ${topic} ${label}`);
    return c;
};
const games = (c: ZelfChoice, g: number) => skinsFor(SKINS, spelContentOf(c, g)!).map(s => s.meta.id);

const CASES = [
    { g: 1, topic: 'Geld', label: 'Geld tellen', visual: 'geld', keys: [] },
    { g: 2, topic: 'Geld', label: 'Geld tellen, 50 cent', visual: 'geld', keys: [','] },
    { g: 4, topic: 'Geld', label: 'Geld tellen', visual: 'geld', keys: [','] },
    { g: 4, topic: 'Negatieve getallen', label: 'Thermometer aflezen', visual: 'thermo', keys: ['-'] },
    { g: 3, topic: 'Meten en herleiden', label: 'Temperatuur', visual: 'thermo', keys: [] },
    { g: 1, topic: 'Tellen en getallenrijen', label: 'Getallenlijn', visual: 'as', keys: [] },
    { g: 5, topic: 'Tellen en getallenrijen', label: 'Getallenlijn', visual: 'as', keys: [] },
    { g: 4, topic: 'Negatieve getallen', label: 'Getallenlijn invullen', visual: 'as', keys: ['-'] },
    { g: 1, topic: 'Getallen lezen en plaatswaarde', label: 'Getallen lezen en schrijven', visual: undefined, keys: [] },
    { g: 5, topic: 'Getallen lezen en plaatswaarde', label: 'Getallen lezen en schrijven', visual: undefined, keys: [] },
] as const;

describe('picture questions in the games', () => {
    test('each choice plays a keypad game, a duel and a tap game; numbers, with the keys its answers need', () => {
        for (const { g, topic, label, keys } of CASES) {
            const c = choice(g, topic, label);
            expect(choiceCanPlay(c, g), `${g} ${label}`).toBe(true);
            expect(spelContentOf(c, g)!.kind, label).toBe('number');
            expect(spelKeysOf(c, g), `${g} ${label}`).toEqual(keys);
            const ids = games(c, g);
            expect(ids, `${g} ${label}`).toEqual(expect.arrayContaining(['pinguintoren', 'kasteel', 'touwtrekken']));
            if ((spelContentOf(c, g)!.answerChars ?? 0) <= 5) expect(ids, `${g} ${label}`).toContain('ballonnen');
            // No memory board: a sign picture is no card.
            expect(ids).not.toContain('hartjes');
        }
    });

    test('the sign shows the picture; the right answer passes the kiosk check, a wrong one never', () => {
        for (const { g, topic, label, visual } of CASES) {
            sp().start({ choice: choice(g, topic, label), grade: g as Leerjaar, topicId: topic, meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
            for (let i = 0; i < 6; i++) {
                const q = sp().question!;
                const type = sp().sessie!.types[q.slot];
                // A Temperatuur choice also holds the kleuren card: only its aflezen part plays.
                expect(type.leafId).not.toBe('temperatuur-kleuren');
                expect(q.visual?.kind, `${g} ${label}`).toBe(visual);
                const d = kioskFor(type.typeId)!;
                expect(checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, q.answer)), `${q.text} ${q.answer}`).toBe(true);
                for (const c of q.choices.filter(x => x !== q.answer)) expect(checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, c)), `${q.text} ${c}`).toBe(false);
                sp().answer(q.answer, 1_000_100 + i * 1000);
                expect(sp().phase).toBe('right');
                sp().next(1_000_500 + i * 1000);
            }
        }
    });

    test('getallen lezen: the number in words, typed as the number (its positietabel cells for the kiosk)', () => {
        sp().start({ choice: choice(3, 'Getallen lezen en plaatswaarde', 'Getallen lezen en schrijven'), grade: 3, topicId: 'Getallen lezen en plaatswaarde', meta: skinById('bom')!.meta, now: 1_000_000 });
        const q = sp().question!;
        const ex = q.exercise as { total: number; words: string };
        expect(q.text).toBe(`${ex.words} = ?`);
        expect(q.answer).toBe(String(ex.total));
        expect(kioskAnswerOf(q, q.answer)).toMatch(/·/);
        // Typed with a leading zero it is still the number.
        sp().answer(`0${q.answer}`, 1_000_100);
        expect(sp().phase).toBe('right');
    });

    test('the pictures draw: every coin, the thermometer at its degree, the line with its open tick', () => {
        const draw = (v: Visual) => render(<SpelVisual visual={v} />).container;
        expect(draw({ kind: 'geld', coins: [2000, 500, 200, 50] }).querySelectorAll('svg')).toHaveLength(4);
        expect(draw({ kind: 'thermo', t: -4, min: -15, max: 25 }).querySelector('[aria-label="thermometer op min 4 graden"]')).toBeTruthy();
        const line = draw({ kind: 'as', items: ['10', '12', '?', '16'] });
        expect([...line.querySelectorAll('text')].map(t => t.textContent)).toEqual(['10', '12', '?', '16']);
        expect(line.querySelectorAll('.spel-as-open')).toHaveLength(1);
    });
});

describe('Nakijken replays a picture mistake in the kiosk', () => {
    for (const { g, topic, label } of [CASES[1], CASES[3], CASES[5], CASES[8]]) {
        test(`${label} (leerjaar ${g})`, () => {
            sp().start({ choice: choice(g, topic, label), grade: g as Leerjaar, topicId: topic, meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
            const q = sp().question!;
            sp().answer(q.choices.find(c => c !== q.answer)!, 1_000_100);
            expect(sp().feedback!.correct).toBe(false);
            useSpelStore.setState({ phase: 'end' });
            sp().nakijken();
            const k = useOefenStore.getState();
            expect(k.sessie!.title).toBe('Nakijken');
            expect(k.shown!.exercise).toEqual(q.exercise);
            const d = kioskFor(k.sessie!.types[k.shown!.slot].typeId)!;
            expect(checkAnswer(d, k.shown!.exercise, k.shown!.constraints, kioskAnswerOf(q, q.answer))).toBe(true);
        });
    }
});
