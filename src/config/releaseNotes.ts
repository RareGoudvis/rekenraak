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
                kind: 'opgelost',
                text: 'Cijferen optellen: in de oplossing staat het onthoudcijfer nu boven de kolom waar het bij hoort, zoals de leerling het schrijft.',
                example: {
                    leafId: 'cijferen-optellen-nat', constraints: { maxRange: 1000, bridges: { E: 'REQUIRED' } }, grade: 3, count: 2,
                    before: 'de 1 stond een kolom te ver naar rechts', after: 'de 1 boven de tientallen',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Cijferen vermenigvuldigen: de deelproducten staan in de oplossing nu in de volgorde waarin je ze schrijft (eerst × eenheden).',
                example: {
                    leafId: 'cijferen-vermenigvuldigen-nat', grade: 5, count: 2,
                    before: '× tientallen bovenaan', after: '× eenheden bovenaan',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Cijferen: een brug of getalopbouw die niet kan (bv. een brug op de hoogste plaats), geeft nu minder of geen oefeningen met een melding, geen andere sommen.',
            },
            {
                kind: 'opgelost',
                text: 'Cijferen delen met kommagetallen: deeltal en deler staan nu exact in het rooster (0,7 was “1”) en het quotiënt krijgt genoeg vakjes.',
                example: {
                    leafId: 'cijferen-delen-dec', constraints: { operand1Mask: { t: true }, scaffolding: 1 }, grade: 6, count: 2,
                    before: '0,7 werd “1”', after: '0,7 staat er zoals het is',
                },
            },
            {
                kind: 'gewijzigd',
                text: 'Delen (andere delers): de quotiënten zijn nu gespreid over het hele bereik; vroeger was meer dan de helft “: iets = 1”.',
                example: {
                    leafId: 'hr-std-delen-nat', constraints: { multiplicationMode: 'andere', maxGetal: 1000 }, grade: 4, count: 4,
                    before: 'meestal quotiënt 1', after: 'quotiënten over het hele bereik',
                },
            },
            {
                kind: 'opgelost',
                text: 'Klok in woorden: “5 voor half 2” en “5 over half 2” zoals in de klas; vroeger stond er “25 over 1”.',
                example: { leafId: 'klok-analoog-lezen', constraints: { timeTypes: ['nauwkeurig_5'] }, grade: 3, count: 2, before: '“25 over 1”', after: '“5 voor half 2”' },
            },
            {
                kind: 'opgelost',
                text: 'Getallen in woorden krijgen een spatie na “duizend”: “duizend tweehonderd”.',
                example: { leafId: 'splitsen-positietabel', grade: 4, count: 2, before: '“duizendtweehonderd”', after: '“duizend tweehonderd”' },
            },
            {
                kind: 'gewijzigd',
                text: 'Kettingsommen: alleen het startgetal staat er, de leerling rekent de hele ketting. “Tussenresultaten tonen” zet ze terug.',
                example: { leafId: 'patronen-kettingsommen', grade: 3, count: 2, before: 'elke tussenuitkomst gedrukt', after: 'enkel het startgetal' },
            },
            {
                kind: 'opgelost',
                text: 'Veelvouden: zes verschillende reeksen in plaats van zes keer dezelfde. Kalender “rekenen met dagen” en “datumnotatie” starten met 4 oefeningen.',
                example: { leafId: 'deelbaarheid-veelvouden', grade: 4, count: 3, before: 'zes keer “veelvouden van 9”', after: 'elke rij een eigen reeks' },
            },
            {
                kind: 'opgelost',
                text: 'Oplossingen: breuken met uitkomst een geheel getal tonen “6”, niet “6/1”; afronden op tienden toont “56,0”; ordenen schrijft duizendtallen met een spatie.',
                example: { leafId: 'hr-std-delen-rat', grade: 5, count: 2, before: '“= 6/1”', after: '“= 6”' },
            },
            {
                kind: 'opgelost',
                text: 'Oplossingen: breuken kleuren toont de ingekleurde delen, de te tekenen klokwijzers zijn rood, en de rest bij delen met kommagetallen is exact.',
                example: { leafId: 'breuken-kleuren', grade: 3, count: 2, before: 'sleutel leeg', after: 'delen ingekleurd' },
            },
            {
                kind: 'opgelost',
                text: 'Compenseren: de tussenstap verschijnt alleen bij een som die er om vraagt (385 − 29), niet meer bij 385 − 30.',
                example: { leafId: 'hr-std-aftrekken-nat', constraints: { preset: 'compenseren' }, grade: 3, count: 2, before: '“385 − 30 = 385 − 30 + 0”', after: 'geen tussenstap' },
            },
            {
                kind: 'gewijzigd',
                text: 'Oefenmodus: herleidingen met “eenheid schrijven” kan nu op het toestel: getal typen, eenheid tikken. Elke juiste omzetting telt (1 m 20 = 120 cm).',
            },
            {
                kind: 'gewijzigd',
                text: 'Oefenmodus: de kaart toont geen papier-hulp meer (tussenstappen, schrijflijnen), koppen zeggen “Typ …”, en het MAB-bakje telt wat je legde.',
            },
            {
                kind: 'opgelost',
                text: 'Bordmodus: brede hulpmiddelen krimpen in hun kaart, geld wisselen toont een voorbeeldwissel, en Ctrl+P met Mijn bladen open drukt het blad af.',
            },
            {
                kind: 'opgelost',
                text: 'Lange getallen en bedragen breken nergens meer middenin; op 1920 px toont de bovenbalk weer alle knopteksten.',
            },
            {
                kind: 'gewijzigd',
                text: 'Kommagetallen vermenigvuldigen: standaard kommagetal × natuurlijk getal, zoals de minimumdoelen vragen. “Kommagetal × kommagetal” zet je aan als je wil.',
                example: { leafId: 'hr-std-vermenigvuldigen-dec', grade: 5, count: 3, before: '“4,89 × 100,12”', after: '“4,89 × 3”' },
            },
            {
                kind: 'gewijzigd',
                text: 'Meten: elke figuur staat op ware grootte, ook in een smalle kolom. Herleidingen: de sleutel laat nul-delen weg (“71 dl”).',
                example: { leafId: 'lengte-meten', grade: 3, count: 2, before: 'soms verkleind met een nota', after: 'altijd op ware grootte' },
            },
            {
                kind: 'gewijzigd',
                text: 'Klok: “Richting” kiest nu over · voor half · over half · voor, zodat “5 voor half 2” onder de juiste knop zit.',
                example: { leafId: 'klok-analoog-lezen', constraints: { timeTypes: ['nauwkeurig_5'], minuteDirection: 'half-voor' }, grade: 3, count: 2, after: 'enkel :21 tot :29' },
            },
            {
                kind: 'gewijzigd',
                text: 'Kettingsommen: in leerjaar 1 en 2 staan de tussenresultaten erbij, vanaf leerjaar 3 niet meer. Afronden en ordenen houden de nullen (“4,10”).',
                example: { leafId: 'patronen-kettingsommen', grade: 2, count: 2, after: 'tussenresultaten zichtbaar' },
            },
            {
                kind: 'opgelost',
                text: 'Oplossingen: ingekleurde delen zijn rood, geld tekenen toont de munten en biljetten, en de bovenbalk past ook op een smal scherm.',
                example: { leafId: 'geld-tekenen', grade: 2, count: 3, before: 'sleutel herhaalde het bedrag', after: 'munten en biljetten getekend' },
            },
            {
                kind: 'gewijzigd',
                text: 'Herleidingen met “eenheid schrijven”: elke oefening zegt naar welke eenheid (“(in mm)” op papier, “Zet om naar mm” op het toestel). Toggle “Doeleenheid tonen”.',
                example: { leafId: 'herleidingen-lengte', constraints: { writeUnits: true }, grade: 4, count: 2, after: '“53 cm = ____ ____ (in mm)”' },
            },
            {
                kind: 'gewijzigd',
                text: 'Bladen die je met deze versie bewaart of deelt, openen niet meer op de vorige versie van RekenRaak (nieuw bestandsformaat).',
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
