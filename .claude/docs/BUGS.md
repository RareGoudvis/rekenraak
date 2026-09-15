# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- Inspector width picker (`updateBlockSettings({ widthUnits })`) marks the block "verouderd" although width is presentation (2026-09-14, seen while testing itemNumbering). Fix direction: add `widthUnits` to `PRESENTATION_SAFE` in useWorksheetStore.tsx and a store test.

- Visual gate (`npm run visual:gate -- --files src/index.css`) flags cells on UNCHANGED code: `cijferen-aftrekken-dec w1 s0` (460→850, tier 1→0; its s1 twin's baseline is already 850) and `vormleer-punt-lijn-herkennen w1/w2` (tier 0/1→2) (2026-09-15, two runs in a row, seed 1234). The fit loop / measurement is not settled when the gate reads the cell; the baseline rows were recorded mid-fit. Fix direction: make the gate wait for `data-scaled-inner` zoom convergence (or the breaker) before reading, then rebaseline those rows.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
