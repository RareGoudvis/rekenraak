// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within, act } from '@testing-library/react';
import { existsSync, statSync } from 'node:fs';
import OefenApp from '../oefenen/OefenApp';
import { gameBlurb, GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import GameThumb from '../oefenen/spelen/GameThumb';
import { TOPIC_GAME, gamesFor, groupGames, topicCardOf, topicGameOf, topicHasGame, topicSlug } from '../oefenen/zelf/topicGames';
import { choicesFor, usableVariants } from '../oefenen/zelf/zelfSessie';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { NUMBER_CONTENT, skinsFor } from '../oefenen/spelen/accepts';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { pickerToday } from '../oefenen/spelen/seasons';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../config/eenvoudig/nav';
import { LEERJAREN } from '../config/gradePresets';
import KidBackdrop from '../oefenen/kiosk/KidBackdrop';
import { sceneOf } from '../oefenen/kiosk/backdrops';
import { resetKiosk } from './helpers/oefenKiosk';

const JULY = new Date(Date.UTC(2026, 6, 1, 12));
const KERST = new Date(Date.UTC(2026, 11, 20, 12));

beforeEach(() => {
    resetKiosk();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Zelf oefenen start: leerjaar bar', () => {
    test('first visit: Kies je leerjaar, the topics out of reach; a pick opens them and is remembered', async () => {
        const { unmount } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.getByRole('heading', { name: 'Kies je leerjaar' })).toBeTruthy();
        const optellen = () => within(screen.getByRole('region', { name: 'Hoofdrekenen' })).getByRole('button', { name: 'Optellen' }) as HTMLButtonElement;
        expect(optellen().disabled).toBe(true);
        for (let g = 1; g <= 6; g++) expect(screen.getByRole('button', { name: `Leerjaar ${g}` }).getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 4' }));
        expect(screen.getByRole('button', { name: 'Leerjaar 4' }).getAttribute('aria-pressed')).toBe('true');
        expect(optellen().disabled).toBe(false);
        expect(screen.queryByRole('heading', { name: 'Kies je leerjaar' })).toBeNull();
        expect(localStorage.getItem(GRADE_KEY)).toBe('4');
        unmount();
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.getByRole('button', { name: 'Leerjaar 4' }).getAttribute('aria-pressed')).toBe('true');
    });

    test('a broken remembered value is ignored', async () => {
        localStorage.setItem(GRADE_KEY, '9');
        render(<OefenApp />);
        expect(await screen.findByRole('heading', { name: 'Kies je leerjaar' })).toBeTruthy();
    });
});

describe('Topic cards: the config', () => {
    let data: EenvoudigData;
    beforeAll(async () => { data = await loadEenvoudigData(); });
    const topics = EENVOUDIG_NAV.flatMap(sec => sec.topics);

    test('every topic → game line is a real topic and game, and shows wherever it plays one of the topic choices', () => {
        for (const [topic, skinId] of Object.entries(TOPIC_GAME)) {
            expect(topics.some(t => t.id === topic), topic).toBe(true);
            const skin = skinById(skinId)!;
            expect(skin, skinId).toBeTruthy();
            let shownWithGame = 0;
            for (const grade of LEERJAREN) {
                if (!usableVariants(data, grade).has(topic)) continue;
                const playable = choicesFor(data, grade, topic).filter(c => choiceCanPlay(c, grade));
                const fitsOne = playable.some(c => skinsFor([skin], spelContentOf(c, grade)!).length > 0);
                if (fitsOne) { shownWithGame++; expect(topicGameOf(data, grade, topic)).toBe(skin); }
            }
            expect(shownWithGame, topic).toBeGreaterThan(0);
        }
    });

    test('a topic that plays a game at a leerjaar shows a game picture there, and that game plays one of its choices', () => {
        for (const t of topics) for (const g of LEERJAREN) {
            if (!usableVariants(data, g).has(t.id)) continue;
            const game = topicGameOf(data, g, t.id);
            expect({ topic: t.id, g, picture: !!game }).toEqual({ topic: t.id, g, picture: topicHasGame(data, g, t.id) });
            if (game) {
                const plays = choicesFor(data, g, t.id).filter(c => choiceCanPlay(c, g)).some(c => skinsFor([game], spelContentOf(c, g)!).length > 0);
                expect({ topic: t.id, g, game: game.meta.id, plays }).toMatchObject({ plays: true });
            }
        }
    });

    test('every topic that shows has its Oefenmodus picture, small enough', () => {
        const shown = new Set(LEERJAREN.flatMap(g => [...usableVariants(data, g).keys()]));
        expect(shown.size).toBeGreaterThan(20);
        for (const id of shown) {
            const file = `public/spelen/thumbs/oefen-${topicSlug(id)}.webp`;
            expect(existsSync(file), file).toBe(true);
            expect(statSync(file).size, file).toBeLessThan(25 * 1024);
        }
        expect(topicSlug('Hoofdrekenen · Optellen')).toBe('hoofdrekenen-optellen');
        expect(topicSlug('Vergelijken, ordenen, afronden')).toBe('vergelijken-ordenen-afronden');
    });

    test('the card per leerjaar: a game picture where it fits, else the Oefenmodus picture; the controller only with a game', () => {
        expect(topicCardOf(data, 2, 'Hoofdrekenen · Optellen')).toMatchObject({ game: { meta: { id: 'ballonnen' } }, hasGame: true });
        // Since games reach leerjaar 6 (2026-11-15), Optellen at L4 has a game too.
        expect(topicCardOf(data, 4, 'Hoofdrekenen · Optellen')).toMatchObject({ hasGame: true });
        // The picture and the controller always go together.
        for (const topic of ['Geld', 'Meten en herleiden', 'Figuren']) for (const g of [2, 4, 6] as const) {
            const card = topicCardOf(data, g, topic);
            expect({ topic, g, picture: !!card.game }).toEqual({ topic, g, picture: card.hasGame });
        }
        expect(topicCardOf(data, 4, 'Breuken')).toMatchObject({ game: { meta: { id: 'pakjesband' } }, hasGame: true });
        // No leerjaar yet: any leerjaar counts.
        expect(topicCardOf(data, null, 'Klok en kalender')).toMatchObject({ game: { meta: { id: 'zeehond' } }, hasGame: true });
    });

    test('the games bar order: in season first, then calm, then timed', () => {
        const rank = (g: { skin: { meta: { timed: boolean } }; nu: boolean }) => (g.nu ? 0 : g.skin.meta.timed ? 2 : 1);
        const july = gamesFor(NUMBER_CONTENT, JULY);
        expect(july.map(rank)).toEqual([...july.map(rank)].sort());
        expect(july.some(g => g.nu)).toBe(false);
        // The Speelgoedfabriek is year-round (2026-11-15): Kerst is the first season with a game in this list.
        const dec = gamesFor(NUMBER_CONTENT, KERST);
        expect(dec[0]).toMatchObject({ nu: true, skin: { meta: { id: 'kerstboom' } } });
        expect(gamesFor(null, JULY)).toEqual([]);
    });
});

