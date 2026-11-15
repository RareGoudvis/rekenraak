// One line per game for the Speel meteen tiles (tooltip and description) on the leerjaar screen, keyed by skin id (skins/registry.ts).
// A game missing here shows no line, so a new skin never breaks the row.

export const GAME_BLURB: Record<string, string> = {
    pinguintoren: 'Bouw een ijstoren. Bij elk juist antwoord springt de pinguïn een blok hoger.',
    ballonnen: 'Prik de ballon met het juiste antwoord. Tik op de vogel voor een ander land.',
    zeehond: 'Geef de juiste zeehond een visje. Bij Moeilijk drijven de ijsschotsen.',
    zombies: 'Hou de zombies tegen en red iedereen. Makkelijk, Normaal of Moeilijk.',
    bom: 'Maak de bom onschadelijk voor de tijd op is. Een foutje kost 3 seconden.',
    bever: 'Help de bever. Juiste antwoorden houden het water achter de dam.',
    race: 'Tijdrit: race naar de finish. Benzine: rij zo ver je kan en tank onderweg.',
    voetbal: 'Speel een match tegen de zwarte beren. Speel de bal door en scoor!',
    kasteel: 'Schiet met je katapult op het andere kasteel. Alleen of met z\'n tweeën.',
    touwtrekken: 'Speel met z\'n tweeën. Wie juist antwoordt, trekt aan het touw.',
    hartjes: 'Draai de hartjes of voetballen om en zoek een som met haar antwoord.',
    honingraat: 'Zoek alle sommen die het getal maken. Moeilijk: pas op voor de wesp!',
    prent: 'Elk juist antwoord draait een tegel om. Welk grappig dier zit eronder?',
    schatkist: 'Vind de cijfers van de code en open de schatkist. Ook met tijd.',
    pakjesband: 'Stuur het juiste pakje naar de kist. Te veel foutjes en de machine sputtert!',
    kerstboom: 'Versier de kerstboom. Elk juist antwoord hangt er iets bij.',
    eieren: 'Zoek het ei met het juiste antwoord. Er zit een kuikentje in!',
    mollen: 'Mep de mol met het juiste antwoord, snel!',
};

/** The game's line; an unknown id falls back to its name. */
export const gameBlurb = (id: string, label: string) => GAME_BLURB[id] ?? label;
