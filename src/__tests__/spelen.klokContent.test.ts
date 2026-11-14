import { describe, test, expect } from 'vitest';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { grainOf, klokDistractors, type KlokGrain, type KlokTime } from '../oefenen/spelen/content/klok/klokDistractors';
import { klokQuestion, type KlokDirection } from '../oefenen/spelen/content/klok/klokPack';
import { klokTip } from '../oefenen/spelen/content/klok/klokHelp';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { formatDigitalTime, formatTimeText } from '../services/clock/clockTypes';
import type { ClockExercise } from '../services/math/types';

// The klok content pack: four directions from the cards, typical clock slips as distractors, the help tip.
const FACE = 720;
const faceOf = (t: KlokTime) => (t.h * 60 + t.m) % FACE;
const ALL_TYPES = ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor', 'nauwkeurig_5', 'nauwkeurig_1'];

const ex = (h: number, m: number, o: Partial<ClockExercise> = {}): ClockExercise => ({
    id: 'x', hours: h, minutes: m, timeText: formatTimeText(h, m, !!o.is24hour), digitalText: formatDigitalTime(h, m), isManuallyEdited: false, ...o,
});
// The kiosk's own constraints per direction (Zelf oefenen seeds klokAnswer woorden on analoog lezen).
const CTX: Record<KlokDirection, { ex: Partial<ClockExercise>; c: Record<string, unknown> }> = {
    'analoog-woorden': { ex: { clockType: 'analoog', exerciseMode: 'lezen' }, c: { clockType: 'analoog', exerciseMode: 'lezen', klokAnswer: 'woorden' } },
    'analoog-digitaal': { ex: { clockType: 'analoog', exerciseMode: 'omzetten' }, c: { clockType: 'analoog', exerciseMode: 'omzetten' } },
    'digitaal-analoog': { ex: { clockType: 'analoog', exerciseMode: 'tekenen' }, c: { clockType: 'analoog', exerciseMode: 'tekenen' } },
    'woorden-digitaal': { ex: { clockType: 'digitaal', exerciseMode: 'tekenen', is24hour: true }, c: { clockType: 'digitaal', exerciseMode: 'tekenen', is24hour: true } },
};
const question = (dir: KlokDirection, h: number, m: number, timeTypes = ALL_TYPES, key = `k${h}:${m}`) => {
    const { ex: e, c } = CTX[dir];
    const exercise = ex(h, m, e);
    const constraints = { ...c, timeTypes };
    return { exercise, constraints, q: klokQuestion(exercise, constraints, key, 4)! };
};
const D = kioskFor('klok-kloklezen')!;

describe('klok distractors', () => {
    const grains: [KlokGrain, number[]][] = [
        [60, [0]], [30, [0, 30]], [15, [0, 15, 30, 45]], [5, [0, 5, 20, 35, 55]], [1, [1, 7, 29, 31, 58]],
    ];
    test('three per question, unique on the face, never the answer or its twin 12 hours on, on the card\'s grain', () => {
        for (const [grain, minutes] of grains) for (let h = 0; h < 24; h++) for (const m of minutes) for (const wordsAnswer of [true, false]) for (const seed of [1, 9, 77]) {
            const d = klokDistractors({ h, m }, { grain, wordsAnswer }, mulberry32(seed));
            expect(d).toHaveLength(3);
            const faces = d.map(faceOf);
            expect(new Set(faces).size).toBe(3);
            expect(faces).not.toContain(faceOf({ h, m }));
            expect(d.every(t => t.m % grain === 0 && t.h >= 0 && t.h < 24)).toBe(true);
        }
    });

    test('"half drie" is 2:30: the trap is 3:30 for a time, "half 2" (1:30) for words; always offered', () => {
        for (let h = 1; h <= 12; h++) for (const seed of [1, 2, 3]) for (const grain of [30, 15, 5] as KlokGrain[]) {
            const time = klokDistractors({ h, m: 30 }, { grain, wordsAnswer: false }, mulberry32(seed)).map(faceOf);
            expect(time).toContain(((h + 1) * 60 + 30) % FACE);
            const words = klokDistractors({ h, m: 30 }, { grain, wordsAnswer: true }, mulberry32(seed)).map(faceOf);
            expect(words).toContain(((h - 1) * 60 + 30 + FACE) % FACE);
        }
    });

    test('kwart over ↔ kwart voor the same hour, always offered', () => {
        for (const seed of [1, 2, 3]) {
            expect(klokDistractors({ h: 8, m: 15 }, { grain: 15, wordsAnswer: true }, mulberry32(seed))).toContainEqual({ h: 7, m: 45 });
            expect(klokDistractors({ h: 8, m: 45 }, { grain: 15, wordsAnswer: true }, mulberry32(seed))).toContainEqual({ h: 9, m: 15 });
        }
    });

    test('the hands swapped, ±5 minutes and the wrong hour show up over seeds', () => {
        const over = (t: KlokTime, grain: KlokGrain) => Array.from({ length: 40 }, (_, s) => klokDistractors(t, { grain, wordsAnswer: false }, mulberry32(s))).flat();
        // 8:15 swapped: the grote wijzer (3) as the hour, the kleine (8) as 40 minutes.
        expect(over({ h: 8, m: 15 }, 5)).toContainEqual({ h: 3, m: 40 });
        const near = over({ h: 8, m: 20 }, 5);
        expect(near.some(t => t.h === 8 && (t.m === 15 || t.m === 25))).toBe(true);
        expect(near.some(t => t.m === 20 && (t.h === 7 || t.h === 9))).toBe(true);
        // Hele uren: the grote wijzer read as the hour (8:00 → 12:00) and the hour next door.
        const uren = over({ h: 8, m: 0 }, 60);
        expect(uren).toContainEqual({ h: 0, m: 0 });
        expect(uren.some(t => t.h === 7 || t.h === 9)).toBe(true);
    });

    test('the grain follows the card, guarded by the exercise\'s own minutes', () => {
        expect(grainOf(['uren'], 0)).toBe(60);
        expect(grainOf(['uren', 'halve_uren'], 30)).toBe(30);
        expect(grainOf(['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'], 45)).toBe(15);
        expect(grainOf(['nauwkeurig_5'], 25)).toBe(5);
        expect(grainOf(['nauwkeurig_1'], 7)).toBe(1);
        expect(grainOf(['uren'], 15)).toBe(15);
    });
});

