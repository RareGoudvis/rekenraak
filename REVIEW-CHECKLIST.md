# Review-checklist — donderdag (dev-layoutfixes + volledig bord)

Tijdelijk werkdocument, niet committen. Vink af met `[x]`; noteer bevindingen eronder.
Detail per fix: [AUDIT-FIXLOG.md](AUDIT-FIXLOG.md) (H-serie + V-serie) en
[AUDIT-VISUAL-FINDINGS.md](AUDIT-VISUAL-FINDINGS.md).

**Print-test = altijd:** Ctrl+P → Opslaan als PDF → marges "Geen" → schaal 100%.

---

## DEEL 1 — `dev` branch: layout-fixes (V-serie)

### V1 — Hoofdrekenen grote getallen (belangrijkste)
- [ ] Optellen (standaardprocedure), Max getal **1 000 000**, 2 termen → alle cijfers zichtbaar (geen `408 06|`), 2-up, niets buiten de pagina in print
- [ ] Zelfde met **3 en 4 termen** → past binnen de pagina (evt. 1-up)
- [ ] Max getal **1 000** (klassiek) → nog steeds het vertrouwde 2-up beeld
- [ ] Puntoefeningen + delen met rest op 1M → geen geknipte invoervakken
- [ ] **Compenseren-preset** → staat nu bewust 1-up (tussenstap is breed) — akkoord?
- [ ] Decimaal + breuken varianten → ongewijzigd goed

### V2 — Breuken kleuren/herkennen
- [ ] Noemer **14 / 15 / 16** → 2D-rasters (2×7, 3×5, 4×4), geen paginabrede strook
- [ ] Noemer **7 / 11 / 13** (priem) → smalle strook die in de kolom past; cellen nog inkleurbaar?
- [ ] Vierkant-vorm + herkennen-varianten + veelhoek → ok

### V3 — Getallenas / getallenrijen
- [ ] Getallenas: 1 000 000, **10 tekens**, stap 50 000 → as + labels (11px) binnen de pagina, labels leesbaar en niet tegen elkaar
- [ ] 6 tekens @ 1M → ziet er nog uit als voorheen
- [ ] Getallenrijen: 10 tekens @ 1M → pil past (waarden evt. 2-regelig in de cel — acceptabel?)

### V4 — Romeinse cijfers
- [ ] Schrijven, **niveau 4** (+ oplossingen aan) → MMMCMXCIX volledig zichtbaar, 2-up binnen de pagina

### V5 — Deelbaarheid tabel (was vals alarm)
- [ ] Tabel met **alle 10 delers** → in échte print staat de "100?"-kolom er volledig op (harnas-meting zei van wel; graag op papier/PDF bevestigen)

### V6 — Afronden rooster
- [ ] Standaard (T+H) → **2 roosters naast elkaar**, geen lege rechterhelft, niets geknipt
- [ ] Doelen duizendtal + tienduizendtal → kop "op tienduizendtal" leesbaar (kleiner/2 regels)
- [ ] 3-4 doelen → 1-up (correct)

### V7 — Titel links
- [ ] Titelpositie **Links** + Naam/Klas/Nr/Datum → velden rechtsboven als net blok met strakke linkerrand (spiegel van Rechts)
- [ ] Midden + Rechts → onveranderd; herhaal-kopregel bij printen → onveranderd

### Print-eindtest
- [ ] Gemengd blad (hoofdrekenen 1M + breuken 13 + getallenas 10 tekens + afronden + romeinse niveau 4 + deelbaarheid 10 delers) → PDF: niets geknipt, niets buiten de marges

### Steekproef eerdere audit-fixes (H-serie; detail in AUDIT-FIXLOG.md)
- [ ] MAB "Tot 10" → waarde 10 toont een tientalstaaf
- [ ] Breuken bewerken (gemengd) → antwoordsleutel matcht de opgave (10/6 ↔ 1 4/6)
- [ ] Kettingsommen → operatoren wisselen echt af
- [ ] Cijferen 3-4 termen → omgekeerde-controlelijn klopt
- [ ] Klok 24u "half 24" + digitaal-tekenen → lege klok + digitale tijd
- [ ] Handmatig getal bewerken (ordenen/splitsen/cijferen) → herberekent correct

---

## DEEL 2 — `whiteboard` branch: volledig bord

### 2.1 Basis & persistentie
- [ ] Bordmodus in/uit → werkblad-editor ongewijzigd terug (blokken, undo-historie)
- [ ] Widgets + inkt + 2e pagina maken → **browser hard sluiten en heropenen** → alles terug
- [ ] Bewaren als… → in "mijn borden"-lijst → laden werkt; verwijderen werkt
- [ ] Exporteren → bestand → Importeren → identiek bord
- [ ] Pagina's: toevoegen / dupliceren / verwijderen / bladeren; inhoud per pagina gescheiden
- [ ] Bezem (pagina leegmaken) + Bord leegmaken (alles) → met bevestiging

### 2.2 Widget-chroom (window-card)
- [ ] Titel aanklikken → typen → Enter/blur bewaart
- [ ] Titelbalk slepen = verplaatsen; grip rechtsonder = **proportioneel** schalen (test op klok, datum, MAB, oefening — niets knipt, rand blijft rondom zichtbaar incl. rechts)
- [ ] ⚙ opent instellingen (selectie alleen opent NIETS meer — ok?)
- [ ] ⧉ dupliceert (oefening-kopie is onafhankelijk instelbaar)
- [ ] 🗑 verwijdert; "Titelbalk tonen" uit → kale kaart, overal sleepbaar
- [ ] Hand-tool: alles slepen, niets selecteren; cursor-tool = normaal

