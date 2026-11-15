import type { EenvoudigData } from '../../config/eenvoudig/cards';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { skinsFor, type SpelContent } from '../spelen/accepts';
import { choiceCanPlay, spelContentOf } from '../spelen/spelQuestion';
import { SKINS, skinById } from '../spelen/skins/registry';
import { seasonsOn } from '../spelen/seasons';
import { thumbOf } from '../spelen/thumbs';
import { choicesFor } from './zelfSessie';

type Skin = (typeof SKINS)[number];

// The picture on a topic card: one game per topic (owner 2026-11-15). A test checks that the game plays every
// playable choice of the topic wherever it shows (oefenen.zelfStart.test.tsx); where nothing plays, the card shows its Oefenmodus picture.
export const TOPIC_GAME: Readonly<Record<string, string>> = {
    'Hoofdrekenen · Optellen': 'ballonnen',
    'Hoofdrekenen · Aftrekken': 'pinguintoren',
    'Hoofdrekenen · Maaltafels': 'kasteel',
    'Hoofdrekenen · Deeltafels': 'zombies',
    'Hoofdrekenen · Vermenigvuldigen': 'voetbal',
    'Hoofdrekenen · Delen': 'bom',
    'Klok en kalender': 'zeehond',
    Breuken: 'pakjesband',
    'Handig rekenen': 'prent',
};

const playable = (s: Skin | null): s is Skin => !!s && !!(s.Component || s.Screen);

/** The game whose picture the topic card shows at this leerjaar: its TOPIC_GAME line when that game plays one of its choices there; else null (the icon). */
export function topicGameOf(data: EenvoudigData, grade: Leerjaar, topicId: string): Skin | null {
    const skin = TOPIC_GAME[topicId] ? skinById(TOPIC_GAME[topicId]) : null;
    if (!playable(skin)) return null;
    const fits = choicesFor(data, grade, topicId).some(c => {
        const content = choiceCanPlay(c, grade) ? spelContentOf(c, grade) : null;
        return !!content && skinsFor([skin], content).length > 0;
    });
    return fits ? skin : null;
}

/** Whether any game plays one of the topic's choices at this leerjaar (the controller badge on its card). */
export const topicHasGame = (data: EenvoudigData, grade: Leerjaar, topicId: string): boolean =>
    choicesFor(data, grade, topicId).some(c => choiceCanPlay(c, grade));

/** A topic card: the game whose picture it shows (null = its Oefenmodus picture) and whether it has games; no leerjaar yet = any leerjaar. */
export function topicCardOf(data: EenvoudigData, grade: Leerjaar | null, topicId: string): { game: Skin | null; hasGame: boolean } {
    const grades = grade !== null ? [grade] : LEERJAREN;
    return {
        game: grades.map(g => topicGameOf(data, g, topicId)).find(Boolean) ?? null,
        hasGame: grades.some(g => topicHasGame(data, g, topicId)),
    };
}

export interface GameCardOf { skin: Skin; nu: boolean }

/** The games bar of the Keuze screen: every ready game that accepts the content, in-season first, then calm, then timed (registry order within). */
export function gamesFor(content: SpelContent | null, today: Date): GameCardOf[] {
    if (!content) return [];
    const now = seasonsOn(today);
    const games = skinsFor(SKINS, content).filter(playable).map(skin => ({ skin, nu: !!skin.meta.season && now.includes(skin.meta.season) }));
    const rank = (g: GameCardOf) => (g.nu ? 0 : g.skin.meta.timed ? 2 : 1);
    return games.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i).map(x => x.g);
}

/** "Hoofdrekenen · Optellen" → "hoofdrekenen-optellen": the topic's part of its Oefenmodus picture's file name. */
export const topicSlug = (topicId: string) =>
    topicId.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A topic's Oefenmodus picture (an exercise card of that topic), for a card whose topic has no game picture. */
export const oefenThumbOf = (topicId: string) => thumbOf(`oefen-${topicSlug(topicId)}`);
