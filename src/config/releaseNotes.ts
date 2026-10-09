// "Wat is er nieuw" — the teacher-facing release notes, newest entry FIRST. The newest
// entry's version is the banner's seen-key (version.ts), so a new entry re-shows the banner
// for everyone; adding items to the newest entry does not. Pure data: the modal seeds an
// example the way a sidebar click at that leerjaar would (seedLeafConstraints).
import type { Leerjaar } from './gradePresets';

export type ReleaseKind = 'nieuw' | 'gewijzigd' | 'opgelost';

export interface ReleaseExample {
    leafId: string;                              // an APP_STRUCTURE leaf id (tested)
    constraints?: Record<string, unknown>;       // on top of the leaf's defaultConstraints
    grade?: Leerjaar;                            // seed the example as if this leerjaar was picked
    count?: number;                              // exercises in the live preview; default 1
    height?: number;                             // preview box height in px; default 130
    before?: string;                             // "Eerst: …"
    after?: string;                              // "Nu: …"
}

export interface ReleaseItem {
    kind: ReleaseKind;
    text: string;                                // ≤ 2 short lines, a teacher's words; write 1\u00a0000 so a number never splits
    example?: ReleaseExample;
}

export interface ReleaseNote {
    version: string;
    date: string;                                // 'YYYY-MM' or 'YYYY-MM-DD'
    summary: string;                             // the one line inside the banner
    items: ReleaseItem[];
}

