// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { nextExercise } from '../services/oefenen/scheduler';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { choiceCanPlay, spelChoiceOf, spelContentOf, spelQuestionOf, spelVarsOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { PICTURE_CONTENT, skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import GameRow from '../oefenen/zelf/GameRow';
import { gamesFor } from '../oefenen/zelf/topicGames';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useOefenStore } from '../oefenen/useOefenStore';
import { nextBoardOf, boardPickIn } from '../oefenen/spelen/board/session';
import { answerFace, sumFace } from '../oefenen/spelen/board/board';
import { breukSpelOf, breukSpelOfVariant, gelijknamigDistractors, simplifyDistractors, BREUK_LEAVES, PICTURE_OPTION_MAX_D, type BreukSpel } from '../oefenen/spelen/content/breuken/breukPack';
import { combBreuken, COMB_TARGETS } from '../oefenen/spelen/content/breuken/breukComb';
import { sameValue, type Breuk } from '../oefenen/spelen/content/breuken/breukQuestions';
import { SpelVisual } from '../oefenen/spelen/SpelVisual';
import { createSpelEvents } from '../oefenen/spelen/events';
import type { SkinProps } from '../oefenen/spelen/skins/types';
import Hartjes from '../oefenen/spelen/board/hartjes/Hartjes';
import type { OefenSessie } from '../services/oefenen/types';
import { resetKiosk } from './helpers/oefenKiosk';

// The breuken in the games: herkennen (L2–L4) and, at leerjaar 4, gelijkwaardig, vereenvoudig, gelijknamig
// and vergelijken; the card → type mapping, the picker, Hartjes pairs, the Honingraat comb and Nakijken.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const breukChoices = (g: number) => choicesFor(data, g as 2, 'Breuken');
const byLabel = (g: number, label: string) => breukChoices(g).find(c => c.label === label)!;
const parse = (t: string): Breuk => { const [n, d] = t.split('/').map(Number); return { n, d }; };
const isBreukLeaf = (leafId: string) => (BREUK_LEAVES as readonly string[]).includes(leafId);

// Every game question of a choice's breuken cards over many made exercises, with its kiosk type.
function questionsOf(choice: ZelfChoice, g: number, n = 120, board?: 'pairs' | 'target'): { q: SpelQuestion; s: OefenSessie }[] {
    const s = buildZelfSessie(spelChoiceOf(choice, g, board), { kind: 'count', n: 10 }, 0, g);
    const rng = mulberry32(g * 77 + n);
    const out: { q: SpelQuestion; s: OefenSessie }[] = [];
    for (let i = 0; i < n; i++) {
        const slot = i % s.types.length;
        const made = nextExercise(s, s.types[slot], new Set(), rng);
        const q = made && isBreukLeaf(s.types[slot].leafId) && spelQuestionOf(s.types[slot], slot, made);
        if (q) out.push({ q, s });
    }
    return out;
}

// The kiosk passes exactly the answer's own pick.
function kioskPasses({ q, s }: { q: SpelQuestion; s: OefenSessie }): string[] {
    const type = s.types[q.slot];
    const d = kioskFor(type.typeId)!;
    return q.choices.filter((_, i) => checkAnswer(d, q.exercise, q.constraints, q.kioskAnswers![i], type.exactForm));
}

const L4_ALL = () => byLabel(4, 'Alles door elkaar');

