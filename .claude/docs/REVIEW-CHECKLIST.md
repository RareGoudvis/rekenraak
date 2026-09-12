# Review-checklist — nog niet nagekeken door de eigenaar

Opgesteld 2026-09-09. Loop dit van boven naar beneden door: de volgorde volgt de sidebar,
dus je kan de app openen en gewoon afzakken. Zet een `x` per afgewerkte leaf.

**Waarom staat iets hier?** Twee UpdateState-entries zeggen het letterlijk:

- 2026-07-07 — "Getallenkennis + meten families still not owner-reviewed."
- 2026-07-06 (2) — "Getallenkennis + meten families untouched (not yet reviewed)."

Alles wat sinds juli is gebouwd of gerepareerd is **machinaal** geverifieerd (tsc, eslint,
build, generator-smoke, viewer-smoke, Playwright print-breedte). Niemand heeft het op
**papier** bekeken. Dat is wat deze lijst is.

**Werkwijze per leaf:** blok toevoegen → Genereer → kijk of de opgaven kloppen en of de
lay-out klopt → Genereer nog eens (varieert het?) → oplossingen aan → en bij twijfel
Ctrl+P met marges None op 100%.

---

## 1. Getallenkennis (~55 leaves)

### Getalbegrip

- [ ] Getalbegrip > MAB > Getallen herkennen `(mab-herkennen)` — audit-fix: tientallenstaaf bij waarde 10
- [ ] Getalbegrip > MAB > Getallen tekenen `(mab-tekenen)` — zelfde fix, oplossingskant
- [ ] Getalbegrip > Plaatswaarde benoemen > Waarde van cijfer `(plaatswaarde)` — masked-number cap
- [ ] Getalbegrip > Plaatswaarde benoemen > Plaats benoemen `(plaatswaarde)`
- [ ] Getalbegrip > Plaatswaarde benoemen > Tabel invullen `(plaatswaarde)`
- [ ] Getalbegrip > Splitsen > Rooster `(splitsen)`
- [ ] Getalbegrip > Splitsen > Splitsboom `(splitsen)` — decimale handmatige-edit recompute
- [ ] Getalbegrip > Splitsen > Verliefde harten `(splitsen)` — **gewijzigd** naar 5-up volle breedte
- [ ] Getalbegrip > Splitsen > Positietabel `(splitsen)`
- [ ] Getalbegrip > Splitsen > Splitsbenen (H/T/E) `(splitsen)`
- [ ] Getalbegrip > Splitsen > Plaatswaarden `(splitsen)`
- [ ] Getalbegrip > Vergelijken > Twee getallen `(vergelijken)`
- [ ] Getalbegrip > Vergelijken > Grootste / kleinste `(vergelijken)` — viewer verbreed
- [ ] Getalbegrip > Vergelijken > Breuken & kommagetallen `(vergelijken)`
- [ ] Getalbegrip > Ordenen > Natuurlijke getallen `(ordenen)` — verbreed
- [ ] Getalbegrip > Ordenen > Decimale getallen `(ordenen)`
- [ ] Getalbegrip > Ordenen > Rationale getallen `(ordenen)` — zie bekend geval #21 onderaan
- [ ] Getalbegrip > Ordenen > Gehele getallen `(ordenen)`
- [ ] Getalbegrip > Getallenassen > Natuurlijke getallen `(getallenas)` — V3 printfix
- [ ] Getalbegrip > Getallenassen > Decimale getallen `(getallenas)`
- [ ] Getalbegrip > Getallenassen > Rationale getallen `(getallenas)`
- [ ] Getalbegrip > Getallenassen > Gehele getallen `(getallenas)`
- [ ] Getalbegrip > Getallenrijen > Natuurlijke getallen `(getallenrijen)` — V3 pill-font fix
- [ ] Getalbegrip > Getallenrijen > Decimale getallen `(getallenrijen)`
- [ ] Getalbegrip > Getallenrijen > Rationale getallen `(getallenrijen)`
- [ ] Getalbegrip > Getallenrijen > Gehele getallen `(getallenrijen)`
- [ ] Getalbegrip > Functie van getallen `(getalfunctie)` — **nieuw juli**, zie #74
- [ ] Getalbegrip > Verbanden > Tabel invullen `(verbanden)` — **nieuw juli**
- [ ] Getalbegrip > Verbanden > Omzettingen `(verbanden)` — **nieuw juli**