export const RELEASE_NOTES: readonly ReleaseNote[] = [
    {
        version: '1.1.0',
        date: '2026-11',
        summary: 'Elke oefening blijft nu binnen het maximum dat je kiest.',
        items: [
            {
                kind: 'nieuw',
                text: 'Oefenmodus: kies een paar soorten oefeningen en deel een link of QR-code. Je leerlingen oefenen op hun eigen toestel, en de resultaten blijven op dat toestel.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: de leerling antwoordt op de oefening zelf (aantikken, vakjes invullen, in volgorde zetten). Je kiest 1 of 2 kansen.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: de leerling legt geld en MAB-blokjes uit een bakje en sleept klokwijzers, kwik, weegschaalwijzer en hoekbeen.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: bij cijferen aftrekken heeft het toetsenbord een Lenen-knop die de kolom voor de leerling inwisselt.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: zoek een oefening of filter op leerjaar, dupliceer een oefensessie, en zie bij het delen in één oogopslag aantal, tijd, toets en kansen.',
            },
            {
                kind: 'gewijzigd',
                text: 'Oefenmodus: bij breuken telt elk gelijkwaardig antwoord (26/8 = 3 1/4). Per soort kies je “Enkel de gevraagde vorm” als de vorm de opdracht is.',
            },
            {
                kind: 'gewijzigd',
                text: 'Oefenmodus: in testmodus ziet de leerling de resultaten pas op het einde. Bewerk je een gedeelde sessie, dan krijgt ze een nieuwe link.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: instellingen die geen oefeningen opleveren (bv. een klok zonder tijdstype) zie je nu rood in de bouwer; de sessie stopt er niet meer op.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: bij Willekeurig zonder “zelfde soort na elkaar” komt nooit twee keer dezelfde soort na elkaar.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: de leerling ziet een melding als het toestel de resultaten niet kan bewaren, en Tab verlaat het cijferrooster.',
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus (bèta): zet oefeningen, een klok, timer, getallenlijn en meer op het digibord. Via de knop Bordmodus of op rekenraak.be/bord.html.',
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus: teken rechte lijnen, pijlen en stippellijnen, en rechthoeken, ellipsen en driehoeken. Shift geeft 45°-hoeken, een vierkant of een cirkel.',
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus: leg een lat, geodriehoek of passer op het bord. Ze klikken vast, de pen tekent er recht langs en de passer tekent echte cirkels.',
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus: elk hulpmiddel is instelbaar via het tandwiel (timer, klok, dobbelsteen, …). Bewaar je instellingen als je eigen standaard.',
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus: kies een achtergrond (ruitjes, lijnen, schrijflijnen, …) met een voorbeeld van elke keuze, op een licht of donker bord.',
            },
            {
                kind: 'nieuw',
                text: 'Kan een instelling niet, dan zie je onder Genereer een melding. Vroeger kreeg je stilletjes andere oefeningen.',
            },
            {
                kind: 'nieuw',
                text: 'Delen met rest heeft een “Maximum deeltal” dat het leerjaar volgt: tot 100 in leerjaar 2, tot 1\u00a0000 vanaf leerjaar 3.',
                example: {
                    leafId: 'hr-std-delen-nat', constraints: { multiplicationMode: 'met_rest' }, grade: 2, count: 4,
                    before: '890 : 7 in leerjaar 2', after: 'deeltal hoogstens 100',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Plaatswaarde en vergelijken starten met gehele getallen; kommagetallen komen pas vanaf leerjaar 4. In leerjaar 1 kies je nu “Tot 20”.',
                example: {
                    leafId: 'vergelijken-getallen', grade: 1, count: 4,
                    before: 'kommagetallen, minstens tot 100', after: 'gehele getallen tot 20',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Schattend rekenen en Controleren: ook de uitkomst blijft onder het maximum.',
                example: {
                    leafId: 'schattend-nat', grade: 3, count: 2,
                    before: 'de uitkomst kon boven 1\u00a0000 komen', after: 'ook de uitkomst hoogstens 1\u00a0000',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Rekenvolgorde: elk antwoord en elke tussenuitkomst blijft onder het maximum, ook met 3 of 4 bewerkingen.',
                example: {
                    leafId: 'handig-rekenvolgorde', constraints: { opsCount: 3, maxGetal: 100 }, grade: 4, count: 4,
                    after: 'elke stap hoogstens 100',
                },
            },
            {
                kind: 'opgelost',
                text: 'Gemengd hoofdrekenen houdt zich aan het maximum, ook bij × en :.',
                example: {
                    leafId: 'hr-std-gemengd-nat', grade: 1, count: 6,
                    before: '4 × 10 = 40 bij “Tot 20”', after: 'alles hoogstens 20',
                },
            },
            {
                kind: 'opgelost',
                text: 'Getallenassen en getallenrijen lopen niet meer voorbij het maximum.',
                example: {
                    leafId: 'getalbegrip-getallenassen-nat', grade: 1,
                    before: 'een as tot 25 bij “Tot 20”', after: 'de as blijft binnen 0 tot 20',
                },
            },
            {
                kind: 'opgelost',
                text: 'Cijferen ×: kommagetal × kommagetal rekent exact en het rooster klopt. Past de getalopbouw niet, dan blijft het onder het maximum, met een melding.',
                example: {
                    leafId: 'cijferen-vermenigvuldigen-dec', constraints: { maxRange: 100, decimalPlaces: 2, operand1Mask: { E: true, t: true }, scaffolding: 1 }, grade: 5, height: 220,
                    before: 'de tussenrijen in het rooster klopten niet altijd', after: 'exacte tussenrijen, komma op de juiste plaats',
                },
            },
            {
                kind: 'opgelost',
                text: 'Verbanden (breuk · kommagetal · procent): eenzelfde waarde komt niet meer twee keer voor in één tabel.',
                example: {
                    leafId: 'verbanden-tabel', grade: 5, count: 4, height: 180,
                    before: '90 % én 0,9 in dezelfde tabel', after: 'elke waarde één keer',
                },
            },
            {
                kind: 'opgelost',
                text: 'Breuken optellen en aftrekken bleef bij een kleine noemer soms hangen.',
                example: { leafId: 'hr-std-optellen-rat', grade: 4, count: 4 },
            },
        ],
    },
];

export const KIND_ORDER: readonly ReleaseKind[] = ['nieuw', 'gewijzigd', 'opgelost'];