describe('the card → type mapping', () => {
    test('each breuken card variant at leerjaar 2–4 plays its own type; onechte breuken and free noemer pairs do not', () => {
        const want: Record<string, BreukSpel[]> = {
            'breuken-herkennen': ['herkennen'],
            'breuken-vereenvoudigen': ['gelijkwaardig', 'vereenvoudig'],
            'breuken-gelijknamig': ['gelijknamig'],
            'breuken-rangschikken': ['vergelijken'],
        };
        let seen = 0;
        for (const t of data.types) for (const v of t.vars) {
            if (!isBreukLeaf(v.leafId) || v.lj > 4) continue;
            expect(breukSpelOfVariant(v), v.id).toEqual(want[v.leafId]);
            seen++;
        }
        expect(seen).toBeGreaterThanOrEqual(8);
        expect(breukSpelOf('breuken-herkennen', { allowImproper: true })).toEqual([]);
        expect(breukSpelOf('breuken-gelijknamig', { denominatorRelation: 'any' })).toEqual([]);
        expect(breukSpelOf('breuken-kleuren', {})).toEqual([]);
    });

    test('the made exercises follow the card: Gelijkwaardige breuken asks both gelijkwaardig and vereenvoudig', () => {
        const qs = questionsOf(L4_ALL(), 4, 400).map(x => x.q.text);
        expect(qs.some(t => /^Welk deel is gekleurd\?$|^Waar is \d+\/\d+ gekleurd\?$/.test(t))).toBe(true);
        expect(qs.some(t => /^\d+\/\d+ is gelijk aan \?$/.test(t))).toBe(true);
        expect(qs.some(t => /^Vereenvoudig: \d+\/\d+ = \?$/.test(t))).toBe(true);
        expect(qs.some(t => /^\d+\/\d+ is gelijknamig met \?$/.test(t))).toBe(true);
        expect(qs.some(t => /^\d+\/\d+ \? \d+\/\d+$/.test(t))).toBe(true);
    });
});

describe('Spelen at leerjaar 4: only the breuken', () => {
    test('breuken choices play at leerjaar 2–4 (a mixed choice plays its breuken part), never at 5; sums go on to 6', () => {
        expect(choiceCanPlay(byLabel(2, 'Welk deel is gekleurd?'), 2)).toBe(true);
        expect(choiceCanPlay(byLabel(3, 'Breuk in een figuur'), 3)).toBe(true);
        for (const label of ['Deel van een geheel', 'Breuken vergelijken', 'Alles door elkaar']) expect(choiceCanPlay(byLabel(4, label), 4), label).toBe(true);
        // Breuken vergelijken without its getallenas card; Deel van een geheel is herkennen plus the tekst pack's "2/3 van 18".
        expect(spelVarsOf(byLabel(4, 'Breuken vergelijken'), 4).map(v => v.leafId).every(isBreukLeaf)).toBe(true);
        expect(new Set(spelVarsOf(byLabel(4, 'Deel van een geheel'), 4).map(v => v.leafId))).toEqual(new Set(['breuken-herkennen', 'breuken-hoeveelheid']));
        expect(choiceCanPlay(byLabel(4, 'Breuken vergelijken'), 5)).toBe(false);
        // Kleuren alone has no game; neither has any number card at leerjaar 4.
        expect(choiceCanPlay(byLabel(3, 'Breuk kleuren'), 3)).toBe(false);
        // Owner 2026-11-15: the whole-number sums play to leerjaar 6 (the breuken sums still have no game).
        const sums = choicesFor(data, 4, 'Hoofdrekenen · Optellen');
        expect(sums.find(c => c.label === 'Met brug') && choiceCanPlay(sums.find(c => c.label === 'Met brug')!, 4)).toBe(true);
        expect(choiceCanPlay(sums.find(c => c.label === 'Breuken')!, 4)).toBe(false);
    });

    test('the picker: picture games for herkennen, plus Hartjes; Gelijkwaardige breuken also Honingraat; no keypad game', () => {
        const ids = (c: ZelfChoice, g: number) => skinsFor(SKINS, spelContentOf(c, g)!).map(s => s.meta.id);
        expect(ids(byLabel(3, 'Breuk in een figuur'), 3)).toEqual(['ballonnen', 'zeehond', 'hartjes', 'pakjesband', 'mollen']);
        expect(ids(byLabel(4, 'Breuken vergelijken'), 4)).toEqual(['ballonnen', 'zeehond', 'hartjes', 'honingraat', 'pakjesband', 'mollen']);
        expect(spelContentOf(byLabel(4, 'Breuken vergelijken'), 4)).toEqual({ ...PICTURE_CONTENT, boards: ['pairs', 'target'] });
        // The klok fills no board: Hartjes and Honingraat stay out.
        expect(skinsFor(SKINS, PICTURE_CONTENT).map(s => s.meta.id)).toEqual(['ballonnen', 'zeehond', 'pakjesband', 'mollen']);
        render(<GameRow games={gamesFor(spelContentOf(byLabel(4, 'Breuken vergelijken'), 4), new Date(2026, 6, 1))} onPlay={vi.fn()} />);
        const shown = within(screen.getByRole('group', { name: 'Kies een spel' })).getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(shown).toEqual(['Ballonnen', 'Zeehondjes voeren', 'Speelgoedfabriek', 'Mollen meppen, op tijd', 'Hartjes koppelen', 'Honingraat']);
    });

    test('a board round plays only the cards that fill it', () => {
        const c = byLabel(4, 'Breuken vergelijken');
        expect(new Set(spelVarsOf(c, 4, 'pairs').map(v => v.leafId))).toEqual(new Set(['breuken-vereenvoudigen']));
        expect(new Set(spelVarsOf(L4_ALL(), 4, 'pairs').map(v => v.leafId))).toEqual(new Set(['breuken-herkennen', 'breuken-vereenvoudigen']));
        expect(new Set(spelVarsOf(c, 4, 'target').map(v => v.leafId))).toEqual(new Set(['breuken-vereenvoudigen']));
    });
});

