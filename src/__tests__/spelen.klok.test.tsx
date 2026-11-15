// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { PICTURE_CONTENT, skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import GameRow from '../oefenen/zelf/GameRow';
import { gamesFor } from '../oefenen/zelf/topicGames';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useOefenStore } from '../oefenen/useOefenStore';
import { klokQuestion, KLOK_LEAVES, type KlokDirection } from '../oefenen/spelen/content/klok/klokPack';
import { SpelVisual } from '../oefenen/spelen/SpelVisual';
import { formatDigitalTime, formatTimeText } from '../services/clock/clockTypes';
import type { ClockExercise } from '../services/math/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import type { SkinProps } from '../oefenen/spelen/skins/types';
import Ballonnen from '../oefenen/spelen/skins/ballonnen/Ballonnen';
import { resetKiosk } from './helpers/oefenKiosk';

// The klok in the games: the picker shows only the tap skins that draw pictures, a round plays and checks
// picture choices, Nakijken replays the klok mistakes in the normal kiosk, and the shared <SpelVisual>.

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

let data: EenvoudigData;
// The widest klok-only choice of the leerjaar (leerjaar 3: Alles door elkaar holds all four directions).
const klokChoice = (grade: number): ZelfChoice | undefined =>
    choicesFor(data, grade as 1, 'Klok en kalender').filter(c => c.vars.every(v => (KLOK_LEAVES as readonly string[]).includes(v.leafId)))
        .sort((a, b) => b.vars.length - a.vars.length)[0];

beforeAll(async () => { data = await loadEenvoudigData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('klok in the picker', () => {
    test('the Klok choice plays at leerjaar 1–3 as picture content; kalender does not', () => {
        for (const g of [1, 2, 3]) {
            const c = klokChoice(g);
            expect(c, `leerjaar ${g}`).toBeDefined();
            expect(choiceCanPlay(c!, g)).toBe(true);
            expect(spelContentOf(c!, g)).toEqual(PICTURE_CONTENT);
        }
        expect(choiceCanPlay(klokChoice(3)!, 4)).toBe(false);
        // Kalender, tijdsduur and anything mixed with them stay out.
        const other = choicesFor(data, 3, 'Klok en kalender').filter(c => c.vars.some(v => !(KLOK_LEAVES as readonly string[]).includes(v.leafId)));
        expect(other.every(c => !choiceCanPlay(c, 3))).toBe(true);
    });

    test('klok content hides the keypad games and the number-only eggs: only the tap skins that draw pictures', () => {
        expect(skinsFor(SKINS, PICTURE_CONTENT).map(s => s.meta.id)).toEqual(['ballonnen', 'zeehond', 'pakjesband', 'mollen']);
        render(<GameRow games={gamesFor(PICTURE_CONTENT, new Date(2026, 6, 1))} onPlay={vi.fn()} />);
        const shown = within(screen.getByRole('group', { name: 'Kies een spel' })).getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(shown).toEqual(['Ballonnen', 'Zeehondjes voeren', 'Speelgoedfabriek', 'Mollen meppen, op tijd']);
        expect(screen.queryByText('binnenkort')).toBeNull();
    });
});

describe('a klok round', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); useSpelStore.getState().otherGame(); });

    test('Ballonnen on the leerjaar 3 Klok choice: picture questions, the kiosk checks a pick, Nakijken replays the klok mistakes', () => {
        const sp = () => useSpelStore.getState();
        const choice = klokChoice(3)!;
        sp().start({ choice, grade: 3, topicId: 'Klok en kalender', meta: skinById('ballonnen')!.meta, now: 1_000_000 });
        const seen = new Set<string>();
        for (let i = 0; i < 20 && sp().phase !== 'end'; i++) {
            const q = sp().question!;
            expect(q.kind).toBe('choice');
            expect(q.views).toHaveLength(4);
            expect(q.choices).toContain(q.answer);
            seen.add(q.visual?.kind ?? 'woorden');
            sp().answer(i % 4 === 1 ? q.choices.find(c => c !== q.answer)! : q.answer);
            expect(sp().feedback!.correct).toBe(i % 4 !== 1);
            sp().next();
        }
        // Leerjaar 3 mixes the directions; a clock face asks at least once in 20.
        expect(seen.has('klok')).toBe(true);
        expect(new Set(choice.vars.map(v => v.leafId))).toEqual(new Set(KLOK_LEAVES));
        const mistakes = sp().mistakes.map(m => m.question);
        expect(mistakes).toHaveLength(5);
        sp().nakijken();
        const k = useOefenStore.getState();
        expect(k.sessie!.title).toBe('Nakijken');
        expect(k.phase).toBe('exercise');
        expect(k.shown!.exercise).toEqual(mistakes[0].exercise);
        expect(k.shown!.exerciseKey).toBe(mistakes[0].key);
    });
});

describe('the shared picture component', () => {
    test('SpelVisual draws a clock face (bold hands, the mark ring for help) and a digital display', () => {
        const { container, rerender } = render(<SpelVisual visual={{ kind: 'klok', h: 8, m: 15 }} />);
        expect(screen.getByRole('img', { name: 'klok op 8:15' })).toBeTruthy();
        expect(container.querySelector('.spel-klok-minute')).toBeTruthy();
        expect(container.querySelector('.spel-klok-ring')).toBeNull();
        rerender(<SpelVisual visual={{ kind: 'klok', h: 8, m: 15, mark: true }} />);
        expect(container.querySelector('.spel-klok.is-mark .spel-klok-ring')).toBeTruthy();
        rerender(<SpelVisual visual={{ kind: 'digitaal', text: '08:15' }} />);
        expect(screen.getByRole('img', { name: 'digitale klok 08:15' }).textContent).toBe('08:15');
    });

    test('Ballonnen draws the clock on its sign and faces on the balloons, named by their view; a tap hands back the value', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const { q } = question('digitaal-analoog', 8, 15);
        const onAnswer = vi.fn();
        const props: SkinProps = {
            question: { key: 'q1', text: q.text, index: 0, visual: q.visual }, choices: q.choices, views: q.views,
            phase: 'play', feedback: null, onAnswer, onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
            progress: { answered: 0, total: 20, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null },
            options: {}, events: createSpelEvents(), reducedMotion: true,
        };
        const { container } = render(<Suspense fallback={null}><Ballonnen {...props} /></Suspense>);
        expect(container.querySelector('.bal-sign.spel-sign-has-pic .spel-digi')!.textContent).toBe('08:15');
        expect(container.querySelectorAll('.bal-num.is-picture .spel-klok')).toHaveLength(4);
        const i = q.choices.indexOf(q.answer);
        fireEvent.click(await screen.findByRole('button', { name: q.views[i].label }));
        expect(onAnswer).toHaveBeenCalledWith(q.answer);
    });
});