### Breuken

- [ ] Breuken > Breuken kleuren `(breuken)` — V2: samengestelde noemers nu 2D-rooster (14→2×7, 15→3×5, 16→4×4)
- [ ] Breuken > Breuken herkennen `(breuken)` — zelfde V2-fix
- [ ] Breuken > Breuk van een hoeveelheid `(breuken)`
- [ ] Breuken > Breuk van een lijnstuk `(breuken)` — minLineLength wordt nu gerespecteerd
- [ ] Breuken > Breuk van een veelhoek `(breuken)` — restpunt: noemer 7 in een ≤6×6 vak blijft benaderend
- [ ] Breuken > Breuken rangschikken `(breuken-rangschikken)` — maxDenominator wordt nu gerespecteerd

### Afronden

- [ ] Afronden > Natuurlijke getallen > Rooster `(afronden)` — V6: opnieuw 2-up bij 2 doelen
- [ ] Afronden > Natuurlijke getallen > Eenvoudig (≈) `(afronden)`
- [ ] Afronden > Decimale getallen > Rooster `(afronden)` — V6 + no-op doelen geschrapt
- [ ] Afronden > Decimale getallen > Eenvoudig (≈) `(afronden)`

### Patronen

- [ ] Patronen > Natuurlijke getallen `(getalpatronen)`
- [ ] Patronen > Decimale getallen `(getalpatronen)`
- [ ] Patronen > Gehele getallen `(getalpatronen)`
- [ ] Patronen > Kettingsommen `(kettingsommen)` — **nieuw juli, verhuisd** hierheen uit Handig hoofdrekenen

### Even en oneven

- [ ] Even en oneven > Rooster kleuren `(even-oneven)`
- [ ] Even en oneven > Cirkels groeperen `(even-oneven)`

### Veelvouden en deelbaarheid

- [ ] Veelvouden en deelbaarheid > Veelvouden aanvullen `(deelbaarheid)`
- [ ] Veelvouden en deelbaarheid > Deelbaarheidstabel `(deelbaarheid)` — past nu op 10 delers
- [ ] Veelvouden en deelbaarheid > Deelbaarheid (kleuren) > Rooster `(deelbaarheid-kleuren)`
- [ ] Veelvouden en deelbaarheid > Deelbaarheid (kleuren) > Omcirkelen `(deelbaarheid-kleuren)`
- [ ] Veelvouden en deelbaarheid > Deelbaarheid (kleuren) > Kleurraster `(deelbaarheid-kleuren)`

### Procenten

- [ ] Procenten > Percent van een getal `(procenten)` — **nieuw juli**
- [ ] Procenten > Hoeveel procent? `(procenten)` — **nieuw juli**
- [ ] Procenten > Breuk · decimaal · procent `(verbanden)` — tweede ingang naar hetzelfde type, zonder defaultConstraints

### Romeinse cijfers

- [ ] Romeinse cijfers > Herkennen (→ getal) `(romeinse-cijfers)`
- [ ] Romeinse cijfers > Schrijven (→ Romeins) `(romeinse-cijfers)` — V4: niveau 4 past nu 2-up

---

## 2. Meetkunde > Vormleer (5 leaves)

Staat in geen van beide entries, maar is nieuw sinds juli en maar deels aangeraakt.

