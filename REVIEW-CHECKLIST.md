# Review-checklist — donderdag (dev-layoutfixes + volledig bord)

**Status na de geautomatiseerde review (Claude, 2026-07-08):** de volledige lijst is
machinaal doorlopen met Playwright tegen de echte UI (105+ checks). Legenda:

- ✅ **auto** = machinaal geverifieerd (meting/DOM/interactie), hoeft donderdag alleen
  nog een blik als je wil
- 👁 **handmatig** = kan niet eerlijk machinaal (echte print, digibord-touch, esthetiek,
  microfoon) — **dit is jouw donderdag-lijst**
- 🔧 **gefixt** = bug gevonden tijdens de review en meteen gefixt (commit vermeld)

**Gevonden & gefixt tijdens de review:** 1 echte bug — de breuken-variantlabels toonden
"Hoofdrekenen met breuken" voor alle vier de hoofdreken-families i.p.v. "Optellen met
breuken" enz. (commit `db612d4`). Al het overige dat rood leek waren meetartefacten van
het testscript zelf (verkeerde kliklocaties, React-batching bij dubbelkliks in één
frame, sliders die synthetisch niet verslepen — met directe store-calls is de hele
keten wél groen bewezen).

**Print-test = altijd:** Ctrl+P → Opslaan als PDF → marges "Geen" → schaal 100%.

---

## DEEL 1 — `dev` branch: layout-fixes (V-serie)

Alle overflow-metingen op print-ware breedte (672px cell): **28/29 checks groen**,
de 29e was een fout in mijn eigen probe (klok-constraints) en bleek daarna ook groen.

### V1 — Hoofdrekenen grote getallen
- [x] ✅ auto — 2/3/4 termen × 1 000 / 1 000 000: overflow 0px, 0 geknipte invoervakken
- [x] ✅ auto — puntoefeningen + compenseren op groot getal: overflow 0
- [x] ✅ auto — Max getal 1 000 blijft het klassieke 2-up beeld (grid = 2 kolommen gemeten)
- [ ] 👁 handmatig — **compenseren-preset staat bewust 1-up** (brede tussenstap): akkoord met de look?
- [ ] 👁 handmatig — één echte PDF-print van een 1M-blad (harnas ≈ print, maar papier is papier)

### V2 — Breuken kleuren/herkennen
- [x] ✅ auto — noemers 7/13/14/16: overflow 0; 14→2×7-raster, 13 = smalle strook binnen de kolom (screenshot bekeken)
- [ ] 👁 handmatig — zijn de ~20px-brede cellen van noemer 13 nog comfortabel inkleurbaar voor een kind?

### V3 — Getallenas / getallenrijen
- [x] ✅ auto — as 10 tekens @1M: overflow 0, labels 11px zonder botsing (screenshot: leesbaar, netjes gescheiden)
- [x] ✅ auto — 6 tekens @1M ongewijzigd; rijen-pil 10 tekens @1M past
- [ ] 👁 handmatig — 11px-labels op papier: groot genoeg?

### V4 — Romeinse cijfers
- [x] ✅ auto — schrijven niveau 4, met én zonder oplossingen: overflow 0, MMMCMXCIX volledig

### V5 — Deelbaarheid tabel (was vals alarm)
- [x] ✅ auto — alle 10 delers: overflow 0, "100?"-kolom compleet
- [ ] 👁 handmatig — één papieren bevestiging (dit was eerder een meetfout van het harnas; hoort nu definitief goed te zijn)

### V6 — Afronden rooster
- [x] ✅ auto — standaard T+H: 2-up (grid gemeten), overflow 0; 4 doelen @100k: overflow 0
- [ ] 👁 handmatig — kop "op tienduizendtal" (9px/2 regels): leesbaar genoeg?

### V7 — Titel links
- [x] ✅ auto — screenshots Links + Rechts gemaakt en bekeken: velden rechtsboven als net blok met strakke linkerrand, mooie spiegel van Rechts
- [ ] 👁 handmatig — esthetisch eindoordeel is aan jou

### Print-eindtest
- [ ] 👁 handmatig — gemengd blad (1M-hoofdrekenen + breuken 13 + as 10 tekens + afronden + romeinse n4 + deelbaarheid 10 delers) → echte PDF