describe('the question types', () => {
    const all = () => [2, 3, 4].flatMap(g => breukChoices(g).filter(c => choiceCanPlay(c, g)).flatMap(c => questionsOf(c, g, 150)));
    let qs: { q: SpelQuestion; s: OefenSessie }[] = [];
    beforeAll(() => { qs = all(); });
    const ofType = (re: RegExp) => qs.filter(x => re.test(x.q.text));

    test('every question: the answer once among unique choices, and only the answer passes the kiosk check', () => {
        // The tekst pack's "2/3 van 18" takes some slots of the mixed choices.
        expect(qs.length).toBeGreaterThan(600);
        for (const x of qs) {
            const { q } = x;
            expect(new Set(q.choices).size, q.text).toBe(q.choices.length);
            expect(q.choices.filter(c => c === q.answer)).toHaveLength(1);
            expect(q.views).toHaveLength(q.choices.length);
            expect(kioskPasses(x), `${q.text} ${q.choices}`).toEqual([q.answer]);
            expect(q.help?.tip).toBeTruthy();
        }
    });

    test('herkennen: four options never equal in value, picture options at most tienden, both directions', () => {
        const her = ofType(/gekleurd\?$/);
        expect(her.length).toBeGreaterThan(200);
        let pictures = 0;
        for (const { q } of her) {
            expect(q.choices).toHaveLength(4);
            const bs = q.choices.map(parse);
            for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) expect(sameValue(bs[i], bs[j])).toBe(false);
            if (q.views!.some(v => v.visual)) {
                pictures++;
                expect(q.visual).toBeUndefined();
                expect(bs.every(b => b.d <= PICTURE_OPTION_MAX_D)).toBe(true);
            } else expect(q.visual?.kind).toBe('breuk');
        }
        expect(pictures).toBeGreaterThan(50);
    });

    test('gelijkwaardig and vereenvoudig: the lowest form, never an equal option beside it, only breuken that simplify', () => {
        const simp = ofType(/is gelijk aan \?$|^Vereenvoudig/);
        expect(simp.length).toBeGreaterThan(30);
        for (const { q } of simp) {
            const prompt = parse(/(\d+\/\d+)/.exec(q.text)![1]);
            const a = parse(q.answer);
            expect(sameValue(prompt, a)).toBe(true);
            expect(a.d).toBeLessThan(prompt.d);
            for (const c of q.choices.filter(c => c !== q.answer)) {
                expect(sameValue(parse(c), a), `${q.text}: ${c}`).toBe(false);
                expect(parse(c).n % parse(c).d).not.toBe(0);
            }
        }
    });

    test('the owner\'s slips: 6/8 → 3/8, 6/4, 7/9, 1/2; 6/9 → 3/6, 2/9, 1/3', () => {
        const over = (f: Breuk, a: Breuk, spel: 'gelijkwaardig' | 'vereenvoudig') =>
            new Set(Array.from({ length: 30 }, (_, s) => simplifyDistractors(f, a, spel, mulberry32(s)).map(b => `${b.n}/${b.d}`)).flat());
        const g = over({ n: 6, d: 8 }, { n: 3, d: 4 }, 'gelijkwaardig');
        for (const t of ['3/8', '6/4', '7/9']) expect(g.has(t), t).toBe(true);
        expect(g.has('1/2') || g.has('1/4')).toBe(true);
        const v = over({ n: 6, d: 9 }, { n: 2, d: 3 }, 'vereenvoudig');
        for (const t of ['3/6', '2/9', '1/3']) expect(v.has(t), t).toBe(true);
        for (const t of [...g, ...v]) expect(['6/8', '3/4', '4/6', '2/3', '9/12'].includes(t)).toBe(false);
    });

    test('gelijknamig: exactly one option over the asked noemer', () => {
        const gn = ofType(/is gelijknamig met \?$/);
        expect(gn.length).toBeGreaterThan(20);
        for (const { q } of gn) {
            const d = parse(/^(\d+\/\d+)/.exec(q.text)![1]).d;
            expect(q.choices.filter(c => parse(c).d === d), q.text).toEqual([q.answer]);
        }
        const ds = gelijknamigDistractors({ n: 3, d: 8 }, { n: 1, d: 4 }, { n: 2, d: 8 }, mulberry32(1));
        expect(ds.map(b => `${b.n}/${b.d}`)).toContain('1/4');
        expect(ds.every(b => b.d !== 8)).toBe(true);
    });

    test('vergelijken: < = > with the right sign, and Nakijken gets exactly those two breuken', () => {
        const vg = ofType(/^\d+\/\d+ \? \d+\/\d+$/);
        expect(vg.length).toBeGreaterThan(50);
        const signs = new Set<string>();
        for (const { q } of vg) {
            expect(q.choices).toEqual(['<', '=', '>']);
            const [a, b] = q.text.split(' ? ').map(parse);
            const want = sameValue(a, b) ? '=' : a.n / a.d < b.n / b.d ? '<' : '>';
            expect(q.answer, q.text).toBe(want);
            signs.add(q.answer);
            const ex = q.exercise as { display: Breuk[] };
            expect(ex.display.map(f => `${f.n}/${f.d}`)).toEqual(q.text.split(' ? '));
        }
        expect(signs).toEqual(new Set(['<', '=', '>']));
    });
});

