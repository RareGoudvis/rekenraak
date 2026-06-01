# UI-GUIDE.md — design tokens & canonical component styles

Single source of truth for colors and component styling in this app. **Read this before
adding or restyling any UI.** It exists because controls kept drifting (e.g. a mask menu
with a hardcoded `#222226` that broke in light/colorblind themes).

> Golden rule: **never hardcode a background, text, border, or accent hex.** Use a CSS
> variable so all three themes work. The only sanctioned hex literals are the
> "worksheet-ink" colors in §3 (they must print identically across themes).

---

## 1. Design tokens (CSS variables)

Defined in [src/assets/theme.css](src/assets/theme.css). Selected via `data-theme` on
`<html>` (`dark` default, `light`, `colorblind`). Always reference as
`var(--token)` — never the raw hex.

### 1a. Scales (theme-independent — Apple-HIG-inspired)

Defined once in `:root`. **Snap every size to these** instead of inventing pixel values.

| Group | Tokens | Notes |
|---|---|---|
| Spacing (8pt grid) | `--sp-1`=4 · `--sp-2`=8 · `--sp-3`=12 · `--sp-4`=16 · `--sp-5`=20 · `--sp-6`=24 · `--sp-8`=32 · `--sp-10`=40 | padding/gap/margin |
| Radius | `--radius-xs`=6 · `--radius-sm`=8 · `--radius-md`=12 · `--radius-lg`=16 · `--radius-xl`=20 · `--radius-pill`=999px | xs inputs, sm buttons, md cards, lg panels, pill toggles/CTAs |
| Type | `--text-xs`=11 · `--text-sm`=13 · `--text-base`=14 · `--text-md`=15 · `--text-lg`=17 · `--text-xl`=20 · `--text-2xl`=24 | hierarchy via **weight+size**, not UPPERCASE |
| Font | `--font-ui` (SF → Segoe → Roboto fallback) | UI chrome only; worksheet keeps Azeret/Roboto Mono |
| Motion | `--dur-fast`=120ms · `--dur`=180ms · `--dur-slow`=260ms · `--ease-out` · `--ease-spring` | ease-out for fades, spring for toggle knobs |

### 1b. Color & elevation (per theme)

| Token | Use for |
|---|---|
| `--bg-base` | app background (behind panels) |
| `--bg-surface` | card / panel surface (raised one step) |
| `--bg-surface-2` | inset: inputs, segmented track, raised-within-panel |
| `--bg-hover` | subtle hover fill (low-alpha neutral) |
| `--separator` | **hairline** divider/border (much softer than the old `--border-color`) |
| `--accent` | **primary accent** — desaturated violet (dark `#8a6fe8` / light `#6b4fc4` / black colorblind) |
| `--accent-strong` | pressed / stronger accent |
| `--accent-soft` | tinted selection fill (accent @ ~12–16%) |
| `--accent-on` | text/icon on a filled accent surface |
| `--danger` / `--danger-soft` | destructive (delete) + its tint |
| `--shadow-1/2/3` | soft layered elevation (1 resting card, 2 menu/CTA, 3 the A4 sheet) |
| `--shadow-focus` | keyboard `:focus-visible` ring (auto-applied in index.css) |
| `--accent-getallenkennis` … `--accent-vraagstukken` | domain tags (unchanged; from `Domain.accentVar`) |

**Legacy aliases** — `--bg-dark`→base, `--bg-panel`→surface, `--bg-input`→surface-2,
`--border-color`→separator, `--accent-purple`→accent, `--accent-purple-dark`→accent-strong.
Old code keeps working; prefer the new names in new code.

**Depth, not boxes.** Separate regions with surface tone + `--shadow-1` + a hairline
`--separator`, not a heavy 1px border. **Hierarchy = weight + size + tone**, never tiny
UPPERCASE + letter-spacing.

---

## 2. Canonical component styles (reuse these — don't invent local copies)

### Config-plugin helpers — [sharedPluginStyles.ts](src/components/configurator/plugins/sharedPluginStyles.ts)
`import { sharedPluginStyles as styles }`.
- `styles.section` — `{ marginBottom: var(--sp-5) }`, wraps one control group.
- `styles.label` — field label (`--text-sm`, weight 500, `--text-muted`, sentence-case).
- `styles.buttonGroup` — `{ display:flex, gap:6, flexWrap:wrap }`.
- `styles.radioBtn(active)` — single-select segment. Active = `--accent-soft` thumb + 1px
  `--accent` ring + `--shadow-1` + accent text (calm, not a solid fill).
