// One line per game for the "Je kan ook spelen!" sheet on the leerjaar screen, keyed by skin id (skins/registry.ts).
// A game missing here shows its name, so a new skin never breaks the sheet.

export const GAME_BLURB: Record<string, string> = {
    pinguintoren: 'Bouw een toren voor de pinguïn. Elk juist antwoord is een blok erbij.',
    ballonnen: 'Prik de ballon met het juiste antwoord.',
    zeehond: 'Geef de zeehond met het juiste antwoord een visje.',
    zombies: 'Hou de zombies tegen met juiste antwoorden en red iedereen.',
    bom: 'Haal de draadjes los voor de tijd op is. Elk juist antwoord helpt.',
    bever: 'Help de bever. Juiste antwoorden houden het water achter de dam.',
    race: 'Rij naar de finish. Elk juist antwoord geeft gas.',
    touwtrekken: 'Speel met z\'n tweeën. Wie juist antwoordt, trekt aan het touw.',
    hartjes: 'Draai de hartjes om en zoek een som met haar antwoord.',
    honingraat: 'Zoek in de honingraat alle sommen die het getal maken.',
    prent: 'Elk juist antwoord draait een tegel om. Welk dier zit eronder?',
    schatkist: 'Vind de cijfers van de code en open de schatkist.',
    pakjesband: 'Gooi het juiste pakje door de schoorsteen.',
    kerstboom: 'Versier de kerstboom. Elk juist antwoord hangt er iets bij.',
    eieren: 'Zoek het ei met het juiste antwoord in het gras.',
    mollen: 'Mep de mol met het juiste antwoord, snel!',
};

/** The game's line; an unknown id falls back to its name. */
export const gameBlurb = (id: string, label: string) => GAME_BLURB[id] ?? label;
