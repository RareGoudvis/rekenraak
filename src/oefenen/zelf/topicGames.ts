import type { EenvoudigData } from '../../config/eenvoudig/cards';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { skinsFor, type SpelContent } from '../spelen/accepts';
import { choiceCanPlay, spelContentOf } from '../spelen/spelQuestion';
import { SKINS, skinById } from '../spelen/skins/registry';
import { seasonsOn } from '../spelen/seasons';
import { thumbOf } from '../spelen/thumbs';
import { choicesFor } from './zelfSessie';

type Skin = (typeof SKINS)[number];

// The picture on a topic card: a preferred game per topic (owner 2026-11-15); where it doesn't fit, topicGameOf picks
// another game that does (oefenen.zelfStart.test.tsx); where nothing plays, the card shows its Oefenmodus picture.
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

// Whether this game plays at least one choice of the topic at this leerjaar.
function playsTopic(data: EenvoudigData, grade: Leerjaar, topicId: string, skin: Skin): boolean {
    return choicesFor(data, grade, topicId).some(c => {
        const content = choiceCanPlay(c, grade) ? spelContentOf(c, grade) : null;
        return !!content && skinsFor([skin], content).length > 0;
    });
}

/**
 * The game whose picture the topic card shows at this leerjaar: its TOPIC_GAME line when that game plays one of the
 * topic's choices there, else the first calm game (registry order) that does, else any game that does; null when no
 * game plays the topic there (the card shows its Oefenmodus picture). Since games reach many topics up to leerjaar 6
 * (2026-11-15), most topics get a game picture without a line of their own.
 */
export function topicGameOf(data: EenvoudigData, grade: Leerjaar, topicId: string): Skin | null {
    const preferred = TOPIC_GAME[topicId] ? skinById(TOPIC_GAME[topicId]) : null;
    if (playable(preferred) && playsTopic(data, grade, topicId, preferred)) return preferred;
    const ready = SKINS.filter(playable);
    return ready.find(s => !s.meta.timed && playsTopic(data, grade, topicId, s))
        ?? ready.find(s => playsTopic(data, grade, topicId, s)) ?? null;
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

export type GameGroupId = 'rustig' | 'tijd' | 'samen' | 'zoeken';
export const GAME_GROUPS: readonly { id: GameGroupId; label: string }[] = [
    { id: 'rustig', label: 'Rustig spelen' },
    { id: 'tijd', label: 'Op tijd' },
    { id: 'samen', label: 'Samen spelen' },
    { id: 'zoeken', label: 'Zoeken en koppelen' },
];

// The category comes from the skin's meta: a board round, else a fixed two-player game, else timed, else calm (Kasteel 1-2 is timed, so "Op tijd").
export const gameGroupOf = (meta: Skin['meta']): GameGroupId =>
    meta.input === 'board' ? 'zoeken' : meta.players === 2 ? 'samen' : meta.timed ? 'tijd' : 'rustig';

/** The games by category (empty ones left out); inside a category gamesFor's order holds, so in-season games lead. */
export const groupGames = (games: GameCardOf[]) =>
    GAME_GROUPS.map(g => ({ ...g, games: games.filter(x => gameGroupOf(x.skin.meta) === g.id) })).filter(g => g.games.length > 0);

/** "Hoofdrekenen · Optellen" → "hoofdrekenen-optellen": the topic's part of its Oefenmodus picture's file name. */
export const topicSlug = (topicId: string) =>
    topicId.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A topic's Oefenmodus picture (an exercise card of that topic), for a card whose topic has no game picture. */
export const oefenThumbOf = (topicId: string) => thumbOf(`oefen-${topicSlug(topicId)}`);