- `styles.pill(active)` — rounded multi-select chip (independent on/off), same active treatment.
- `styles.onOffRow` / `styles.onOffLabel` / `styles.onOffBtn(on)` — labelled on/off; ON earns a
  solid `--accent` fill (binary = strong signal).

### Switch (iOS-style toggle) — [Switch.tsx](src/components/ui/Switch.tsx)
`<Switch checked onChange aria-label />` — track fills `--accent` when on, knob slides with
`--ease-spring`. Use for standalone booleans (label-left, switch-right). Prefer over a bare
checkbox for document/section toggles.

### Inspector chrome — `S` object in [Inspector.tsx](src/components/configurator/Inspector.tsx)
`S.card` (surface + `--shadow-1` + `--radius-md`), `S.cardTitle` (sentence-case `--text-md`
600, **not** uppercase), `S.label`, `S.btnGroup`+`S.radioBtn(active)` (segmented: neutral
track, selected = raised `--bg-surface` thumb + accent text), `S.input`, `S.select`,
`S.checkbox`, `S.switchRow`/`S.switchText`, `S.advancedToggle`. Section order in the right
panel: **Opdrachtblok → Engine (Config plugin) → Differentiatie → Geavanceerd**.

### Hover / focus / motion (screen chrome)
- Hover for inline-styled clickables → add `className="ui-hover"` (fills `--bg-hover`).
- The shared icon button carries `.ui-icon-btn` (hover lift + `:active` scale).
- Keyboard focus rings are global in [index.css](src/index.css) via `:focus-visible` +
  `--shadow-focus` — don't hand-roll outlines. `prefers-reduced-motion` is honored globally.

### Mask-button canon (place-value "Specifieke getalopbouw" TD D H T E …)
Every config that shows place-value masks uses **exactly** this — copy it verbatim:
```ts
const maskBtnStyle = (active: boolean): React.CSSProperties => ({
  width: 28, height: 28, fontSize: 10, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
  border: '1px solid var(--border-color)',
  backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
  color: active ? '#fff' : 'var(--text-muted)',
});
```
Wrap the block in `styles.section` + `styles.label`; factor-label width 56px, row
`marginBottom:10`, mask `gap:6`. (Reference: SplitsenConfig.tsx, addition/NaturalSettings.tsx.)
Mask data + helpers (`PLACE_VALUES`, `getMaskPlaces`, `generateMaskedInt`,
`numberMatchesMask`) live in [mathEngine.ts](src/services/math/mathEngine.ts).

### IconButton — [IconButton.tsx](src/components/ui/IconButton.tsx)
34px tall, `--radius-sm`; variants: `primary` (`--accent` bg / `--accent-on`), `neutral`
(`--bg-surface-2` / main text, default), `danger` (`--danger-soft` bg / `--danger`),
`active` (`--accent-soft` bg / `--accent`). Hover/press live in `.ui-icon-btn` (index.css).

### Other reusable building blocks
- nl-BE number formatting → `formatMathNumber` ([formatters.ts](src/services/math/formatters.ts)); preset buttons use `val.toLocaleString('nl-BE')`.
- maxGetal preset row → copy `MAX_PRESETS` + button map from SplitsenConfig.
- Rooster/grid viewer → `display:grid` + 64px cells + salmon header ([DeelbaarheidViewer.tsx](src/components/viewer/DeelbaarheidViewer.tsx)); place-value table in [SplitsenViewer.tsx](src/components/viewer/SplitsenViewer.tsx).
- Circle/object grid → `objEl` + `groupRows` in [FractionExerciseItem.tsx](src/components/viewer/FractionExerciseItem.tsx).
- Page-safe multi-item flow → [FragmentableGrid](src/components/viewer/FragmentableGrid.tsx).

---

## 3. Sanctioned "worksheet-ink" colors (intentionally hardcoded)

These render on the printed A4 and must look the same in every theme, so they are **not**
tokens. Reuse these exact values — don't pick new ones:

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

## 4. Checklist for any new config / UI control

1. Backgrounds / text / borders / accents → `var(--token)`, never raw hex.
2. Reuse a `sharedPluginStyles` / Inspector `S` helper before writing a local style object.
3. Place-value masks → the mask-button canon above (28×28, bg-input, 1px border).
4. Worksheet ink → the §3 table values.
5. Eyeball the result in **all three themes** (dark / light / colorblind) before committing.
