import type { BreukSpel } from './breukPack';

// "Hoe los ik dit op?" for a breuken question (owner wording): one short tip above the kiosk's steps.
export const BREUK_TIPS: Readonly<Record<BreukSpel, string>> = {
    herkennen: 'Tel alle stukken: dat is de noemer. Tel de gekleurde: dat is de teller.',
    gelijkwaardig: 'Deel teller en noemer door hetzelfde getal.',
    vereenvoudig: 'Deel teller en noemer door hetzelfde getal.',
    gelijknamig: 'Kijk naar de noemer.',
    vergelijken: 'Maak ze gelijknamig, of kijk naar het deel van een pizza.',
};
