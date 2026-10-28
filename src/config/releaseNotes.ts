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
            // ── 2026-10-28: Geert-fork ports + onechte breuken ──
            {
                kind: 'gewijzigd',
                text: 'Onechte breuken mag je ook als gemengd getal schrijven (7/4 of 1 3/4), op papier en in de Oefenmodus; de oplossing toont beide.',
                example: { leafId: 'breuken-herkennen', constraints: { allowImproper: true }, count: 2, height: 160 },
            },
            {
                kind: 'opgelost',
                text: 'Na het kiezen van een ander lettertype of een andere lettergrootte voor het blad bleef een blok soms onnodig breed staan; het past zich nu meteen aan.',
            },
            {
                kind: 'nieuw',
                text: 'Kies het lettertype van je blad, apart voor tekst, cijfers, titel, opdrachttitels, naamvelden en voettekst (o.a. Andika, Lexend, Atkinson Hyperlegible).',
            },
            {
                kind: 'nieuw',
                text: '“Titel op elke pagina herhalen”: de titel komt ook bovenaan pagina 2, 3, … “Ruimte titel–velden” regelt de afstand bij een gecentreerde titel.',
            },
            {
                kind: 'nieuw',
                text: 'Vormgeving veldlabels (Naam / Klas / Nr / Datum) en vormgeving oefeningen: eigen lettertype, grootte, kleur, vet, cursief, onderstreept.',
            },
            {
                kind: 'nieuw',
                text: 'Plaatswaardetabel: kies zelf welke kolommen (D, H, T, E, t, …) in de tabel staan, los van het maximum.',
                example: { leafId: 'plaatswaarde-tabel', constraints: { maxGetal: 100, tablePlaces: ['D', 'H', 'T', 'E'] }, before: 'kolommen H T E bij “tot 100”', after: 'D H T E, zelf gekozen' },
            },
            {
                kind: 'nieuw',
                text: 'Sjablonen voor pagina-ontwerp (Meer → Pagina-ontwerp sjablonen): bewaar de vormgeving van een blad en pas ze met één klik toe op een ander blad.',
            },
            {
                kind: 'nieuw',
                text: 'MAB tot 9 999: tot negen duizendtallen in de D-kolom, in vierkantjes van vier zodat je sneller telt.',
                example: { leafId: 'mab-tekenen', constraints: { maxNumber: 9999 }, height: 170 },
            },
            {
                kind: 'gewijzigd',
                text: 'MAB: “Oefeningen per rij” staat nu als keuzelijst onder “Aantal oefeningen”; bij herkennen liggen de blokjes in vierkantjes van vier.',
            },
            {
                kind: 'gewijzigd',
                text: '“Koptekst op elke pagina herhalen” heet nu “Naamvelden op elke pagina herhalen” en werkt ook op het scherm, niet enkel op papier.',
            },
            {
                kind: 'opgelost',
                text: 'Herhaalde naamvelden kwamen niet mee op papier; en “Vet” uitzetten bij de titel of de opdracht-titel deed niets.',
            },
            {
                kind: 'opgelost',
                text: 'Plaatswaarde en getallen vergelijken: het maximum zelf kan nu ook voorkomen (“tot 20” kan 20 geven), zoals bij de andere oefeningen.',
                example: { leafId: 'vergelijken-getallen', constraints: { maxGetal: 20 }, count: 3 },
            },
            {
                kind: 'nieuw',
                text: 'Bewaren werkt nu je geopende blad uit Mijn bladen bij in plaats van een kopie te maken. Ook na een herstart van de browser.',
            },
            {
                kind: 'nieuw',
                text: 'In Chrome en Edge bewaar je je wijzigingen terug in hetzelfde .rekenraak-bestand (Meer → Bewaar bestand). Andere browsers downloaden zoals vroeger.',
            },
            {
                kind: 'gewijzigd',
                text: 'Het bolletje bovenaan heet nu “Herstelkopie in browser”, Mijn bladen toont dat het in deze browser bewaard is, en de uitleg over bewaren is herschreven.',
            },
            {
                kind: 'opgelost',
                text: 'Een volle browseropslag meldt nu dat Bewaren mislukt is, in plaats van stil niets te bewaren.',
            },
            {
                kind: 'nieuw',
                text: 'Breuken kleuren: ook onechte breuken (bv. 7/4), getekend over twee figuren. Zet “Ook onechte breuken” aan.',
                example: { leafId: 'breuken-kleuren', constraints: { allowImproper: true }, count: 2, height: 160 },
            },
            {
                kind: 'nieuw',
                text: 'Breuken herkennen: ook onechte breuken; de figuur toont twee gehelen en het antwoord is de onechte breuk (7/4).',
                example: { leafId: 'breuken-herkennen', constraints: { allowImproper: true }, count: 2, height: 160 },
            },
            {
                kind: 'nieuw',
                text: 'Breuken rangschikken: met “Ook onechte breuken” staan er ook breuken groter dan 1 tussen (zoals 5/4).',
                example: { leafId: 'breuken-rangschikken', constraints: { fractionMode: 'gelijknamige', allowImproper: true } },
            },
            {
                kind: 'nieuw',
                text: 'Gelijknamig maken: met “Ook onechte breuken” kunnen de gegeven breuken ook groter dan 1 zijn.',
                example: { leafId: 'breuken-gelijknamig', constraints: { allowImproper: true }, count: 2 },
            },
            {
                kind: 'nieuw',
                text: 'Vereenvoudigen: met “Ook onechte breuken” komen er ook breuken als 10/4 → 5/2.',
                example: { leafId: 'breuken-vereenvoudigen', constraints: { allowImproper: true }, count: 2 },
            },
            {
                kind: 'opgelost',
                text: 'Kommagetallen × of : 10, 100, 1 000: na het omschakelen van een groot maximum kon de oplossing fout afgerond zijn (bv. …910,09999). Nu exact.',
            },
            {
                kind: 'nieuw',
                text: 'Teruggeven: ook tot €1 en tot €2, betaald met een munt van €1 of €2 — voor de jongste groepen.',
                example: { leafId: 'geld-teruggeven', constraints: { minPriceEuros: 0, maxPriceEuros: 1, payWithOptions: [200], centenDeel: 'tien' }, count: 2, height: 200 },
            },
            {
                kind: 'gewijzigd',
                text: 'Teruggeven: het sprongetje (of de lege ruimte) staat nu rechts naast de opgave; met een tekenvak staat het sprongetje er in het midden naast.',
                example: { leafId: 'geld-teruggeven', constraints: { maxPriceEuros: 49, payWithOptions: [5000], antwoordType: 'tekenen-schrijven' }, height: 200 },
            },
            {
                kind: 'opgelost',
                text: 'Teruggeven: is het betaalde bedrag precies de volgende euro (€9,35 met €10), dan tekent het sprongetje nog één boog in plaats van een lege “+ €0”.',
                example: { leafId: 'geld-teruggeven', constraints: { minPriceEuros: 0, maxPriceEuros: 0, payWithOptions: [100] }, before: 'twee bogen, de tweede “+ €0”', after: 'één boog van de prijs naar €1' },
            },
            {
                kind: 'opgelost',
                text: 'Afronden (kommagetallen, rooster): de titel noemt alleen nog de kolommen die er echt zijn, bv. “Rond af op t.” bij 2 decimalen.',
                example: { leafId: 'afronden-dec-rooster', constraints: { decimalPlaces: 2, roundTargets: ['t', 'h'] } },
            },
            {
                kind: 'opgelost',
                text: 'Bordmodus: een breed honderdveld (20 kolommen, grote tekst) schuift niet meer voorbij de rechterrand van het bord, maar krimpt mee.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: bij Analoge klok · lezen zegt de leerling de tijd in woorden (uur, half, voor, over; bij voor/over de minuten of “kwart”). Of uu:mm, per rij.',
                example: { leafId: 'klok-analoog-lezen', before: 'typ 3:15', after: 'kwart over 3' },
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: een sessie zonder limiet en zonder timer heeft nu een knop Stoppen. Na “Ja, stoppen” ziet de leerling meteen het eindscherm. Werkt ook in testmodus.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: andere oefeningen kiezen en opnieuw delen gaf dezelfde link, zodat leerlingen oude resultaten zagen. Elke inhoud krijgt nu een eigen link.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: lange breukantwoorden (bv. 19600/15394639) worden niet meer afgeknipt. Het vak neemt tot 24 tekens en verkleint de tekst zodat je alles ziet.',
                example: { leafId: 'hr-std-delen-rat', constraints: { fractionMultMode: 'decimal_fraction', fractionOrderMode: 'BA', decimalPlaces: 3 } },
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: Gemengd met “Om de beurt” wisselt nu echt af (+, −, ×, :) in plaats van altijd de eerste bewerking te geven.',
                example: { leafId: 'hr-std-gemengd-nat', constraints: { variants: ['+', '-', 'x', ':'], mix: 'cycle' }, count: 4, before: 'altijd +', after: '+ − × : om de beurt' },
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: de verliefde harten werden soms maar half getoond, bv. na een smalle oefening. Nu staat het hart altijd helemaal op de kaart.',
                example: { leafId: 'splitsen-harten' },
            },
            {
                kind: 'opgelost',
                text: 'Getallenassen en getallenrijen tonen altijd minstens twee gegeven getallen, ook in de moeilijke modus, zodat de sprong te vinden is.',
                example: { leafId: 'getalbegrip-getallenassen-nat', constraints: { hardMode: true, ticks: 10 }, before: '50, _, _, _, _, _, _, _, _, _', after: '50, _, _, _, _, _, _, _, 130, _' },
            },
            {
                kind: 'opgelost',
                text: 'Breuken: een gemengd getal is nu echt gemengd, het breukdeel is altijd kleiner dan 1.',
                example: { leafId: 'hr-std-aftrekken-rat', constraints: { mixedNumber1: true, mixedNumber2: true, maxNumerator1: 40, maxDenominator1: 30 }, before: '2 38/27 − … = 17/27', after: '2 11/27 − … = 17/27' },
            },
            {
                kind: 'opgelost',
                text: 'Breuksommen met 3 of 4 termen volgen nu ook “Gemengd (Breuk 1/2)” en “Eén stap gelijknamig maken”.',
                example: { leafId: 'hr-std-optellen-rat', constraints: { termCount: 3, mixedNumber1: true, mixedNumber2: true, fractionDifficulty: 'one_step' }, before: '3/4 + 5/7 + 2/9 = …', after: '2 3/8 + 1 1/4 + 7/4 = 5 3/8' },
            },
            {
                kind: 'opgelost',
                text: 'Tijdsduur: na middernacht stond “(volgende dag)” over de begintijd. Nu staat het klein onder de eindtijd; in Oefenmodus leest de leerling het ook.',
                example: { leafId: 'tijdsduur-berekenen', constraints: { overMidnight: true, blanks: ['duur'] }, count: 2 },
            },
            {
                kind: 'gewijzigd',
                text: 'Gemengd getal ↔ breuk met “Beide”: de opdracht zegt nu “Schrijf als gemengd getal of als breuk.” In Oefenmodus zegt elke oefening wat je typt.',
                example: { leafId: 'breuken-gemengd', constraints: { direction: 'beide' }, before: 'Schrijf als gemengd getal.', after: 'Schrijf als gemengd getal of als breuk.' },
            },
            {
                kind: 'gewijzigd',
                text: 'Kommagetallen × en : : de keuze “Aantal factoren” is weg. Kettingen van 3 of 4 factoren bestaan enkel bij natuurlijke getallen; een nota zegt dat nu.',
                example: { leafId: 'hr-std-vermenigvuldigen-dec' },
            },
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
                text: 'Herleidingen: kies “Vraag: getal, eenheid of afwisselend” — de eenheid staat er en je vult het getal in, of het getal staat er en je vult de eenheid in.',
                example: { leafId: 'herleidingen-lengte', constraints: { vraag: 'afwisselend' }, grade: 4, count: 2, after: '“235 cm = ____ m” of “235 cm = 2,35 ____”' },
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: MAB-materiaal is op het toestel echt te tellen (platen met rooster, staven per vijf, blokjes per vijf). De bouwer start op jouw leerjaar.',
                example: { leafId: 'mab-herkennen', grade: 2, count: 2, after: 'leesbare platen, staven en blokjes' },
            },
            {
                kind: 'gewijzigd',
                text: 'Kommagetallen bij hoofdrekenen starten eenvoudiger: tot 100 met 1 decimaal; delen meestal door 0,x. Het maximum kan nog steeds hoger.',
                example: { leafId: 'hr-std-delen-dec', grade: 5, count: 3, before: '“432,36 : 0,6”', after: '“48,6 : 0,6”' },
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: de kaart toont een “?”-vakje waar het antwoord komt, veelvouden en wisselgeld variëren, en herleidingen blijven binnen de leerstof van het leerjaar.',
            },
            {
                kind: 'nieuw',
                text: 'Oefenmodus: breuken herkennen vraagt een echte breuk (eerst noemer, dan teller). Plaatswaarde krijgt de keuze “Antwoord”: waarde, plaats, plaats door elkaar.',
                example: { leafId: 'plaatswaarde-plaats', constraints: { plaatsAnswer: 'waarde' }, grade: 3, count: 2, after: 'de leerling typt de waarde (“20”)' },
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: controleren toont ook foute sommen, breuk-kommagetal vergelijken is niet altijd “<”, en het onderstreepte cijfer bij plaatswaarde is zichtbaar.',
                example: { leafId: 'vergelijken-representaties', grade: 5, count: 3, before: 'altijd “<”', after: '<, = en > komen voor' },
            },
            {
                kind: 'nieuw',
                text: 'Bordmodus: met “Selecteren” (S) tik of omcirkel je inkt, sleep je ze naar een andere plek of wis je ze. Ongedaan maken werkt ook hier.',
            },
            {
                kind: 'opgelost',
                text: 'Oefenmodus: even/oneven toont precies zoveel bolletjes als het getal, en een oude link slaat een oefening over die niet op het toestel kan.',
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