describe('Topic cards and the Keuze screen', () => {
    const card = (section: string, name: string) => within(screen.getByRole('region', { name: section })).getByRole('button', { name });
    const sp = () => useSpelStore.getState();
    beforeEach(() => {
        sp().otherGame();
        sp().takePickerAt();
        window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
    });

    test('picture cards: a game screenshot or the Oefenmodus one, the stickers, the name as the whole button name', async () => {
        localStorage.setItem(GRADE_KEY, '2');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.queryByRole('region', { name: 'Speel meteen' })).toBeNull();
        const optellen = card('Hoofdrekenen', 'Optellen');
        expect(optellen.querySelector('img')!.getAttribute('src')).toMatch(/thumbs\/ballonnen\.webp$/);
        expect(optellen.querySelector('.zelf-topic-mark.is-game')!.getAttribute('title')).toBe('Er zijn spelletjes');
        expect(optellen.querySelector('.zelf-topic-mark.is-oefen')!.getAttribute('title')).toBe('Je kan oefenen');
        expect(optellen.getAttribute('aria-describedby')).toBeTruthy();
        // Geld: a game picture when a game plays one of its L2 choices (geld teruggeven, 2026-11-15), else its Oefenmodus picture.
        const geld = card('Meten', 'Geld');
        const geldCard = topicCardOf(await loadEenvoudigData(), 2, 'Geld');
        expect(geld.querySelector('img')!.getAttribute('src')).toMatch(geldCard.game ? new RegExp(`thumbs/${geldCard.game.meta.id}\\.webp$`) : /thumbs\/oefen-geld\.webp$/);
        expect(!!geld.querySelector('.zelf-topic-mark.is-game')).toBe(geldCard.hasGame);
        expect(geld.querySelector('.zelf-topic-mark.is-oefen')).not.toBeNull();
        // A kids' page: no R badge or "Zelf oefenen" title, only the leerjaar tiles.
        expect(document.querySelector('.kiosk-start-brand, .zelf-years-logo')).toBeNull();
        expect(screen.queryByText('Zelf oefenen')).toBeNull();
    });

    test('Optellen L2: Automatiseren, then exactly the games that accept the choice; a card starts that game with it', async () => {
        localStorage.setItem(GRADE_KEY, '2');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(card('Hoofdrekenen', 'Optellen'));
        expect(screen.queryByRole('region', { name: 'Automatiseren' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Met brug' }));
        expect(screen.getByRole('region', { name: 'Automatiseren' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Begin met oefenen/ })).toBeTruthy();
        const data = await loadEenvoudigData();
        const choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen', 100).find(c => c.label === 'Met brug')!;
        const want = groupGames(gamesFor(spelContentOf(choice, 2), pickerToday())).flatMap(g => g.games.map(x => x.skin.meta.label));
        const row = within(screen.getByRole('region', { name: 'Of speel een spel' })).getByRole('group', { name: 'Kies een spel' });
        const shown = within(row).getAllByRole('button').map(b => b.querySelector('.zelf-play-title')!.textContent);
        expect(shown).toEqual(want);
        expect(shown).toContain('Honingraat');
        expect(row.querySelector('img')!.getAttribute('src')).toMatch(/spelen\/thumbs\/\w+\.webp$/);
        fireEvent.click(within(row).getByRole('button', { name: 'Ballonnen' }));
        expect(sp().phase).toBe('play');
        expect(sp().meta!.id).toBe('ballonnen');
        expect(sp().from).toMatchObject({ grade: 2, topicId: 'Hoofdrekenen · Optellen', choice: { key: choice.key } });
        expect(sp().question!.text).toMatch(/\+/);
        // Ander spel: back on the Keuze screen of that choice.
        act(() => sp().otherGame());
        expect(await screen.findByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Met brug' }).getAttribute('aria-pressed')).toBe('true');
    });

    test('a game with options shows its options screen (with its picture) first; Ander spel there returns to the Keuze screen', async () => {
        localStorage.setItem(GRADE_KEY, '3');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(card('Hoofdrekenen', 'Vermenigvuldigen'));
        fireEvent.click(screen.getByRole('button', { name: 'Keer 10 en 100' }));
        fireEvent.click(screen.getByRole('button', { name: /^Voetbal/ }));
        expect(sp().phase).toBe('idle');
        expect(screen.getByRole('heading', { name: 'Voetbal' })).toBeTruthy();
        expect(document.querySelector('.spel-options-thumb img')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Ander spel/ }));
        expect(screen.getByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^Voetbal/ }));
        fireEvent.click(screen.getByRole('button', { name: '5 minuten' }));
        fireEvent.click(screen.getByRole('button', { name: /Start/ }));
        expect(sp().meta).toMatchObject({ id: 'voetbal', round: { seconds: 300 } });
        expect(sp().from!.choice.label).toBe('Keer 10 en 100');
    });

    test('no games bar for content without games', async () => {
        localStorage.setItem(GRADE_KEY, '2');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(card('Meten', 'Geld'));
        fireEvent.click(screen.getByRole('button', { name: 'Geld tellen' }));
        expect(screen.getByRole('region', { name: 'Automatiseren' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Of speel een spel' })).toBeNull();
        expect(screen.queryByRole('group', { name: 'Kies een spel' })).toBeNull();
    });

    test('the thumbnail; a missing picture leaves the icon on its colour', () => {
        const { container } = render(<GameThumb skin={skinById('zombies')!} />);
        const img = container.querySelector('img')!;
        expect(img.getAttribute('src')).toMatch(/spelen\/thumbs\/zombies\.webp$/);
        expect(container.querySelector('.zelf-play-thumb svg')).not.toBeNull();
        fireEvent.error(img);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.zelf-play-thumb svg')).not.toBeNull();
    });

    test('every game line is short and without an em dash', () => {
        for (const line of Object.values(GAME_BLURB)) {
            expect(line.length).toBeLessThanOrEqual(80);
            expect(line).not.toMatch(/—/);
        }
        expect(gameBlurb('nieuwspel', 'Nieuw spel')).toBe('Nieuw spel');
        for (const s of SKINS) expect(GAME_BLURB[s.meta.id], s.meta.id).toBeTruthy();
    });
});

describe('Zelf oefenen start: bundle', () => {
    // The cards show labels, icons and thumbnails only: no game component may load with the start page.
    const sources = import.meta.glob('../oefenen/zelf/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

    test('the zelf files never import a skin component, only the registry', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(3);
        for (const [file, src] of Object.entries(sources)) {
            const imports = [...src.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
            const skin = imports.filter(p => /spelen\/(skins|board)\//.test(p) && !/skins\/registry$/.test(p));
            expect({ file, skin }).toEqual({ file, skin: [] });
        }
    });

    test('the registry holds its components lazily, so importing it loads no game', () => {
        const lazy = Symbol.for('react.lazy');
        for (const s of SKINS) {
            const parts = [s.Component, s.Screen, s.Ending].filter(Boolean) as unknown as { $$typeof: symbol }[];
            expect(parts.length).toBeGreaterThan(0);
            for (const c of parts) expect(c.$$typeof).toBe(lazy);
        }
    });
});

describe('Leerjaar scenes', () => {
    test('one scene per leerjaar; no leerjaar keeps the sky and hill', () => {
        for (let g = 1; g <= 6; g++) expect(sceneOf(g)).not.toBeNull();
        for (const g of [undefined, null, 0, 7]) expect(sceneOf(g)).toBeNull();
        const { container, rerender } = render(<KidBackdrop clouds={false} />);
        expect(container.querySelector('.kid-hill')).not.toBeNull();
        rerender(<KidBackdrop clouds={false} grade={3} />);
        const bd = container.querySelector('.kid-backdrop')!;
        expect(bd.className).toContain('ks-3');
        expect(bd.getAttribute('aria-hidden')).toBe('true');
        expect(container.querySelector('.kid-hill')).toBeNull();
    });

    test('the topics screen follows the leerjaar bar', async () => {
        const { container } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(container.querySelector('.kid-backdrop.is-theme')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 5' }));
        expect(container.querySelector('.kid-backdrop.ks-5')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 2' }));
        expect(container.querySelector('.kid-backdrop.ks-2')).not.toBeNull();
    });
});
