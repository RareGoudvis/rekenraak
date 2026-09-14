// The leaf walk both visual harnesses share: open the dev app, and for every sidebar leaf
// x width x solutions add the block exactly the way a sidebar click does, measure the cell
// and screenshot it. Extracted from font-baseline.mjs so visual-gate.mjs can reuse it
// instead of keeping a third copy of the same Playwright choreography.
//
// Needs the DEV-only window.__rekenraak hook (src/main.tsx) — it cannot run against a
// production build.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {{url:string,out:string,widths:number[],seed:number,only?:string[],
 *          screenshots?:boolean,log?:(s:string)=>void,onRow?:(r:object)=>void}} opts
 */
export async function walkLeaves(opts) {
    const {
        url, out, widths, seed, only = [],
        screenshots = true, log = console.log, onRow,
    } = opts;

    mkdirSync(out, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

    // Console errors are collected per cell: a viewer that logs but does not throw still
    // renders something, and that is exactly the regression the gate wants to see.
    let cellErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') cellErrors.push(m.text()); });
    page.on('pageerror', (e) => cellErrors.push(String(e)));

    try {
        await page.goto(url);
        await page.waitForFunction(() => !!window.__rekenraak);
        // Fresh profile has no autosave, but skip the tour overlay defensively — it steals
        // focus and sits over the sheet, obscuring the very first cell measured.
        await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
        await page.reload();
        await page.waitForFunction(() => !!window.__rekenraak);

        let leaves = await page.evaluate(() => window.__rekenraak.leaves);
        if (only.length) leaves = leaves.filter(l => only.includes(l.id) || only.includes(l.typeId));

        const rows = [];
        for (const leaf of leaves) {
            for (const width of widths) {
                for (const solutions of [0, 1]) {
                    const key = `${leaf.id}-w${width}-s${solutions}`;
                    const base = { leafId: leaf.id, path: leaf.path, typeId: leaf.typeId, width, solutions };
                    cellErrors = [];
                    try {
                        const measured = await page.evaluate(async ({ leaf, width, solutions, seed }) => {
                            const r = window.__rekenraak;
                            r.seed(seed);
                            r.clearBlocks();
                            // Exactly what sidebar.tsx's addLeaf does on a real click: registry
                            // defaults + base snapshot (inside the store) + this leaf's override.
                            r.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints);
                            const block = r.getState().blocks[0];
                            if (!block) return { error: 'no block produced' };
                            r.updateBlockSettings(block.id, { widthUnits: width });
                            r.getState().setShowSolutions(!!solutions);
                            // Two frames: one for React to commit the width/solutions change,
                            // one for the measure -> repack pass PageSheet triggers off it.
                            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

                            const cell = document.querySelector(`[data-block-id="${block.id}"]`);
                            if (!cell) return { error: 'cell not found after render' };

                            // Same probe PageSheet.tsx runs internally (probeIntrinsicWidth) —
                            // replicated here because that measurement lives in React state, not
                            // on window, and swapping the inline width is cheap and non-destructive.
                            const inner = cell.querySelector('[data-scaled-inner]');
                            let intrinsicPx;
                            if (inner) {
                                const prev = inner.style.width;
                                inner.style.width = 'min-content';
                                const local = inner.scrollWidth;
                                inner.style.width = prev;
                                const scale = Number(inner.dataset.scale) || 1;
                                intrinsicPx = local > 0 ? local * scale : undefined;
                            }

                            return {
                                cellHeightPx: cell.offsetHeight,
                                intrinsicPx: intrinsicPx ?? null,
                                text: cell.innerText,
                            };
                        }, { leaf, width, solutions, seed });

                        if (measured.error) {
                            const row = { ...base, error: measured.error, consoleErrors: [...cellErrors] };
                            rows.push(row); onRow?.(row);
                            log(`! ${key}: ${measured.error}`);
                            continue;
                        }

                        let shot;
                        if (screenshots) {
                            shot = `${key}.png`;
                            try {
                                await page.locator('[data-block-id]').first().screenshot({ path: join(out, shot) });
                            } catch { shot = undefined; /* off-screen, still record the numbers */ }
                        }

                        const row = {
                            ...base,
                            cellHeightPx: measured.cellHeightPx,
                            intrinsicPx: measured.intrinsicPx,
                            text: measured.text,
                            screenshot: shot,
                            consoleErrors: [...cellErrors],
                        };
                        rows.push(row); onRow?.(row);
                    } catch (err) {
                        const row = { ...base, error: String(err), consoleErrors: [...cellErrors] };
                        rows.push(row); onRow?.(row);
                        log(`! ${key} threw: ${err}`);
                    }
                }
            }
        }
        return { rows, leaves };
    } finally {
        await browser.close();
    }
}

export const cellKey = (r) => `${r.leafId}-w${r.width}-s${r.solutions}`;
