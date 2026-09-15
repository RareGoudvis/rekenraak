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
    // The measurer's breaker tripping means the cell's numbers are whatever got frozen, so
    // the gate must see it as a finding, not a pass. (The softer "N repacks in 1s" warn is
    // the walk's own cadence — several cells per second — and stays out.)
    page.on('console', (m) => {
        if (m.type() === 'error') cellErrors.push(m.text());
        else if (m.type() === 'warning' && m.text().includes('repack loop broken')) cellErrors.push(m.text());
    });
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
                        // The measurer's breaker (12 repacks/s) can trip on the walk's own cadence
                        // and then freezes measurements for 1.5 s; a cell caught in that window is
                        // re-done once after the cooldown instead of being recorded frozen.
                        let measured;
                        for (let attempt = 0; attempt < 2; attempt++) {
                        if (attempt) { await page.waitForTimeout(1700); cellErrors = []; }
                        measured = await page.evaluate(async ({ leaf, width, solutions, seed }) => {
                            const r = window.__rekenraak;
                            const frame = () => new Promise((res) => requestAnimationFrame(res));
                            const emptyNow = () => {
                                const m = r.measured?.();
                                return !document.querySelector('[data-block-id]')
                                    && (!m || (Object.keys(m.cells).length === 0 && Object.keys(m.intrinsic).length === 0));
                            };
                            r.clearBlocks();
                            // Wait for the empty sheet to land before adding: the seed below gives
                            // every cell of a leaf the SAME block id, and the measurer prunes a
                            // gone block in a passive effect. Adding in the same tick let the w4
                            // and w2 intrinsic entries survive into the w1 cell (or not, depending
                            // on effect timing), which clamped its width and flaked its height.
                            const t0c = performance.now();
                            while (!emptyNow() && performance.now() - t0c < 3000) await frame();
                            r.seed(seed);
                            // Exactly what sidebar.tsx's addLeaf does on a real click: registry
                            // defaults + base snapshot (inside the store) + this leaf's override.
                            r.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints);
                            const block = r.getState().blocks[0];
                            if (!block) return { error: 'no block produced' };
                            // Settled = the applied zoom on every ScaledBlock and the measurer's
                            // snapshot are unchanged across two consecutive frames. Two fixed
                            // frames were not enough: the fit loop lowers the zoom one layout
                            // pass at a time and the measure -> repack chain runs behind it, so
                            // the gate used to record whatever height it caught mid-flight.
                            const snap = () => JSON.stringify({
                                z: [...document.querySelectorAll('[data-scaled-inner]')].map((el) => el.style.zoom),
                                m: r.measured?.(),
                            });
                            const settle = async () => {
                                let prev = snap(), stable = 0;
                                const t0 = performance.now();
                                while (stable < 2 && performance.now() - t0 < 3000) {
                                    await frame();
                                    const cur = snap();
                                    stable = cur === prev ? stable + 1 : 0;
                                    prev = cur;
                                }
                            };
                            r.updateBlockSettings(block.id, { widthUnits: width });
                            r.getState().setShowSolutions(!!solutions);
                            await settle();

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
                        if (!cellErrors.some((e) => e.includes('repack loop broken'))) break;
                        }

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
