# UI-GUIDE.md — how the RekenRaak interface is designed

Single source of truth for the app's chrome: its principles, its tokens, and its canonical
components. **Read this before adding or restyling any UI.**

**Who the interface is for.** A teacher who opens RekenRaak a few times a term, not a power
user who lives in it. Every rule below exists to make the app legible to someone who has
forgotten how it works since last time. When a rule trades expert speed for novice clarity,
that is the intended trade.

> Golden rule: **never hardcode a background, text, border, or accent hex.** Use a token.
> The only sanctioned hex literals are the "worksheet-ink" colors in §3 — they print, so
> they are ink, not chrome.

---

## 0. The eight rules

Each one is testable. §4 turns them into a checklist.

1. **Every label is a teacher's word.** No scope names, no system terms, no jargon a
   teacher would not say out loud. Name a tab or a section after the *object* it edits,
   not the scope it belongs to.
2. **Show the result, not the term.** An exercise name is never alone — a live example
   ([ExercisePreview](../../src/components/shared/ExercisePreview.tsx)) is what actually tells a
   teacher what "kettingsommen" is. Examples are default behaviour, not a preference.
3. **Everything visible, ranked by grouping.** Nothing hides behind a disclosure. Because
   nothing hides, *sectioning* carries the whole hierarchy: titled cards, roughly six
   controls per card, most-used card first, an [InfoTip](../../src/components/ui/InfoTip.tsx) on
   anything a teacher could misread.
4. **One primary action per region.** `Afdrukken` is the only filled accent button in the
   app — it is the end of the workflow and it earns the loudest control. Everything else
   is outlined or plain.
5. **No icon without a word.** The two exceptions are undo/redo and the block's spatial
   handles (up, down, move), which are universal and positional. A `title` tooltip is not
   a label; it does not exist until you hover.
6. **Domain color is identity; `--accent` is state.** A domain hue never means selected,
   hovered, or focused. Selection never borrows a domain hue. This is what keeps the sheet
   from looking like a paint box.
7. **Color never carries meaning alone.** Every domain hue appears beside its own name in
   text. There is one palette and no colorblind mode, so this rule *is* the colorblind
   story: the five hues collapse into roughly two families under deuteranopia, and the
   label is what survives. Never reduce a domain to a bare dot or an untitled stripe.
8. **Screen chrome never prints.** Any affordance added to the A4 — a rail, a hover
   outline, a chip, a focus flash — is `no-print`. The sheet on screen *is* the PDF.

**Destructive controls** follow from 4 and 6: outline-only in `--danger`, filled only on
hover, and never placed beside the primary action.

---

## 1. Design tokens (CSS variables)

Defined in [src/assets/theme.css](../../src/assets/theme.css). **There is one theme.** Tokens sit
on bare `:root` — no `data-theme`, no dark mode, no contrast mode. Always reference as
`var(--token)`, never the raw hex.

Dark and "Contrast" were removed deliberately. Contrast was serving low-vision users, which
is a different need from colorblindness; that need is now met *inside* the one theme by
keeping separators and muted text strong enough to read, rather than by a second palette.

### 1a. Scales

Defined once. **Snap every size to these** instead of inventing pixel values.

| Group | Tokens | Notes |
|---|---|---|
| Spacing (8pt grid) | `--sp-1`=4 · `--sp-2`=8 · `--sp-3`=12 · `--sp-4`=16 · `--sp-5`=20 · `--sp-6`=24 · `--sp-8`=32 · `--sp-10`=40 | padding/gap/margin |
| Radius | `--radius-xs`=6 · `--radius-sm`=8 · `--radius-md`=12 · `--radius-lg`=16 · `--radius-xl`=20 · `--radius-pill`=999px | xs inputs, sm buttons, md cards, lg panels, pill toggles |
| Type | `--text-xs`=11 · `--text-sm`=13 · `--text-base`=14 · `--text-md`=15 · `--text-lg`=17 · `--text-xl`=20 · `--text-2xl`=24 | hierarchy via **weight+size**, never UPPERCASE |
| Font | `--font-ui` | UI chrome only; the worksheet keeps Azeret/Roboto Mono |
| Motion | `--dur-fast`=120ms · `--dur`=180ms · `--dur-slow`=260ms · `--ease-out` · `--ease-spring` | ease-out for fades, spring for toggle knobs |

