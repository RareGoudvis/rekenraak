// The Eenvoudig card mode's navigation: sections and topics in the agreed learning order.
// Pure data (no React) so the store, panels and tests can all read it.

export type EenvoudigAccent = 'getallenkennis' | 'bewerkingen' | 'metendrekenen' | 'meetkunde' | 'vraagstukken';

export interface EenvoudigTopic {
    // Also the `topic` key in cards.json, so card lookup needs no second table.
    id: string;
    // "Hoofdrekenen · Optellen" shows as "Optellen" under its section.
    label: string;
    // False for the combination builder: it makes its own blocks and has no cards.
    hasCards: boolean;
}

export interface EenvoudigSection {
    name: string;
    accent: EenvoudigAccent;
    topics: EenvoudigTopic[];
}

export const COMBO_TOPIC_ID = 'Hoofdrekenen · Combinatie';

const topic = (id: string): EenvoudigTopic => ({ id, label: id.split(' · ').pop() as string, hasCards: true });
const combo = (): EenvoudigTopic => ({ id: COMBO_TOPIC_ID, label: 'Combinatie', hasCards: false });

export const EENVOUDIG_NAV: EenvoudigSection[] = [
    {
        name: "Getallen", accent: "getallenkennis",
        topics: [
            topic("Tellen en getallenrijen"),
            topic("Getallen lezen en plaatswaarde"),
            topic("Vergelijken, ordenen, afronden"),
            topic("Splitsen"),
            topic("Deelbaarheid"),
            topic("Negatieve getallen"),
            topic("Breuken"),
            topic("Kommagetallen en procenten"),
        ],
    },
    {
        name: "Hoofdrekenen", accent: "bewerkingen",
        topics: [
            topic("Hoofdrekenen · Optellen"),
            topic("Hoofdrekenen · Aftrekken"),
            topic("Hoofdrekenen · Maaltafels"),
            topic("Hoofdrekenen · Deeltafels"),
            topic("Hoofdrekenen · Vermenigvuldigen"),
            topic("Hoofdrekenen · Delen"),
            combo(),
        ],
    },
    {
        name: "Cijferen", accent: "bewerkingen",
        topics: [
            topic("Cijferen · Optellen"),
            topic("Cijferen · Aftrekken"),
            topic("Cijferen · Vermenigvuldigen"),
            topic("Cijferen · Delen"),
        ],
    },
    {
        name: "Slim rekenen", accent: "bewerkingen",
        topics: [
            topic("Handig rekenen"),
            topic("Schatten en controleren"),
        ],
    },
    {
        name: "Meten", accent: "metendrekenen",
        topics: [
            topic("Klok en kalender"),
            topic("Geld"),
            topic("Meten en herleiden"),
            topic("Omtrek en oppervlakte"),
        ],
    },
    {
        name: "Meetkunde", accent: "meetkunde",
        topics: [
            topic("Lijnen en hoeken"),
            topic("Figuren"),
        ],
    },
    {
        name: "Bladonderdelen", accent: "vraagstukken",
        topics: [
            topic("Indeling"),
            topic("Schrijven en tekenen"),
            topic("Kaders"),
        ],
    },
];

export const TOPIC_BY_ID: Record<string, EenvoudigTopic> =
    Object.fromEntries(EENVOUDIG_NAV.flatMap(s => s.topics).map(t => [t.id, t]));
