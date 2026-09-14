# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- Inspector width picker (`updateBlockSettings({ widthUnits })`) marks the block "verouderd" although width is presentation (2026-09-14, seen while testing itemNumbering). Fix direction: add `widthUnits` to `PRESENTATION_SAFE` in useWorksheetStore.tsx and a store test.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
