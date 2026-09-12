# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Generators

## Layout / sheet

- **No sheet font-size scale** (owner question 2026-09-12): viewers use 12 different px sizes
  (14px ×66, 13 ×27, 12 ×22, 16 ×19, 18 ×13, 15 ×13, 17 ×10 …); hoofdrekenen digits 17px,
  labels 14px, grids 12–13px. Nothing is 14pt. Proposal: tokens `--sheet-size-text`,
  `--sheet-size-math`, `--sheet-size-small` in theme.css + a B4c-style sweep; owner picks
  the values. Changes every measured tier/rowUnit → rerun width matrix after.
- **Width tiers are measured per block now** (7a, 2026-09-12; the paragraph that stood here
  listed the 27 types the width matrix could not fit at 163px). `minWidthUnits(block,
  measured)` asks the rendered block how narrow its content can get (PageSheet probes the
  ScaledBlock inner's `min-content` width) instead of reading a per-type table measured at
  default settings — that table had a three-item rekenvolgorde block claiming the whole
  page. The per-type numbers survive as the FIRST-PAINT fallback only. What is left to
  watch: (a) the editorial vetoes in `VETO_MIN` are still judgement, not measurement, and
  the drawing-shaped types (to-scale figures, dials, grids) rely on them; (b) `min-content`
  under-reports text rows, which wrap word by word — a sentence type may now OFFER a quarter
  that reads badly. The teacher has to opt in, nothing moves on its own, but a screenshot
  pass over the sentence types (getalfunctie, tijdsduur, verbanden, geld-rekenen,
  herleidingen) at ¼ would say whether any of them needs a veto too.

## Constraints

## Tooling

## Docs

- Historical links in `UpdateState.md` to `StyleBuilderModal.tsx` ×2, `BaseSettingsPanel.tsx`,
  and `PresetModal.tsx` (ARCHITECTURE history note) point at renamed/deleted files. Accurate
  when written; demote to plain text if they bother anyone (2026-09-12).
- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12).
