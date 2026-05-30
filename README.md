# Enderklas Builder

Werkbladengenerator voor het Vlaamse basisonderwijs. Leerkrachten stellen wiskundige oefeningenblokken samen, configureren de moeilijkheidsgraad per blok, bekijken het resultaat live op een virtueel A4-blad, en drukken af of slaan op als PDF.

Live (alpha): [app.enderklas.be](https://app.enderklas.be)

## Wat kan je ermee?

- **Visueel samenstellen** — drie panelen: domeinboom links, A4-voorbeeld in het midden, instellingen rechts.
- **Oefeningen genereren per blok** of in één klik voor het hele werkblad (`Genereer alles`). Vergrendelde blokken (🔒) worden overgeslagen.
- **Werkbundels opslaan en openen** als JSON-bestand — bewaar je layout en deel met collega's.
- **Differentiatie** — instructieprefixen (MAG / MOET / ★ / aangepast), drie scaffoldingniveaus per oefeningtype, schaalbare scoring.
- **Afdrukken** met optionele oplossingen (rood overlay) en nette paginabreuken: kop- en voettekst (school / klas / leerkracht + vrije tekst) herhalen op elke pagina, oefeningen worden nooit middenin afgekapt, en je kan de naamvelden optioneel bovenaan elke pagina herhalen.
- **Toegankelijkheid** — drie thema's (licht / donker / hoog contrast voor kleurenblinden).

## Oefeningtypes

| Domein | Onderdeel | Type |
|---|---|---|
| Getallenkennis | Getalbegrip | Splitsen, MAB (Multibase Arithmetic Blocks) |
| Getallenkennis | Breuken | Kleuren, herkennen, breuk van hoeveelheid, lijnstuk, veelhoek |
| Bewerkingen | Hoofdrekenen (standaardprocedure) | Optellen, aftrekken, vermenigvuldigen, delen — natuurlijk / decimaal / rationaal |
| Bewerkingen | Cijferen | Kolomrekenen optellen / aftrekken / vermenigvuldigen / delen — met ruitjesgrid |
| Meten en metend rekenen | Kloklezen | Analoge en digitale klok |
| Meten en metend rekenen | Geld | Herkennen, bedrag tekenen, wissel, teruggeven |

Meer oefeningtypes worden gefaseerd toegevoegd. Niet-ingevulde plekken in de zijbalk zijn placeholders.

## Tech

React 19 + TypeScript + Vite + Zustand. Alles client-side; geen backend, geen account, geen tracking. Werkbundels leven in het geheugen (en optioneel als JSON-bestand op je eigen schijf).

## Lokaal draaien

```bash
npm install
npm run dev       # dev server (Vite)
npm run build     # tsc -b && vite build
npm run lint
npm run preview   # productiebuild bekijken
```

---

## Architecture — how it fits together

> Written for developers building on this code. The UI text is Dutch, but the code
> and comments are English. This is the quick map; the deep map is
> [ARCHITECTURE.md](ARCHITECTURE.md) and the working rules are [CLAUDE.md](CLAUDE.md).

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

Adding a type = generator + viewer + config + **one row in each registry file** + one leaf in [appstructure.ts](src/config/appstructure.ts). Full 6-step checklist in [ARCHITECTURE.md §5](ARCHITECTURE.md).

### The data model

[types.ts](src/services/math/types.ts) — `MathBlock` is the parent container (one block = one section on the sheet). It carries one exercise array **per family** (`exercises`, `clockExercises`, `mabExercises`, …); only the one named by the registry's `exerciseField` is populated. `MathBlock.constraints` is a loose `any` bag — each generator/config reads the keys it expects; defaults come from `addBlockFromType`.

### Generators

Every generator is `generate<X>Exercises(block): <X>Exercise[]` — read `block.constraints`, generate in a dedup'd retry loop (`MAX_ATTEMPTS`), return a typed array. Shared concepts: `INTERNAL_SCALE = 1_000_000` (integer math to avoid float drift), `operandNMask` (which place-values must be non-zero), `bridges` (carry/borrow = *bruggetje* per column). See [ARCHITECTURE.md §6](ARCHITECTURE.md).

### Viewers & solutions

Each viewer takes a uniform `{ block, showSolutions }` and renders A4-styled HTML from its `block.<field>` array. The global `showSolutions` boolean renders answers in red (`#e11d48`) or as blanks. Multi-item viewers wrap their items in [FragmentableGrid](src/components/viewer/FragmentableGrid.tsx) (see print, below).

### Print / PDF export

There is **no react-pdf** — export is the browser print dialog (Save as PDF), and the on-screen A4 preview *is* what prints. The print system is the tricky part, tuned for Chrome/Edge:

- **`.print-area` is a real `<table>`** (wrapped in a shell `<div>` that keeps the screen card look). Chrome only repeats `<thead>`/`<tfoot>` across printed pages for *real* table markup, so the `<thead>` carries the top margin (+ an optional repeating Naam/Klas strip) and the `<tfoot>` carries the footer (school / klas / leerkracht left, vrije tekst right) — both repeat on every page and reserve their height, so content never overlaps them.
- **`@page { margin: 0 }`** on purpose: the print dialog's "Margins: None/Minimum" silently overrides `@page` margins, so all visible margins come from the table groups instead (thead height, 16mm side padding on the body cell, tfoot height). Robust to any dialog setting.
- **[FragmentableGrid](src/components/viewer/FragmentableGrid.tsx)** — a single CSS `grid`/`flex` container does **not** fragment across pages in Chrome (a too-tall block jumps whole). This component lays items out as a block stack of per-row grids, each row `break-inside:avoid` (`.print-row`), so exercises flow across page breaks while never splitting mid-exercise.
- [usePrint.ts](src/hooks/usePrint.ts) blanks the browser's own header/footer margin boxes, then calls `window.print()`. All print CSS lives in [index.css](src/index.css) (`@page` + `@media print`).

Details + the per-type registry table: [ARCHITECTURE.md §9](ARCHITECTURE.md).

### Persistence & sharing

[persistence.ts](src/services/persistence.ts) — localStorage autosave (1.5 s debounce), named presets, and `#share=…` URL hashes (lz-string compressed, never sent to a server). Nothing leaves the browser except a share link the user copies.

---

## Bijdragen

Bug of suggestie? DM via [X (@ruben_vah)](https://x.com/ruben_vah).

## Licentie

De code valt onder [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

---

Gemaakt door Ruben V.H. — gratis beschikbaar voor leerkrachten.
