export type FirstRunModule = 'oefenmodus' | 'bordmodus';

export interface FirstRunContent { title: string; lines: string[]; }

// Content for the once-per-module intro card; keys double as the localStorage suffix.
export const FIRST_RUN: Record<FirstRunModule, FirstRunContent> = {
    oefenmodus: {
        title: 'Welkom bij Oefenmodus',
        lines: [
            'Wat is het? Leerlingen oefenen zelfstandig op hun eigen toestel, via een link of QR-code.',
            'Hoe? Kies oefeningen, stel aantal en timer in en klik op Delen.',
            'Resultaten? Die vind je onder Resultaten op het toestel van de leerling. Er verlaat niets dat toestel.',
        ],
    },
    bordmodus: {
        title: 'Welkom bij Bordmodus',
        lines: [
            'Wat is het? Een digibord-canvas met RekenRaak-blokken en tekengereedschap.',
            'De balk links: je gereedschap, het plusje onderaan voegt iets toe en het tandwiel bovenaan opent de instellingen.',
            'Elke kaart heeft een titelbalk met Instellingen en Meer (een rekenkaart ook met Nieuw en Oplossing); via Meer maak je een kaart doorzichtig.',
        ],
    },
};