- [ ] Vormleer > Punt / lijn / rechte > Herkennen `(vormleer-punt-lijn)` — **2026-09-09 gefixt: een rechte heeft geen pijlpunten meer** (ook de evenwijdige/snijdende/loodrechte paren)
- [ ] Vormleer > Punt / lijn / rechte > Tekenen `(vormleer-punt-lijn)`
- [ ] Vormleer > Hoeken > Herkennen `(vormleer-hoeken)` — **"Meten" staat gepland als volgende batch**
- [ ] Vormleer > Hoeken > Tekenen `(vormleer-hoeken)`
- [ ] Vormleer > Vlakke figuren > Driehoeken `(vormleer-figuren)` — samengevoegd tot één leaf met beide indelingen
- [ ] Vormleer > Vlakke figuren > Vierhoeken `(vormleer-figuren)`

---

## 3. Meten en metend rekenen (~30 leaves)

### Tijdstip en tijdsduur

- [ ] Analoge klok > Lezen `(klok-kloklezen)` — 24u "half 24" gefixt; zie #72
- [ ] Analoge klok > Tekenen `(klok-kloklezen)`
- [ ] Analoge klok > Omzetten `(klok-kloklezen)`
- [ ] Digitale klok > Lezen `(klok-kloklezen)`
- [ ] Digitale klok > Tekenen `(klok-kloklezen)` — vult nu een lege klok
- [ ] Tijdsduur berekenen `(tijdsduur)` — **nieuw juli**
- [ ] Kalender / datum lezen > Maandrooster lezen `(kalender)` — **nieuw juli**
- [ ] Kalender / datum lezen > Rekenen met dagen `(kalender)` — **nieuw juli**
- [ ] Kalender / datum lezen > Datumnotatie `(kalender)` — **nieuw juli**

### Geld

- [ ] Geld > Herkennen `(geld-herkennen)`
- [ ] Geld > Bedrag tekenen `(geld-tekenen)`
- [ ] Geld > Wissel `(geld-wissel)`
- [ ] Geld > Teruggeven `(geld-teruggeven)`
- [ ] Geld > Korting `(geld-rekenen)` — **nieuw juli**; zie #18/#33
- [ ] Geld > Intrest `(geld-rekenen)` — **nieuw juli**
- [ ] Geld > Winst / Verlies `(geld-rekenen)` — **nieuw juli**

### Temperatuur

- [ ] Temperatuur > Meter kleuren `(temperatuur)`
- [ ] Temperatuur > Meter aflezen `(temperatuur)`
- [ ] Temperatuur > Verschil `(temperatuur)`

### Lengte en oppervlakte

- [ ] Lengte en oppervlakte > Lengte meten `(lengte-meten)`
- [ ] Lengte en oppervlakte > Omtrek `(omtrek)`
- [ ] Lengte en oppervlakte > Oppervlakte > Rooster tellen `(oppervlakte)` — **nieuw juli**
- [ ] Lengte en oppervlakte > Oppervlakte > Berekenen `(oppervlakte)` — **nieuw juli**

### Massa

- [ ] Massa > Weegschaal aflezen `(weegschaal)` — **nieuw juli**
- [ ] Massa > Wijzer tekenen `(weegschaal)` — **nieuw juli**

### Maateenheden

- [ ] Maateenheden > Passende maateenheid kiezen `(maateenheid)` — **nieuw juli**

### Herleidingen

- [ ] Herleidingen > Lengte `(herleidingen)`
- [ ] Herleidingen > Inhoud `(herleidingen)`
- [ ] Herleidingen > Massa `(herleidingen)`
- [ ] Herleidingen > Oppervlakte `(herleidingen)`

---

## 4. Bewerkingen — nieuw sinds je vorige ronde (5 leaves)

Vallen buiten de twee genoemde families, maar zijn nieuw in juli.

