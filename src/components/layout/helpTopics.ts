import type { BetaModule } from '../../config/beta';

// The in-app help: one short topic per part of the app, each pointing to its section on the
// static manual (handleiding.html). handleiding.test.ts checks every anchor exists on that page.
export const HANDLEIDING_URL = '/handleiding.html';

export interface HelpTopic {
    id: string;
    title: string;
    // Section id on handleiding.html.
    anchor: string;
    bullets: string[];
    // A beta module shows the beta note and "Toon de uitleg opnieuw".
    module?: BetaModule;
}

export const HELP_TOPICS: HelpTopic[] = [
    {
        id: 'start', title: 'Snel starten', anchor: 'snel-starten',
        bullets: [
            'Kies links een oefening: onder Eenvoudig klik je op een kaart en staat ze meteen op het blad.',
            'Kies rechts het aantal oefeningen en klik op Genereer voor nieuwe getallen.',
            'Voeg zo meer oefeningen toe tot het blad vol is.',
            'Klik op de printerknop rechtsboven en kies Werkblad of Werkblad + oplossingen.',
            'Je blad wordt vanzelf bewaard in deze browser.',
        ],
    },
    {
        id: 'balk', title: 'De knoppen bovenaan', anchor: 'het-scherm',
        bullets: [
            'Menu (drie streepjes): oefeningen toevoegen, kant-en-klare bladen, delen, basisinstellingen, curriculum en een nieuw blad.',
            'Vraagteken: deze hulp, de rondleiding, de video en wat er nieuw is. Bewaren (diskette): Mijn bladen en bestanden.',
            'In het midden de naam van het blad: klik erop om ze te veranderen. Het bolletje toont of alles bewaard is.',
            'Rechts: ongedaan maken en opnieuw, Genereer alles (sterretjes), het oog voor de oplossingen en de printerknop.',
        ],
    },
    {
        id: 'eenvoudig', title: 'Eenvoudig', anchor: 'eenvoudig',
        bullets: [
            'Kies bovenaan je leerjaar en klik op een onderwerp, bijvoorbeeld Hoofdrekenen › Optellen.',
            'Kies eventueel een ander bereik (Tot 20, Tot 100, …) en klik op een kaart. De kleine knoppen op een kaart zetten meteen die variant op het blad.',
            'Rechts staat dan Snel aanpassen met de belangrijkste keuzes. Aanpassen opent de kaarten opnieuw.',
            'Verschillende bewerkingen in één blok? Kies Combinatie of de kaart Zelf samenstellen.',
        ],
    },
    {
        id: 'uitgebreid', title: 'Uitgebreid en Werkblad', anchor: 'uitgebreid',
        bullets: [
            'Uitgebreid toont alle oefeningen per domein. Klik een onderdeel open en klik op een oefening.',
            'Zoek met Zoek oefening… en toon met het menu ernaast alleen één leerjaar.',
            'Veel tegelijk? Menu › Oefeningen toevoegen… toont een voorbeeld van elke oefening.',
            'Werkblad toont alle blokken op een rij: versleep om de volgorde te veranderen, dupliceer of verwijder. Een streep toont waar een nieuwe pagina begint.',
        ],
    },
    {
        id: 'blok', title: 'Een blok op het blad', anchor: 'blok',
        bullets: [
            'Klik op een blok om het te kiezen. Naast het blok verschijnen knoppen: verslepen, vergrendelen, dupliceren, splitsen, nieuwe pagina, verwijderen.',
            'Een vergrendeld blok blijft hetzelfde bij Genereer alles.',
            'Past één som niet? Klik erop en verander de getallen zelf. Klik op de opdracht om die tekst te veranderen.',
        ],
    },
    {
        id: 'paneel', title: 'Het paneel rechts', anchor: 'paneel-opdracht',
        bullets: [
            'Bovenaan kies je wat je aanpast: Opdracht (het gekozen blok) of Heel het blad.',
            'Aantal oefeningen en Genereer staan altijd bovenaan. Na een wijziging krijgt Genereer een stip.',
            'Een opdracht heeft de vakken Wat oefenen ze, Hoe staat het op het blad, Verbetersleutel, Differentiatie en Grootte en ruimte. Elk vak toont een korte samenvatting. In Eenvoudig staat Snel aanpassen er nog boven.',
            'Heel het blad heeft Koptekst, Opdrachten, Cijfers en tekst, Verbetersleutel en hulp en Voettekst.',
        ],
    },
    {
        id: 'sleutel', title: 'Oplossingen en tussenstappen', anchor: 'oplossingen',
        bullets: [
            'Het oog bovenaan toont de oplossingen in het rood. Het blad van de leerlingen verandert niet.',
            'Tussenstappen voor één blok: Opdracht › Verbetersleutel › Uit, Basis of Alle.',
            'Voor alle blokken: Heel het blad › Verbetersleutel en hulp › Tussenstappen voor alle blokken.',
        ],
    },
    {
        id: 'afdrukken', title: 'Afdrukken en pdf', anchor: 'afdrukken',
        bullets: [
            'Klik op de printerknop en kies Werkblad of Werkblad + oplossingen.',
            'Kies je printer of Opslaan als PDF. Zet Marges op Geen en de schaal op 100%.',
            'Wat je op het scherm ziet, komt precies zo op papier.',
        ],
    },
    {
        id: 'bewaren', title: 'Bewaren en delen', anchor: 'bewaren-delen',
        bullets: [
            'Je blad wordt vanzelf bewaard in deze browser, maar dat is geen bestand.',
            'Bewaren › Bewaar in Mijn bladen… bewaart het onder een naam. Bewaren › Bewaar bestand maakt een .rekenraak-bestand voor je schoolmap of een andere computer.',
            'Menu › Blad delen kopieert een link met het hele blad. Sjabloon delen deelt alleen de instellingen, met nieuwe getallen voor wie de link opent.',
            'Menu › Curriculum samenstellen maakt een link met alleen jouw keuze van oefeningen.',
        ],
    },
    {
        id: 'kant-en-klaar', title: 'Kant-en-klare bladen', anchor: 'kant-en-klaar',
        bullets: [
            'Menu › Kant-en-klare bladen: filter op leerjaar, rekenmethode of domein.',
            'Gebruik sjabloon zet het blad met verse getallen in de editor. Het komt in de plaats van het blad dat open staat.',
        ],
    },
    {
        id: 'stappenhulp', title: 'Stappenhulp-QR', anchor: 'stappenhulp',
        bullets: [
            'Heel het blad › Verbetersleutel en hulp › Stappenhulp-QR zet een QR-code onderaan elke pagina.',
            'Een leerling scant de code met een telefoon of tablet en bekijkt de stappen van een som, één stap per tik.',
            'Zet de QR uit bij een toets: hij verklapt de antwoorden.',
        ],
    },
    {
        id: 'oefenmodus', title: 'Oefenmodus', anchor: 'oefenmodus', module: 'oefenmodus',
        bullets: [
            'Leerlingen oefenen op hun eigen toestel, één oefening per scherm, via een link of QR-code.',
            'Klik linksonder op Oefenmodus: een eigen werkruimte opent. Met ‹ Werkblad ga je terug naar je blad.',
            'Links kies je oefeningen (Eenvoudig of Uitgebreid). In het midden staat je sessie, elke soort met een voorbeeld zoals de leerling het ziet.',
            'Rechts stel je in per oefening (wat en hoeveel) of voor de hele sessie (titel, volgorde, tijd, feedback, hulp na een fout).',
            'Delen geeft de link en de QR-code: kopieer, toon groot op het bord of druk af (A5). Opslaan bewaart de sessie in Mijn bladen.',
            'Na een fout ziet de leerling de stappen, in leerjaar 1 tot 3 met MAB-blokjes. De resultaten blijven op het toestel van de leerling.',
        ],
    },
    {
        id: 'zelf', title: 'Zelf oefenen', anchor: 'zelf-oefenen',
        bullets: [
            'Op rekenraak.be/kind.html kiezen leerlingen zelf wat ze oefenen, zonder link van jou.',
            'Ze kiezen hun leerjaar, een onderwerp en hoeveel oefeningen of minuten.',
            'Terug naar begin bovenaan laat hen iets anders kiezen. Je vindt de link en een QR-code ook in Oefenmodus.',
        ],
    },
    {
        id: 'bordmodus', title: 'Bordmodus', anchor: 'bordmodus', module: 'bordmodus',
        bullets: [
            'Een groot bord voor het digibord. Open het met Whiteboard linksonder.',
            'De balk links: het tandwiel (achtergrond, raster, bord wissen), je gereedschap, kleur en dikte, en ongedaan maken.',
            'Het plusje onderaan voegt een Rekenblok, Rekentool, Klasbeheer, Dagritme of Extra toe.',
            'Versleep een kaart aan haar titelbalk; de knoppen erop geven nieuwe oefeningen, de oplossing, instellingen en Meer.',
            'Rechtsboven: bewaren (Mijn borden), volledig scherm en het kruisje om terug te gaan.',
        ],
    },
];
