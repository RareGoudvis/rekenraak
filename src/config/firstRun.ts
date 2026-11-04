export type FirstRunModule = 'oefenmodus' | 'bordmodus';

export interface FirstRunContent { title: string; lines: string[]; }

// Content for the once-per-module intro card; keys double as the localStorage suffix.
export const FIRST_RUN: Record<FirstRunModule, FirstRunContent> = {
    oefenmodus: {
        title: 'Welkom bij Oefenmodus',
        lines: [
            'Wat is het? Leerlingen oefenen zelfstandig op hun eigen toestel, via een link of QR-code.',
            'Hoe? Kies oefeningen, stel aantal, volgorde en tijd in en klik op Delen voor de link of QR-code.',
            'Resultaten? Die vind je onder Resultaten op het toestel van de leerling. Er verlaat niets dat toestel.',
        ],
    },
    bordmodus: {
        title: 'Welkom bij Bordmodus',
        lines: [
            'Wat is het? Een digibord-canvas met RekenRaak-blokken en tekengereedschap.',
            'De balk links: tandwiel (achtergrond, raster, bord wissen), je gereedschap, kleur en dikte, ongedaan maken en onderaan Toevoegen.',
            'Elke kaart heeft een titelbalk: Nieuw, Oplossing, Instellingen en Meer (doorzichtig, groter of kleiner, dupliceren, verwijderen).',
            'Rechtsboven bewaar je je bord (Mijn borden) of ga je naar volledig scherm; de pagina-knoppen staan rechtsonder.',
        ],
    },
};
