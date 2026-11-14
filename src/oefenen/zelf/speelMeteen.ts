import type { EenvoudigData } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { skinsFor } from '../spelen/accepts';
import { choiceCanPlay, spelContentOf } from '../spelen/spelQuestion';
import { SKINS, skinById } from '../spelen/skins/registry';
import { seasonsOn } from '../spelen/seasons';
import { choicesFor, type ZelfChoice } from './zelfSessie';

// "Speel meteen": ready-made game + oefening tiles on the Zelf start page, per leerjaar.
// choice = the Zelf choice key after "<leerjaar>|<topic>|" ("met", "t1-5", "c:Analoge klok lezen") or its label.
// A test resolves every line (speelMeteen.test.ts), so a typo or a card change fails there, never on a pupil's screen.
// At most two tiles per game per leerjaar; calm and timed games mixed. Seasonal games jump to the front in season.
export interface SpeelMeteenEntry { skin: string; topic: string; choice: string; title: string }

const OPT = 'Hoofdrekenen · Optellen';
const AFT = 'Hoofdrekenen · Aftrekken';
const MAAL = 'Hoofdrekenen · Maaltafels';
const DEEL = 'Hoofdrekenen · Deeltafels';
const VERM = 'Hoofdrekenen · Vermenigvuldigen';
const DELEN = 'Hoofdrekenen · Delen';
const HANDIG = 'Handig rekenen';
const KLOK = 'Klok en kalender';
const BREUK = 'Breuken';

export const SPEEL_METEEN: Partial<Record<Leerjaar, readonly SpeelMeteenEntry[]>> = {
    1: [
        { skin: 'ballonnen', topic: OPT, choice: 'met', title: 'Ballonnen prikken: + met brug' },
        { skin: 'zeehond', topic: OPT, choice: 'zonder', title: 'Zeehondjes voeren: + zonder brug' },
        { skin: 'bever', topic: AFT, choice: 'met', title: 'Help de bever: − met brug' },
        { skin: 'pinguintoren', topic: AFT, choice: 'zonder', title: 'Pinguïntoren: − zonder brug' },
        { skin: 'mollen', topic: KLOK, choice: 'Klok lezen', title: 'Mollen meppen: de klok' },
        { skin: 'race', topic: OPT, choice: 'alles', title: 'Race: + door elkaar' },
        { skin: 'zombies', topic: AFT, choice: 'alles', title: 'Zombies: − door elkaar' },
        { skin: 'prent', topic: HANDIG, choice: 'Handig optellen', title: 'Verborgen prent: handig optellen' },
        { skin: 'ballonnen', topic: KLOK, choice: 'Klok lezen', title: 'Ballonnen prikken: de klok' },
        { skin: 'pakjesband', topic: OPT, choice: 'zonder', title: 'Pakjesband: + zonder brug' },
        { skin: 'kerstboom', topic: AFT, choice: 'zonder', title: 'Kerstboom versieren: − zonder brug' },
        { skin: 'eieren', topic: OPT, choice: 'met', title: 'Eieren zoeken: + met brug' },
    ],
    2: [
        { skin: 'ballonnen', topic: MAAL, choice: 'alles', title: 'Ballonnen prikken: maaltafels' },
        { skin: 'zombies', topic: MAAL, choice: 't1-5', title: 'Zombies: tafels van 1 tot 5' },
        { skin: 'zeehond', topic: KLOK, choice: 'Klok lezen', title: 'Zeehondjes voeren: de klok' },
        { skin: 'voetbal', topic: OPT, choice: 'met', title: 'Voetbal: + met brug' },
        { skin: 'pinguintoren', topic: AFT, choice: 'met', title: 'Pinguïntoren: − met brug' },
        { skin: 'mollen', topic: DEEL, choice: 'alles', title: 'Mollen meppen: deeltafels' },
        { skin: 'kasteel', topic: AFT, choice: 'alles', title: 'Kasteel: − door elkaar' },
        { skin: 'schatkist', topic: MAAL, choice: 't6-10', title: 'Schatkist: tafels van 6 tot 10' },
        { skin: 'race', topic: OPT, choice: 'alles', title: 'Race: + door elkaar' },
        { skin: 'pakjesband', topic: BREUK, choice: 'Welk deel is gekleurd?', title: 'Pakjesband: welk deel is gekleurd?' },
        { skin: 'kerstboom', topic: DEEL, choice: 't1-5', title: 'Kerstboom versieren: deeltafels tot 5' },
        { skin: 'hartjes', topic: BREUK, choice: 'alles', title: 'Hartjes koppelen: breuken' },
    ],
    3: [
        { skin: 'kasteel', topic: MAAL, choice: 'alles', title: 'Kasteel: tafels door elkaar' },
        { skin: 'pakjesband', topic: BREUK, choice: 'Breuk in een figuur', title: 'Pakjesband: breuken herkennen' },
        { skin: 'voetbal', topic: VERM, choice: 'Keer 10 en 100', title: 'Voetbal: × 10 en × 100' },
        { skin: 'zeehond', topic: KLOK, choice: 'alles', title: 'Zeehondjes voeren: de klok' },
        { skin: 'ballonnen', topic: OPT, choice: 'met', title: 'Ballonnen prikken: + met brug' },
        { skin: 'zombies', topic: DEEL, choice: 'alles', title: 'Zombies: deeltafels' },
        { skin: 'race', topic: AFT, choice: 'met', title: 'Race: − met brug' },
        { skin: 'mollen', topic: KLOK, choice: 'Wijzerklok naar digitaal', title: 'Mollen meppen: wijzerklok naar digitaal' },
        { skin: 'bom', topic: DELEN, choice: 'Delen door 10, 100', title: 'Bom: delen door 10 en 100' },
        { skin: 'prent', topic: HANDIG, choice: 'Compenseren', title: 'Verborgen prent: compenseren' },
        { skin: 'kerstboom', topic: VERM, choice: 'Keer tientallen', title: 'Kerstboom versieren: keer tientallen' },
        { skin: 'honingraat', topic: OPT, choice: 'zonder', title: 'Honingraat: + zonder brug' },
    ],
    4: [
        { skin: 'ballonnen', topic: MAAL, choice: 'alles', title: 'Ballonnen prikken: maaltafels' },
        { skin: 'pakjesband', topic: BREUK, choice: 'Deel van een geheel', title: 'Pakjesband: breuken herkennen' },
        { skin: 'kasteel', topic: DEEL, choice: 'alles', title: 'Kasteel: deeltafels door elkaar' },
        { skin: 'zeehond', topic: BREUK, choice: 'Breuken vergelijken', title: 'Zeehondjes voeren: breuken vergelijken' },
        { skin: 'zombies', topic: MAAL, choice: 't11+', title: 'Zombies: tafels van 11, 12 en 15' },
        { skin: 'race', topic: VERM, choice: 'Hele getallen', title: 'Race: vermenigvuldigen' },
        { skin: 'voetbal', topic: DELEN, choice: 'Door 10, 100, 1000', title: 'Voetbal: delen door 10, 100 en 1000' },
        { skin: 'schatkist', topic: DEEL, choice: 't6-10', title: 'Schatkist: deeltafels van 6 tot 10' },
        { skin: 'bever', topic: MAAL, choice: 't6-10', title: 'Help de bever: tafels van 6 tot 10' },
        { skin: 'bom', topic: MAAL, choice: 't1-5', title: 'Bom: tafels van 1 tot 5' },
        { skin: 'hartjes', topic: BREUK, choice: 'alles', title: 'Hartjes koppelen: breuken' },
        { skin: 'honingraat', topic: BREUK, choice: 'Breuken vergelijken', title: 'Honingraat: gelijke breuken' },
    ],
};

