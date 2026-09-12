# Rekenraak

Werkbladengenerator voor het Vlaamse basisonderwijs. Leerkrachten stellen wiskundige oefeningenblokken samen, configureren de moeilijkheidsgraad per blok, bekijken het resultaat live op virtuele A4-pagina's, en drukken af of slaan op als PDF.

Live (alpha): [app.enderklas.be](https://app.enderklas.be)

## Wat kan je ermee?

- **Visueel samenstellen** — drie panelen: domeinboom links, A4-voorbeeld in het midden, instellingen rechts.
- **Oefeningen genereren per blok** of in één klik voor het hele werkblad (`Genereer alles`). Vergrendelde blokken (🔒) worden overgeslagen.
- **Snel toevoegen** — een overzichtsvenster met een live voorbeeld per oefeningtype; kies er meerdere en voeg ze in één keer toe.
- **Basisinstellingen** — stel één keer een standaard moeilijkheidsgraad in (max getal, getalsoort, getalopbouw, bruggetjes, decimalen); elk nieuw blok neemt die over.
- **Leerjaar als startpunt** — kies leerjaar 1–6 en de zijbalk + basisinstellingen vertrekken vanaf dat niveau (een zacht filter, geen slot).
- **Curriculum samenstellen** — kies welke oefeningen ouders mogen toevoegen en bevries de moeilijkheidsgraad, en deel een vergrendelde link (ideaal per handboek).
- **Werkbundels opslaan en openen** als JSON-bestand of als deelbare link (volledig of enkel sjabloon) — bewaar je layout en deel met collega's.
- **Differentiatie** — instructieprefixen (MAG / MOET / ★ / aangepast), scaffoldingniveaus per oefeningtype, schaalbare scoring.
- **Bladonderdelen** — secties, schrijflijnen, ruitjesraster, kader en lege pagina's om het blad af te werken.
- **Afdrukken met echte pagina's** — de app beslist zelf waar een pagina eindigt, dus wat je op het scherm ziet is exact wat er uit de printer komt: elke pagina draagt haar eigen kop- en voettekst (school / klas / leerkracht + vrije tekst), oefeningen worden nooit middenin afgekapt, en je kan de naamvelden optioneel op elke pagina herhalen. Oplossingen desgewenst in het rood meegedrukt.

## Oefeningtypes

Momenteel **51 oefeningtypes** (registry-entries in `src/config/exerciseRegistry.ts`), verdeeld over vier wiskundedomeinen plus een set bladonderdelen:

| Domein | Waar het over gaat |
|---|---|
| **Getallenkennis** | Getalbegrip (splitsen, MAB, plaatswaarde, ordenen, getallenassen en -rijen, even/oneven, vergelijken, afronden, romeinse cijfers, getalpatronen), breuken (kleuren, herkennen, breuk van een hoeveelheid, lijnstuk, veelhoek, bewerken, rangschikken), deelbaarheid (tabel, veelvouden kleuren), verbanden breuk · decimaal · procent |
| **Bewerkingen** | Hoofdrekenen (optellen / aftrekken / vermenigvuldigen / delen, natuurlijk · decimaal · rationaal, 2–4 termen, met bruggetjes en oefenvormen zoals compenseren), cijferen (kolomrekenen met ruitjesgrid), rekenvolgorde en haakjes, kettingsommen, schattend rekenen, procenten, controleren (negenproef, omgekeerde bewerking) |
| **Meetkunde** | Vormleer: punt en lijn, hoeken, figuren (herkennen, benoemen, classificeren) |
| **Meten en metend rekenen** | Kloklezen en tijdsduur, kalender, geld (herkennen, tekenen, wisselen, teruggeven, korting/winst/intrest), lengte meten, omtrek, oppervlakte, herleidingen tussen maateenheden, passende maateenheid kiezen, temperatuur, weegschaal, getalfunctie |
| **Bladonderdelen** | Sectietitel, schrijflijnen, ruitjesraster, kader, lege pagina |

De volledige lijst per `typeId` (generator → oefeningenveld → viewer → configuratieplugin) staat in [.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) §7.

## Tech

React 19 + TypeScript + Vite + Zustand. Alles client-side; geen backend, geen account, geen tracking. Eén thema (warm off-white). Werkbundels leven in het geheugen, met autosave naar localStorage en optioneel als JSON-bestand op je eigen schijf.

## Lokaal draaien

```bash
npm install
npm run dev       # dev server (Vite)
npm run build     # tsc -b && vite build
npm run lint
npm test          # vitest
npm run preview   # productiebuild bekijken
```

---

## Architecture — how it fits together

> Written for developers building on this code. The UI text is Dutch, but the code
> and comments are English. This is the quick map; the deep map is
> [.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) and the working rules are
> [CLAUDE.md](CLAUDE.md).

Everything is client-side React + a **single Zustand store** ([useWorksheetStore.tsx](src/store/useWorksheetStore.tsx)). No backend, no database. State lives in memory; persistence is localStorage (autosave + presets) and shareable URL hashes.

### 3-panel shell & the data flow

[App.tsx](src/App.tsx) renders three columns — Sidebar (domain tree), A4 preview (center), Inspector (right). One exercise block flows end-to-end like this:

```
Sidebar leaf click
  → addBlockFromType(typeId, label)              [store] new MathBlock → blocks[]
Inspector mounts EXERCISE_UI[typeId].Config
  → plugin calls updateBlockSettings(id, { constraints: {…} })
"Genereer" (Inspector) / "Genereer alles" (TopBar)
  → regenerateBlock(block, setExercises)         [services/generateDispatch.ts]
  → REGISTRY[typeId].generate(block) → exercise array
  → setExercises(id, REGISTRY[typeId].exerciseField, array)   [store, generic]
  → EXERCISE_UI[typeId].Viewer re-renders from block.<field>
```

### The registry — adding an exercise type

Exercise types are declared in a **central registry**, keyed by exact `typeId` (no substring matching, no `if (typeId === …)` branches). It's split in two so the store doesn't pull React into a cycle:

- [exerciseRegistry.ts](src/config/exerciseRegistry.ts) — **pure data**: `{ exerciseField, generate, defaultConstraints, defaultCount }`. Read by the store + `generateDispatch`.
- [exerciseUI.tsx](src/config/exerciseUI.tsx) — **React**: `{ Viewer, Config }`. Read by `App.tsx` + `Inspector.tsx`.

Adding a type = generator + viewer + config + **one row in each registry file** + one leaf in [appstructure.ts](src/config/appstructure.ts) + a cost entry in [blockLayout.ts](src/config/blockLayout.ts). Full checklist in [ARCHITECTURE.md §5](.claude/docs/ARCHITECTURE.md).

### The data model

[types.ts](src/services/math/types.ts) — `MathBlock` is the parent container (one block = one section on the sheet). It carries one exercise array **per family** (`exercises`, `clockExercises`, `mabExercises`, …); only the one named by the registry's `exerciseField` is populated. `MathBlock.constraints` is a loose `any` bag — each generator/config reads the keys it expects; defaults come from the registry, layered with the global base settings.

### Generators

Every generator is `generate<X>Exercises(block): <X>Exercise[]` — read `block.constraints`, generate in a dedup'd retry loop (`MAX_ATTEMPTS`), return a typed array. Shared concepts: `INTERNAL_SCALE = 1_000_000` (integer math to avoid float drift), `operandNMask` (which place-values must be non-zero), `bridges` (carry/borrow = *bruggetje* per column). See [ARCHITECTURE.md §6](.claude/docs/ARCHITECTURE.md).

### Viewers & solutions

Each viewer takes a uniform `{ block, showSolutions }` and renders A4-styled HTML from its `block.<field>` array. The global `showSolutions` boolean renders answers in red or as blanks. Multi-item viewers wrap their items in [FragmentableGrid](src/components/viewer/FragmentableGrid.tsx), and every viewer reads its cell's printable width from `useBlockWidth()` rather than a hardcoded constant.

### Print / PDF export — real pages

There is **no react-pdf** — export is the browser print dialog (Save as PDF), and the on-screen A4 preview *is* what prints. Tuned for Chrome/Edge:

- **The app paginates, not the browser.** [pagePacker.ts](src/services/layout/pagePacker.ts) is a pure function (blocks in, pages out, no DOM): it fills a row left to right, starts a new row when the width runs out and a new page when the height budget does. Per-type height and minimum-width costs are *measured* data in [blockLayout.ts](src/config/blockLayout.ts).
- **Each page is its own element.** [PageSheet.tsx](src/components/layout/PageSheet.tsx) renders one page — own header, column grid body, own footer — and ends with `break-after: page`. So the page count on screen equals the page count in the PDF, and real page numbers are possible.
- **`@page { margin: 0 }`** on purpose: the print dialog's "Margins: None/Minimum" silently overrides `@page` margins, so every visible margin comes from the page's own padding instead. Robust to any dialog setting.
- **[FragmentableGrid](src/components/viewer/FragmentableGrid.tsx)** — a single CSS `grid`/`flex` container does **not** fragment across pages in Chrome (a too-tall block jumps whole). This component lays items out as a block stack of per-row grids, each row `break-inside:avoid`, so exercises flow across page breaks while never splitting mid-exercise.
- [usePrint.ts](src/hooks/usePrint.ts) blanks the browser's own header/footer margin boxes, then calls `window.print()`. All print CSS lives in [index.css](src/index.css) (`@page` + `@media print`).

Details: [ARCHITECTURE.md §9](.claude/docs/ARCHITECTURE.md).

### Persistence & sharing

[persistence.ts](src/services/persistence.ts) — localStorage autosave (1.5 s debounce), named presets, and `#share=…` URL hashes (lz-string compressed, never sent to a server). Nothing leaves the browser except a share link the user copies.

---

## Bijdragen

Bug of suggestie? DM via [X (@ruben_vah)](https://x.com/ruben_vah).

## Licentie

De code valt onder [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

---

Gemaakt door Ruben V.H. — gratis beschikbaar voor leerkrachten.