describe('Hartjes koppelen with breuken', () => {
    test('herkennen pairs a picture with its breuk; vereenvoudigen a breuk with its lowest form; never two equal values on a board', () => {
        const round = skinById('hartjes')!.meta.round.board!;
        for (const [g, label] of [[2, 'Welk deel is gekleurd?'], [3, 'Breuk in een figuur'], [4, 'Breuken vergelijken'], [4, 'Alles door elkaar']] as const) {
            const s = { ...buildZelfSessie(spelChoiceOf(byLabel(g, label), g, 'pairs'), { kind: 'count', n: 10 }, 0, g), total: undefined };
            for (let seed = 0; seed < 4; seed++) {
                const b = nextBoardOf(s, round, null, [], undefined, mulberry32(seed))!;
                expect(b.cells.length, label).toBeGreaterThanOrEqual(g === 2 ? 5 : 6);
                const values = b.cells.map(c => c.question.same!);
                expect(new Set(values).size).toBe(values.length);
                for (const c of b.cells) {
                    const sum = sumFace(c.question), ans = answerFace(c.question);
                    expect(ans).toEqual({ kind: 'text', text: c.question.answer });
                    if (c.question.text.includes('gekleurd')) expect(sum.kind).toBe('picture');
                    else expect(sum).toMatchObject({ kind: 'text' });
                    expect(c.question.answer.length).toBeLessThanOrEqual(5);
                }
                // The session checks a pick in the kiosk's form: its own breuk is right, another one is a strike.
                const out = boardPickIn(s, b, round, 0, b.cells[0].question.answer, true, 0)!;
                expect(out.correct).toBe(true);
                const wrong = boardPickIn(s, b, round, 1, b.cells[0].question.answer, true, 0)!;
                expect(wrong.correct).toBe(false);
            }
        }
    });

    test('the hearts draw the picture card through SpelVisual', () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const round = skinById('hartjes')!.meta.round.board!;
        const s = { ...buildZelfSessie(spelChoiceOf(byLabel(3, 'Breuk in een figuur'), 3, 'pairs'), { kind: 'count', n: 10 }, 0, 3), total: undefined };
        const board = nextBoardOf(s, round, null, [], undefined, mulberry32(3))!;
        const props = {
            board, phase: 'play', onBoardPick: vi.fn(), onBoardFocus: vi.fn(), sound: vi.fn(), reducedMotion: true,
        } as unknown as SkinProps;
        const { container } = render(<Suspense fallback={null}><Hartjes {...props} /></Suspense>);
        expect(container.querySelectorAll('.hj-pic .breuk-pic')).toHaveLength(board.cells.length);
        expect(screen.getByText('Zoek wat bij elkaar hoort')).toBeTruthy();
    });
});