### 1b. Surfaces, state, elevation

| Token | Use for |
|---|---|
| `--bg-base` | the canvas behind the A4 — a warm off-white, so paper reads as paper |
| `--bg-surface` | panel and card surface |
| `--bg-surface-2` | inset: inputs, segmented track, raised-within-panel |
| `--bg-hover` / `--bg-active` | hover fill / press overlay |
| `--separator` | hairline divider or border |
| `--accent` | **state**: selected, focused, active. The one interactive accent |
| `--accent-strong` | pressed |
| `--accent-soft` | tinted selection fill |
| `--accent-on` | text/icon on a filled accent surface |
| `--danger` / `--danger-soft` | destructive + its tint. **Distinct from every domain hue** |
| `--shadow-1/2/3` | elevation: 1 resting card, 2 menu/CTA, 3 the A4 sheet |
| `--shadow-focus` | keyboard `:focus-visible` ring (applied globally in index.css) |

### 1c. Domain identity

The five domain hues come from the maths method teachers already use, so they stay. Each
domain carries its token name on `Domain.accentVar` in
[appstructure.ts](../../src/config/appstructure.ts) — read it from there, never hardcode a mapping.

| Token | Use for |
|---|---|
| `--accent-<domain>` | the saturated hue: dots, badges, icon tint |
| `--domain-<domain>-line` | medium tint: left rails, grouping rules, block outlines |
| `--domain-<domain>-soft` | very light tint: block fills, header bands |

Domains: `getallenkennis` · `bewerkingen` · `metendrekenen` · `meetkunde` · `vraagstukken`.

**These are identity, never state** (rule 6) and **never appear without their label**
(rule 7). A domain hue on a *control* is always wrong.

**Legacy aliases** — `--bg-dark`→base, `--bg-panel`→surface, `--bg-input`→surface-2,
`--border-color`→separator, `--accent-purple`→accent. Old code keeps working; use the real
names in new code.

**Depth, not boxes.** Separate regions with surface tone + `--shadow-1` + a hairline, not a
heavy border. Hierarchy is weight + size + tone.

---

## 2. Canonical component styles (reuse these — don't invent local copies)

### Config-plugin helpers — [sharedPluginStyles.ts](../../src/components/configurator/plugins/sharedPluginStyles.ts)
`import { sharedPluginStyles as styles }`.
- `styles.section` — wraps one control group.
- `styles.label` — field label (`--text-sm`, weight 500, muted, sentence-case).
- `styles.buttonGroup` — flex row, wraps.
- `styles.radioBtn(active)` — single-select segment.
- `styles.pill(active)` — rounded multi-select chip (independent on/off).
- `styles.onOffRow` / `styles.onOffLabel` / `styles.onOffBtn(on)` — labelled on/off; ON earns
  a solid `--accent` fill (binary = strong signal).

### Switch — [Switch.tsx](../../src/components/ui/Switch.tsx)
`<Switch checked onChange aria-label />` for standalone booleans (label left, switch right).
Prefer over a bare checkbox for document and section toggles.

### Inspector chrome — the `S` object in [Inspector.tsx](../../src/components/configurator/Inspector.tsx)
`S.card` (hairline-separated section), `S.cardTitle` (sentence-case `--text-md` 600, **not**
uppercase), `S.label`, `S.radioBtn(active)`, `S.input`, `S.select`, `S.checkbox`,
`S.switchRow`/`S.switchText`.