### 2.3 RekenRaak-blokken (oefeningwidgets)
- [ ] Toevoegen → RekenRaak blok… → zijpaneel met alle types + voorbeelden; zoeken + domeinchips
- [ ] "Optellen met breuken"-labels kloppen nu
- [ ] Widget toont volledige oefenrijen op standaardbreedte
- [ ] ⚙ → echte instellingen (bv. MAB stijl, max getal) → wijziging direct zichtbaar; aantal/witruimte/tekstgrootte sliders
- [ ] 🔄 nieuwe oefeningen (balk-knop én in paneel); 👁 rode oplossingen aan/uit

### 2.4 Inkt ⚠ prioriteit (eerdere crash)
- [ ] **Verse pagina-load** (hard refresh) → pen tekenen + loslaten → GEEN crash. Bij crash: tekst van de rode foutkaart noteren!
- [ ] Zelfde met geselecteerde widget, over een widget heen, snelle tik, marker
- [ ] Kleuren: standaard + eigen kleur (kleurwiel) + **kleur bewaren** (blijft na herstart)
- [ ] 3 diktes per tool; marker = doorschijnend over oefeningen
- [ ] Gom wist per streek; undo/redo (redo vervalt na nieuwe streek — ok?)
- [ ] Stylus/vinger op digibord: vloeiend? geen palm-problemen?

### 2.5 Toevoegen-menu & balk
- [ ] Categorieën: RekenRaak blok / Wiskunde-gereedschap / Klasmanagement / Organisatie → tegel-panelen ernaast
- [ ] ★ op tegels → favorieten naast Toevoegen (max 6, één tik = plaatsen; ontsterren haalt weg; blijft na herstart)
- [ ] T-tool → tik op bord = tekstvak op die plek
- [ ] ⚙-bordinstellingen: alle achtergronden (blanco/raster/lijnen/**schrijflijnen 2 & 4** (blauwe band ok?)/cornell) × Klein/Normaal/Groot × zwart bord; raster-uitlijnen aan/uit + 20/40/80

### 2.6 Widgets één voor één (elk: plaatsen, gebruiken, ⚙, schalen)
- [ ] **Datum**: weekdag/datum/tijd (live, seconden) toggles + kleuren
- [ ] **Klok**: wijzers slepen (buiten = minuten, binnen = uren), digitaal + geschreven tijd ("kwart voor 8" / 07:45), wijzer-toggles
- [ ] **Weer**: juiste plaats via zoeken (jouw gemeente), "huidige locatie", alle onderdelen aan/uit
- [ ] **Werksymbolen**: tik = actief (rood), verticaal/horizontaal, enkel-icoon, symbolen aan/uit
- [ ] **Geluidsniveau-poster**: tik = niveau, rest gedimd; kleuren/teksten ok t.o.v. jouw poster?
- [ ] **Namenkiezer**: klaslijst via ⚙ (blijft bewaard), geen herhaling tot iedereen geweest is
- [ ] **Groepjesmaker**: aantal ↔ grootte; moet-samen + mag-niet-samen met echte namen; onmogelijke regels → waarschuwing
- [ ] **Timer**: taart krimpt, pauze/reset, knippert op 0; duur + kleur
- [ ] **Stopwatch**; **Dobbelstenen** (1-3, 6/N-zijdig, eigen woordenlijst); **Ademhaling** (presets, tempo goed?)
- [ ] **Checklist** (afvinken, vierkant/rond, reset); **Stappenplan** (#/## koppen, nummering, kleur); **Tekst**; **Afbeelding** (upload, blijft na reload)

### 2.7 Wiskunde-gereedschap
- [ ] **Getallenlijn** (leeg): bereik/tekens/labels; met pen erop schrijven
- [ ] **Positietabel** (leeg): kolommen D→h, kommakolom bij t/h, rijen; pen-schrijfbaar
- [ ] **Honderdveld**: 1-100 / 0-99, tik-kleurcyclus (tafels aanduiden), wissen
- [ ] **Breuken**: cirkel/pizza/lijn, noemers, stambreuken-toggle
- [ ] **MAB-materiaal**: blokken bijbouwen per plaats, 3 stijlen, toon-totaal
- [ ] **Geld-palet**: dock opent; munten/biljetten eruit slepen (herhaald = dupliceren); Tekening vs Echt; gedropte items verslepen/verwijderen; touch-sleep op digibord

### 2.8 Digibord-pass (alles hierboven kort met vinger/stylus)
- [ ] Slepen, grip-schalen, menu's, wijzers, honderdveld-tikken, geld-sleep — zonder muis werkbaar

### Bekende gaten (geen bugs)
- Lijn/pijl-, vormen- en meetinstrument-tools: uitgeschakeld (P3/P4; instrumenten krijgen echt snappen)
- Geen deel-link voor borden (wel bestand-export)
- Inkt-undo dekt geen widget-verplaatsingen
- Werkbladen printen ≠ bord printen (bord heeft geen print-flow)