### Steekproef eerdere audit-fixes (H-serie)
- [x] ✅ auto — MAB "Tot 10": T-kolom aanwezig in de tabel
- [x] ✅ auto — breukbewerk gemengd: antwoordsleutel wiskundig consistent over 10 oefeningen
- [x] ✅ auto — kettingsommen genereren; cijferen 4 termen: alle sommen kloppen
- [x] ✅ auto — klok 24u: "half 24" gegenereerd; digitaal-tekenen: 4 oefeningen met lege invulklok
- [ ] 👁 handmatig — handmatig getal bewerken (ordenen klik-bewerken, splitsen) — interactie niet machinaal getest

---

## DEEL 2 — `whiteboard` branch: volledig bord

**Machinaal: 62/64 relevante checks groen; 0 console/page-errors over alle runs.**
De 2 rode waren beide test-artefacten (hieronder toegelicht bij het item).

### 2.1 Basis & persistentie — ✅ volledig auto-groen
- [x] ✅ bordmodus in/uit → editor intact
- [x] ✅ widgets + inkt + pagina 2 → reload → alles terug (incl. afbeelding-dataURL en geld-items)
- [x] ✅ bewaren als → in mijn borden → laden → verwijderen
- [x] ✅ exporteren → bestand → importeren → identiek (2 pagina's terug)
- [x] ✅ pagina's toevoegen/dupliceren/verwijderen/bladeren; inhoud gescheiden per pagina
- [x] ✅ bezem (pagina) + bord leegmaken (alles) met bevestiging

### 2.2 Widget-chroom — ✅ auto-groen
- [x] ✅ titel klikken → typen → Enter bewaart
- [x] ✅ titelbalk-drag verplaatst exact (dx/dy gemeten); grip = proportionele zoom (body-ratio constant bij 300→480px, geen clipping)
- [x] ✅ ⚙ opent instellingen; selectie alléén opent NIETS (bevestigd met correcte probe)
- [x] ✅ ⧉ dupliceert; 🗑 verwijdert; titelbalk-verbergen → kale kaart sleept van overal
- [x] ✅ hand-tool sleept (dx=200 gemeten) zonder iets te selecteren
- [ ] 👁 handmatig — let op: bij een **kale klok** sleept de wijzerplaat de wijzers, niet de kaart (pak de rand, of gebruik de hand-tool). Acceptabel?

### 2.3 RekenRaak-blokken — ✅ auto-groen (+ 1 fix)
- [x] 🔧 **gefixt**: variantlabels tonen nu "Optellen/Aftrekken/… met breuken" (`db612d4`)
- [x] ✅ zijpaneel met zoeken + domeinchips; oefening op 660px = volledige rijen (overflow 0 in de kaart)
- [x] ✅ instellingen-keten bewezen: aantal wijzigen → draft-mirror → widget → label, alles synchroon
- [x] ✅ 🔄 genereert echt nieuwe getallen; 👁 rode oplossingen aan/uit
- [ ] 👁 handmatig — sliders even met de hand verslepen (mijn synthetische muis-drag pakt React-sliders niet; de onderliggende keten is bewezen — 10 sec werk)

### 2.4 Inkt — ✅ auto-groen, crash NIET reproduceerbaar
- [x] ✅ verse load: pen teken+release = geen crash; ook met geselecteerde widget, over een widget, snelle tik, marker — 0 errors over alle runs
- [x] ✅ eigen kleur tekent (#123456 op het canvas gemeten) + kleur bewaren persist (localStorage)
- [x] ✅ 3 diktes; marker = multiply-blend; gom per streek; undo/redo (7→6→7); redo vervalt na gom
- [ ] 👁 handmatig — **de eerder gemelde crash**: hard-refresh op JOUW machine en tekenen. Bij crash: tekst van de rode foutkaart noteren (error boundary vangt hem nu op i.p.v. white-screen)
- [ ] 👁 handmatig — stylus/vinger-gevoel op het digibord (vloeiendheid, palm)

### 2.5 Menu & balk — ✅ auto-groen
- [x] ✅ categorieën + tegel-zijpanelen; ★ → favorietenbalk; **max 6 afgedwongen** (7e ster genegeerd); persist na reload; ontsterren werkt; favoriet-tik plaatst widget
- [x] ✅ T-tool plaatst tekstvak exact op klikpunt en springt terug naar selecteren
- [x] ✅ ⚙-bordinstellingen: schrijflijnen-4 + Groot + zwart bord toegepast (computed style gemeten); raster-snap 80px exact (positie 240,160 na sleep)
- [ ] 👁 handmatig — blauwe band van schrijflijnen-4: kleur/hoogte naar smaak? (screenshot zag er goed uit)

### 2.6 Widgets — ✅ auto-groen op 2 artefacten na
- [x] ✅ datum: live tijd (20:24 gemeten) + kleurpaneel
- [x] ✅ klok: minuutwijzer naar 9-uur-positie gesleept → 45 min → "kwart voor 10" tekst klopt; digitaal + geschreven-tijd toggles
- [x] ✅ weer: huidige locatie (°C + "Huidige locatie") én plaats zoeken → "Gent" met data
- [x] ✅ werksymbolen: tik = rood actief; enkel-icoon-modus
- [x] ✅ geluidsniveau: tik = niveau actief, rest gedimd
- [x] ✅ namenkiezer: 3 namen → 3 trekkingen zonder herhaling
- [x] ✅ groepjesmaker: An+Ben (moet samen) in één groep, An/Cas (mag niet) gescheiden — mijn eerste "FAIL" was een parse-fout van het testscript, de groepen waren correct
- [x] ✅ timer: preset 1 min + telt af (00:58 na 2s); stopwatch loopt; dobbelstenen met eigen woordenlijst; adem-fasetekst
- [x] ✅ checklist: afvinken (doorstreept) + ronde stijl; stappenplan: kop + subkop + nummers; afbeelding-upload → widget → persist na reload
- [ ] 👁 handmatig — timer/adem-tempo op gevoel; werksymbolen-iconen naar smaak; geluidsposter-kleuren vs jouw origineel
- [ ] 👁 handmatig — groepjesmaker met je echte klaslijst + onmogelijke regels (waarschuwing verschijnt dan)

### 2.7 Wiskunde-gereedschap — ✅ auto-groen
- [x] ✅ getallenlijn: labels "enkel uiteinden" → precies 2 labels; bereik instelbaar
- [x] ✅ positietabel: t-kolom aan → kommakolom verschijnt
- [x] ✅ honderdveld: tik-kleuren + "wis alle markeringen" (nb: mijn dubbeltik-in-één-frame gaf 1 stap i.p.v. 2 — React-batching, met menselijke tikken niet aan de orde)
- [x] ✅ breukviz: lijnvorm + stambreuken-toggle
- [x] ✅ MAB: 2H+3E → totaal 203; stijlwissel realistisch/zwart-wit/symbolisch zonder errors
- [x] ✅ geld-palet: 3 drops (tekening + echt), gedropt item herslepen (dx=150 exact), palet sluiten; alles terug na reload
- [ ] 👁 handmatig — geld-sleep met VINGER op het digibord (drag-to-create is de nieuwste interactie)
- [ ] 👁 handmatig — "Echt"-stijl van munten/biljetten: realistisch genoeg?

### 2.8 Digibord-pass — 👁 volledig handmatig
- [ ] alles hierboven kort met vinger/stylus: slepen, grip, menu's, wijzers, honderdveld, geld-sleep

### Bekende gaten (geen bugs)
- Lijn/pijl-, vormen- en meetinstrument-tools: uitgeschakeld (P3/P4; instrumenten krijgen echt snappen)
- Geen deel-link voor borden (wel bestand-export)
- Inkt-undo dekt geen widget-verplaatsingen
- Bord heeft geen print-flow (werkblad-printen is ongewijzigd en apart getest)

---

## Donderdag-kern (alles wat écht een mens vraagt, op een rij)
1. Eén echte PDF-print van het gemengde dev-blad (+ 1M-hoofdrekenen apart)
2. Digibord-pass met vinger/stylus (2.8) — vooral inkt-gevoel en geld-sleep
3. De inkt-crash proberen te reproduceren op jouw machine (foutkaart-tekst noteren)
4. Smaak-oordelen: compenseren 1-up, 11px as-labels, noemer-13-cellen, blauwe schrijfband, echt-geld-stijl, timer/adem-tempo
5. Groepjesmaker + namenkiezer met je echte klaslijst
6. Sliders één keer met de hand verslepen (bord-inspector)