Panel structure follows rules 1 and 3. Tabs are named after the object being edited and
ordered **content first**: `Oefeningen` · `Opmaak` · `Blad`. A chip above the tab strip
always says *what* is selected — opdracht number, block label, domain dot **and domain
name**. Inside `Blad`, sections run in page order: `Koptekst` → `Opdrachten` → `Voettekst`.

### Hover / focus / motion
- Hover for inline-styled clickables → `className="ui-hover"`.
- The shared icon button carries `.ui-icon-btn`.
- Keyboard focus rings are global in [index.css](../../src/index.css) via `:focus-visible` +
  `--shadow-focus`. Don't hand-roll outlines. `prefers-reduced-motion` is honored globally.

### Place-value mask canon ("Specifieke getalopbouw" TD D H T E …)
**Call `styles.maskBtn(active)` — do NOT write a local `maskBtnStyle`.** (~12 local copies
were swept out of this codebase; re-introducing one is a regression.) Wrap in
`styles.section` + a `styles.groupLabel`; factor-label `width:56px`, mask row `gap:6`.
Reference: `addition/NaturalSettings.tsx`, `SplitsenConfig.tsx`. Mask data and helpers
(`PLACE_VALUES`, `getMaskPlaces`, `generateMaskedInt`, `numberMatchesMask`) live in
[mathEngine.ts](../../src/services/math/mathEngine.ts).

### THE selected-state rule (one look, everywhere)
Every toggle — segmented `radioBtn`, `maskBtn`, `bridgeBtn`, `pill`, the Inspector segments,
bespoke list-rows — shows the **same** selected treatment: **`--accent-soft` fill +
`--accent` text + a 1px `--accent` ring.** Never a solid accent fill, never `white`/`#fff`
text, never a domain hue (rule 6). The 1px ring is load-bearing — it is what keeps the
selection legible when the soft fill is faint, so keep it. The lone exception is
`onOffBtn`, a binary switch that earns a solid `--accent` fill when ON. A genuinely bespoke
control may carry a local style **only if** it expresses this same rule with tokens and
adapts a shared helper (`{ ...styles.radioBtn(active), … }`).

### macOS control idioms (CSS classes in [index.css](../../src/index.css))
- **Unified segmented control** (`.seg-group` + `.seg-btn[aria-pressed]`): one bezel, thin
  internal dividers, selected segment tinted in place. Use for **small fixed single-select**
  groups. Wrapping or multi-select groups stay as separated buttons
  (`sharedPluginStyles.radioBtn` / `pill` / `maskBtn`).
- **Vibrancy** (`.mac-vibrant`): frosted translucent material on the TopBar and sidebar.
  The Inspector stays opaque for card contrast.
- **Domain section header** (sidebar): full-width band in `--domain-<domain>-soft`, with the
  label and dot in `--accent-<domain>`. The label is mandatory (rule 7).

### IconButton — [IconButton.tsx](../../src/components/ui/IconButton.tsx)
34px tall, `--radius-sm`, whisper-light bezel. `visibleLabel` renders the word beside the
icon — under rule 5 that is the **default**, and omitting it needs a reason. `dataTour`
forwards a `data-tour` anchor. Variants: `primary` (`--accent` bg — reserved for
`Afdrukken`, rule 4), `neutral` (default), `danger` (`--danger-soft` / `--danger`), `active`
(`--accent-soft` / `--accent`). Hover and press live in `.ui-icon-btn`. The `icon` prop takes
a **Phosphor** component.

### Icon library — Phosphor + weight-on-interaction
Icons are **Phosphor** (`@phosphor-icons/react`). App-wide defaults (size 18, weight
`regular`) come from an `IconContext.Provider` in [main.tsx](../../src/main.tsx). Emphasis = a
heavier glyph: IconButton drives `weight` from interaction state
(`iconWeight(variant, emphasized)`) — `active`/`primary` sit `bold` at rest, `neutral`/
`danger` thicken on hover/focus. Phosphor `weight` is a **prop, not CSS**, so weight-on-hover
needs React hover state. Phosphor has no `strokeWidth`; use `weight`.