describe('Honingraat with breuken', () => {
    test('the comb: 3–5 breuken equal to the target (never the target itself), near misses never equal', () => {
        for (const target of COMB_TARGETS) for (let seed = 0; seed < 40; seed++) {
            const cells = combBreuken(target, 13, mulberry32(seed));
            expect(cells).toHaveLength(13);
            const hits = cells.filter(c => c.match);
            expect(hits.length).toBeGreaterThanOrEqual(3);
            expect(hits.length).toBeLessThanOrEqual(5);
            for (const c of cells) {
                expect(c.match).toBe(sameValue(c.breuk, target));
                expect(c.breuk.d).not.toBe(c.match ? target.d : -1);
                expect(c.breuk.d).toBeLessThanOrEqual(12);
            }
            expect(new Set(cells.map(c => `${c.breuk.n}/${c.breuk.d}`)).size).toBe(13);
        }
    });

    test('three combs (1/2, 1/3, 2/3) of the card\'s own vereenvoudigen questions; a wrong cell is a mistake Nakijken asks again', () => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        const sp = () => useSpelStore.getState();
        sp().otherGame();
        sp().start({ choice: byLabel(4, 'Breuken vergelijken'), grade: 4, topicId: 'Breuken', meta: skinById('honingraat')!.meta, now: 1_000_000 });
        const b = sp().board!;
        expect(b.target).toEqual({ kind: 'pack', lead: 'Zoek alle breuken die gelijk zijn aan', n: '1/2', claim: 'gelijk aan 1/2' });
        expect(b.cells).toHaveLength(13);
        expect(new Set(b.cells.map(c => sp().sessie!.types[c.question.slot].leafId))).toEqual(new Set(['breuken-vereenvoudigen']));
        const miss = b.cells.findIndex(c => !c.match);
        sp().boardPick(miss, '');
        expect(sp().mistakes).toHaveLength(1);
        expect(sp().mistakes[0].given).toBe('gelijk aan 1/2');
        const q = sp().mistakes[0].question;
        const d = kioskFor('breuken-bewerken')!;
        expect(checkAnswer(d, q.exercise, q.constraints, q.answer)).toBe(true);
        const next = nextBoardOf(sp().sessie!, skinById('honingraat')!.meta.round.board!, b, sp().history, undefined, mulberry32(2))!;
        expect(next.target).toMatchObject({ n: '1/3' });
    });
});