type Skin = (typeof SKINS)[number];

/** A config line made real: the skin, the Zelf choice (as the topic screen offers it) and whether it is in season. */
export interface SpeelMeteenTile { entry: SpeelMeteenEntry; skin: Skin; choice: ZelfChoice; nu: boolean }

// The part of a choice key after "<leerjaar>|<topic>|".
const keyTail = (c: ZelfChoice) => c.key.split('|').slice(2).join('|');

/** The Zelf choice the line names at this leerjaar, when a game plays it and the line's skin accepts that content; else null. */
export function resolveSpeelMeteen(data: EenvoudigData, grade: Leerjaar, e: SpeelMeteenEntry): { skin: Skin; choice: ZelfChoice } | null {
    const skin = skinById(e.skin);
    if (!skin || !(skin.Component || skin.Screen)) return null;
    const choice = choicesFor(data, grade, e.topic).find(c => keyTail(c) === e.choice || c.label === e.choice);
    if (!choice || !choiceCanPlay(choice, grade)) return null;
    const content = spelContentOf(choice, grade);
    return content && skinsFor([skin], content).length ? { skin, choice } : null;
}

/** The tiles for a leerjaar: lines that resolve, in config order, the in-season ones first. */
export function speelMeteenFor(data: EenvoudigData, grade: Leerjaar, today: Date, list = SPEEL_METEEN[grade] ?? []): SpeelMeteenTile[] {
    const now = seasonsOn(today);
    const tiles = list.flatMap(entry => {
        const hit = resolveSpeelMeteen(data, grade, entry);
        return hit ? [{ entry, ...hit, nu: !!hit.skin.meta.season && now.includes(hit.skin.meta.season) }] : [];
    });
    return [...tiles.filter(t => t.nu), ...tiles.filter(t => !t.nu)];
}

/** Before a leerjaar is picked: every game the config uses once, by its name (shown dimmed, out of reach), in-season first. */
export function speelMeteenPreview(today: Date): { skin: Skin; nu: boolean }[] {
    const now = seasonsOn(today);
    const ids = new Set(Object.values(SPEEL_METEEN).flatMap(list => list.map(e => e.skin)));
    const games = SKINS.filter(s => ids.has(s.meta.id)).map(skin => ({ skin, nu: !!skin.meta.season && now.includes(skin.meta.season) }));
    return [...games.filter(g => g.nu), ...games.filter(g => !g.nu)];
}

/** Where a game's thumbnail lives (public/spelen/thumbs/, 16:10). */
export const thumbOf = (skinId: string) => `${import.meta.env.BASE_URL}spelen/thumbs/${skinId}.webp`;