### Other reusable building blocks
- nl-BE number formatting → `formatMathNumber` ([formatters.ts](../../src/services/math/formatters.ts)).
- maxGetal preset row → `MAX_PRESETS` + button map from `SplitsenConfig`.
- Rooster/grid viewer → `display:grid` + 64px cells + salmon header ([DeelbaarheidViewer.tsx](../../src/components/viewer/DeelbaarheidViewer.tsx)); place-value table in [SplitsenViewer.tsx](../../src/components/viewer/SplitsenViewer.tsx).
- Circle/object grid → `objEl` + `groupRows` in [FractionExerciseItem.tsx](../../src/components/viewer/FractionExerciseItem.tsx).
- Page-safe multi-item flow → [FragmentableGrid](../../src/components/viewer/FragmentableGrid.tsx).

---

## 3. Sanctioned "worksheet-ink" colors (intentionally hardcoded)

These render on the printed A4 and are not chrome, so they are **not** tokens. Reuse these
exact values — don't pick new ones:

| Color | Hex | Use |
|---|---|---|
| Solution red | `#e11d48` | anything that turns red under "Toon oplossingen" |
| Fraction fill | `#93c5fd` | colored part of fraction shapes / tinted grid cells |
| Rooster/splitsen salmon | `#f4cbb8` | table header / place-value box background |
| MAB units | `#fbbf24` | Dienes blocks (eenheden) |
| MAB tens | `#22c55e` | Dienes blocks (tientallen) |
| MAB hundreds | `#ef4444` | Dienes blocks (honderdtallen) |
| MAB thousands | `#3b82f6` | Dienes blocks (duizendtallen) |
| Ink black | `#000` | outlines, rules, answer lines |

---

## 4. Compliance checklist (run against EVERY UI change)

**Novice tests — ask these first:**

1. **Can a stranger name what this control does** from what is on screen, without hovering
   and without prior knowledge? If not, it needs a word (rules 1 and 5).
2. **Is there a word beside every color?** No bare dot, no untitled stripe (rule 7).
3. **Is the primary action unique on this screen?** Only `Afdrukken` is filled (rule 4).
4. **Does the panel say what it is editing** before it shows controls (rule 1)?
5. **Is a live example reachable** for anything named in curriculum vocabulary (rule 2)?

**System tests:**

6. **No local control styles.** A config plugin must not define `maskBtnStyle` /
   `radioBtnStyle` / `bridgeBtnStyle` / `pill` / `toggle` / `tableBtn` / `headerStyle`.
   Import the shared helper. (Grep guard — must return nothing:
   `rg "(maskBtnStyle|radioBtnStyle|bridgeBtnStyle|tableBtnStyle)\s*=|const (pill|toggle)\s*=" src/components/configurator/plugins`.
   `toggleMask`-style *event handlers* are fine; the guard targets style functions.)
7. **One selected look** — `--accent-soft` + `--accent` text + 1px `--accent` ring (§2).
   No solid accent fill, no `white`/`#fff`, no domain hue on a control.
8. **Two label tiers** — `styles.groupLabel` (600, main) for a cluster header;
   `styles.label` (500, muted) for a single control. Nothing else; no `<h4>`.
9. **Tokens only** — bg / text / border / accent / spacing / radius / shadow / motion via
   `var(--token)`. No raw hex except §3. (Grep guard: `rg "#[0-9a-fA-F]{3,6}" src/components`
   — every hit must be a §3 ink color or a commented exception.)
10. **No `data-theme`, no theme branch.** One palette. A style that needs to "work in both
    themes" is a leftover; delete the branch.
11. **Switch over checkbox** for standalone booleans; **IconButton** for icon actions.
12. **Print it.** `Ctrl/Cmd+P` with margins set to `Geen`, and confirm no chrome leaked onto
    the sheet (rule 8) and the page count still matches the screen. Do this before
    committing, not after.