- [ ] Handig hoofdrekenen > Rekenvolgorde en haakjes `(rekenvolgorde)` — **nieuw juli**; **2026-09-09 gefixt: `=` en schrijflijn lijnen nu per kolom uit**, en 4 bewerkingen tot 1 000 valt terug naar 1 kolom
- [ ] Cijferen > Negenproef `(controleren)` — **nieuw juli, verhuisd** naar Cijferen
- [ ] Controleren > Omgekeerde bewerking `(controleren)` — **nieuw juli**, herwerkt tot oefening + controlelijn
- [ ] Schattend rekenen > Natuurlijke getallen `(schattend)` — **nieuw juli**
- [ ] Schattend rekenen > Kommagetallen `(schattend)` — **nieuw juli**

---

## Al goedgekeurd — overslaan

Kwam uit **jouw** feedbackronde van 2026-07-06 (2), dus die heb je al gezien:
multi-term hoofdrekenen (2–4 termen), de compenseren- en ×÷-tienvoud-presets, per-term
getalopbouw en per-term max, de hernoeming naar "(standaardprocedure)", negenproef naar
Cijferen, de rekenvolgorde-herwerking, omgekeerde bewerking, de cijferen +/− controlelijn,
de driehoeken-samenvoeging en het splitsen van de markeringen, schattend met (H)/(T)-prefix,
verliefde harten 5-up, en "Alle stijlen terugzetten" in de StyleBuilder.

De **V-reeks** printfixes van 2026-07-07 (2) zijn Playwright-geverifieerd op ware
printbreedte: hoofdrekenen operandkolommen (V1), breuken-roosters (V2), getallenas en
getallenrijen (V3), romeinse (V4), afronden-rooster (V6), header titel-links (V7). V5 was
een spookbevinding van een verkeerd gekalibreerde harnas.

> Let op: die verificatie is **machinaal**. Elke leaf die ze aanraakten staat hierboven nog
> steeds op de lijst als hij in Getallenkennis of Meten valt.

---

## Bekend en bewust niet gefixt — niet opnieuw melden

Uit AUDIT-FIXLOG.md, "inherent aan de instellingen":

- **#21** — ordenen rationaal met "alleen stambreuken" en noemers 2–2 levert één breuk op; een reeks haalt het gevraagde aantal niet.
- **#27** — breuken-bewerken gelijknamig met een priem-doelnoemer (7) kan geen gemene noemer zijn; valt terug op het KGV.
- **#18 / #33** — geld-rekenen met hele euro's put de pool uit (1% vraagt een basis van €100).
- **#66** — een klok-confighint voor digitaal+omzetten die via geen enkele sidebar-leaf bereikbaar is.
- **#72** — kleine klok-pool: enkel uren in 12u geeft 12 verschillende tijdstippen, dus 15 vragen levert er 12.
- **#74** — getalfunctie-zinnen met een numerieke ondergrens ("≥80 leerlingen") kunnen een erg lage maxGetal overschrijden.

Restpunten binnen verder wél gefixte zaken: breuken-veelhoek met noemer 7 in een klein vak
blijft benaderend; een MAB-masker met één geldige waarde herhaalt noodzakelijk; een
splitsen-masker dat exact gelijk is aan het totaal is eenwaardig.

---

## Twee dingen die je uit je hoofd mag zetten

- De juli-typeIds **`tienvoud`** en **`handig-rekenen`** bestaan niet meer als aparte leaves.
  Ze zijn `constraints.preset`-varianten binnen de gewone hoofdrekenen-configs geworden
  (Oefenvorm-rij). "Handig hoofdrekenen" bevat daardoor enkel nog Rekenvolgorde.
- **AUDIT-VISUAL-FINDINGS.md** is verouderd op de kop na: de body zegt "Report-only, no fixes
  applied", maar het STATUS UPDATE-blok bovenaan klopt wel — alle V-bevindingen zijn gefixt.

## Nog open, los van deze lijst

- Duplicaatpreventie in de generatoren (part 2) — geplanned, nog niet gebouwd.
- Hoeken meten (graden op een lijn, groter tekenen) — volgende batch.
- Page-model herstructurering — goedgekeurd plan, nog niet gestart.
- `whiteboard`-branch (Bordmodus) — geparkeerd, P3 en P4 nog te doen.