describe('klok questions per direction', () => {
    test('analoog → woorden: the face asks, four phrases in the four-word grammar answer, checked by the kiosk', () => {
        const { exercise, constraints, q } = question('analoog-woorden', 8, 15, ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor']);
        expect(q.text).toBe('Hoe laat is het?');
        expect(q.visual).toEqual({ kind: 'klok', h: 8, m: 15 });
        expect(q.views.map(v => v.text)).toContain('kwart over 8');
        // Kwart over ↔ kwart voor: the classic one is on the board.
        expect(q.views.map(v => v.text)).toContain('kwart voor 8');
        expect(q.views.every(v => v.text && !v.visual && !/half \d+ (over|voor)|voor half|over half/.test(v.text))).toBe(true);
        q.choices.forEach((c, i) => expect(checkAnswer(D, exercise, constraints, q.kioskAnswers[i])).toBe(c === q.answer));
    });

    test('analoog → digitaal: four uu:mm times, a 12-hour card writes 08:15 and never 20:15 beside it', () => {
        const { exercise, constraints, q } = question('analoog-digitaal', 8, 15);
        expect(q.visual).toEqual({ kind: 'klok', h: 8, m: 15 });
        const texts = q.views.map(v => v.text!);
        expect(texts).toContain('08:15');
        expect(texts.every(t => /^(0[1-9]|1[0-2]):\d\d$/.test(t))).toBe(true);
        q.choices.forEach((c, i) => expect(checkAnswer(D, exercise, constraints, q.kioskAnswers[i])).toBe(c === q.answer));
    });

    test('digitaal → analoog: "08:15" asks, four clock faces answer (the drag answer the kiosk takes)', () => {
        const { exercise, constraints, q } = question('digitaal-analoog', 8, 15);
        expect(q.visual).toEqual({ kind: 'digitaal', text: '08:15' });
        expect(q.views.every(v => v.visual?.kind === 'klok' && v.label.startsWith('klok: '))).toBe(true);
        expect(q.views.map(v => v.visual)).toContainEqual({ kind: 'klok', h: 8, m: 15 });
        q.choices.forEach((c, i) => expect(checkAnswer(D, exercise, constraints, q.kioskAnswers[i])).toBe(c === q.answer));
    });

    test('woorden → digitaal on a 24-hour card: the card\'s words ask, 24-hour times answer, the half trap is the classic 3:30', () => {
        const { exercise, constraints, q } = question('woorden-digitaal', 14, 30, ALL_TYPES, 'seed-a');
        expect(q.text).toBe('half 15 = ?');
        expect(q.visual).toBeUndefined();
        expect(q.views.map(v => v.text)).toContain('14:30');
        expect(q.views.map(v => v.text)).toContain('15:30');
        q.choices.forEach((c, i) => expect(checkAnswer(D, exercise, constraints, q.kioskAnswers[i])).toBe(c === q.answer));
    });

    test('the leerjaar presets: hele uren stay hele uren, halve uren stay on :00 / :30', () => {
        for (let h = 1; h <= 12; h++) {
            expect(question('analoog-woorden', h, 0, ['uren']).q.views.every(v => / uur$/.test(v.text!))).toBe(true);
            const half = question('analoog-woorden', h, 30, ['uren', 'halve_uren']).q.views.map(v => v.text!);
            expect(half.every(t => /^half \d+$|^\d+ uur$/.test(t))).toBe(true);
            // The half-drie trap: the face shows h:30 (half h+1); "half h" names the hour the kleine wijzer just passed.
            expect(half).toContain(`half ${h}`);
        }
    });

    test('the help tip says where the grote wijzer stands and what it means', () => {
        expect(klokTip({ h: 8, m: 15 }, 'analoog-woorden')).toBe('De grote wijzer staat op de 3: dat is kwart over.');
        expect(klokTip({ h: 8, m: 30 }, 'analoog-woorden')).toBe('De grote wijzer staat op de 6: dat is half.');
        expect(klokTip({ h: 8, m: 45 }, 'analoog-woorden')).toBe('De grote wijzer staat op de 9: dat is kwart voor.');
        expect(klokTip({ h: 8, m: 40 }, 'analoog-woorden')).toBe('De grote wijzer staat op de 8: dat is 20 minuten voor.');
        expect(klokTip({ h: 8, m: 0 }, 'digitaal-analoog')).toBe('De grote wijzer staat op de 12: dat is een heel uur.');
        expect(klokTip({ h: 8, m: 45 }, 'analoog-digitaal')).toBe('De grote wijzer staat op de 9: dat is 45 minuten na het uur.');
        expect(klokTip({ h: 8, m: 22 }, 'woorden-digitaal')).toBe('De grote wijzer staat tussen de 4 en de 5: dat is 22 minuten na het uur.');
        expect(question('analoog-woorden', 8, 15).q.help).toEqual({ tip: 'De grote wijzer staat op de 3: dat is kwart over.', visual: { kind: 'klok', h: 8, m: 15, mark: true } });
    });
});