describe('a breuken round and Nakijken', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); useSpelStore.getState().otherGame(); });

    test('Ballonnen on Breuk in een figuur: the kiosk checks a pick; Nakijken replays the breuken mistakes in the kiosk', () => {
        const sp = () => useSpelStore.getState();
        sp().start({ choice: byLabel(3, 'Breuk in een figuur'), grade: 3, topicId: 'Breuken', meta: skinById('ballonnen')!.meta, now: 1_000_000 });
        for (let i = 0; i < 12 && sp().phase !== 'end'; i++) {
            const q = sp().question!;
            sp().answer(i % 3 === 1 ? q.choices.find(c => c !== q.answer)! : q.answer);
            expect(sp().feedback!.correct).toBe(i % 3 !== 1);
            sp().next();
        }
        const mistakes = sp().mistakes.map(m => m.question);
        expect(mistakes).toHaveLength(4);
        useSpelStore.setState({ phase: 'end' });
        sp().nakijken();
        const k = useOefenStore.getState();
        expect(k.sessie!.title).toBe('Nakijken');
        expect(k.shown!.exercise).toEqual(mistakes[0].exercise);
    });

    test('a vergelijken mistake replays the two breuken as an ordering in the kiosk', () => {
        const sp = () => useSpelStore.getState();
        const c = byLabel(4, 'Breuken vergelijken');
        sp().start({ choice: { ...c, vars: c.vars.filter(v => v.leafId === 'breuken-rangschikken') }, grade: 4, topicId: 'Breuken', meta: skinById('pakjesband')!.meta, now: 1_000_000 });
        const q = sp().question!;
        expect(q.choices).toEqual(['<', '=', '>']);
        sp().answer(q.choices.find(x => x !== q.answer)!);
        expect(sp().feedback!.correct).toBe(false);
        useSpelStore.setState({ phase: 'end' });
        sp().nakijken();
        const shown = useOefenStore.getState().shown!.exercise as { display: unknown[] };
        expect(shown).toEqual(q.exercise);
        expect(shown.display).toHaveLength(2);
    });

    test('SpelVisual draws a breuk, and two side by side for the vergelijken help', () => {
        const { container, rerender } = render(<SpelVisual visual={{ kind: 'breuk', n: 3, d: 8, shape: 'pizza' }} />);
        expect(screen.getByRole('img', { name: 'Pizza in 8 stukken, 3 met beleg' })).toBeTruthy();
        rerender(<SpelVisual visual={{ kind: 'breuk', n: 3, d: 4, shape: 'pizza', with: { n: 2, d: 3 } }} />);
        expect(container.querySelectorAll('.spel-breuk-pair .breuk-pic')).toHaveLength(2);
    });

    test('Ballonnen shows breuk pictures on the balloons for a breuk → picture question', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const Ballonnen = (await import('../oefenen/spelen/skins/ballonnen/Ballonnen')).default;
        const q = questionsOf(byLabel(3, 'Breuk in een figuur'), 3, 60).map(x => x.q).find(x => x.views!.every(v => v.visual))!;
        const onAnswer = vi.fn();
        const props: SkinProps = {
            question: { key: 'q1', text: q.text, index: 0, visual: q.visual }, choices: q.choices, views: q.views,
            phase: 'play', feedback: null, onAnswer, onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
            progress: { answered: 0, total: 20, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null },
            options: {}, events: createSpelEvents(), reducedMotion: true,
        };
        const { container } = render(<Suspense fallback={null}><Ballonnen {...props} /></Suspense>);
        expect(container.querySelectorAll('.bal-num.is-picture .breuk-pic')).toHaveLength(4);
        const i = q.choices.indexOf(q.answer);
        fireEvent.click(await screen.findByRole('button', { name: q.views![i].label }));
        expect(onAnswer).toHaveBeenCalledWith(q.answer);
    });
});
