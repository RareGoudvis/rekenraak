// Height audit: does the packer decide "does this fit?" with the numbers the PAPER uses?
//
// The tail hint told a teacher a block had to be split onto the next page while the page
// visibly had room for it (2026-09-12), so the whole height chain is printed side by side
// for one sheet of mixed blocks:
//
//   measuredPx  what the packer read out of useMeasuredHeights (window.__rekenraak.measured)
//   ownPx       the BLOCK's own height: .print-block offsetHeight + its margins
//   rowPx       the grid CELL's rect height — a stretched cell reports its ROW's height,
//               which is why ownPx and rowPx are printed apart
//   printPx     the printable content: .print-opdracht top to the last .print-row bottom
//   chromePx    ownPx - printPx: block padding/border/margin around the printed content
//   Δ pack      measuredPx - ownPx: the packer disagreeing with the paper
//
// and per page:
//
//   bodyPx      the measured page budget (.page-sheet-body clientHeight / zoom)
//   cssBodyPx   the SAME box derived from the print CSS mm values (297mm - head - foot)
//
// Usage (dev server must be running):
//   npm run dev
//   node scripts/height-audit.mjs --url http://localhost:5173/
//
// Prints a table and a one-line verdict per systematic error. Writes nothing.

import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL = arg('url', 'http://localhost:5173/');
const SEED = Number(arg('seed', 1234));
const VIEWPORT_W = Number(arg('width', 1600));

// Ten mixed blocks: two-column arithmetic, a drawing type, a grid type, a sentence type
// and one that is taller than a row on its own, so the audit sees more than one shape of
// cell. Widths are mixed too — a row that shares two blocks is where the row-gap and the
// "tallest cell" rule can disagree with the grid.
const PLAN = [
    { typeId: 'hr-std-optellen', width: 2 },
    { typeId: 'hr-std-aftrekken', width: 2 },
    { typeId: 'splitsen', width: 2 },
    { typeId: 'klok-kloklezen', width: 2 },
    { typeId: 'cijferen-optellen-nat', width: 4 },
    { typeId: 'getallenrijen', width: 4 },
    { typeId: 'plaatswaarde', width: 1 },
    { typeId: 'deelbaarheid', width: 1 },
    { typeId: 'tijdsduur', width: 4 },
    { typeId: 'geld-herkennen', width: 4 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VIEWPORT_W, height: 1100 } });
// A repack-loop warning is itself a finding: it means the measure->pack->measure chain
// did not converge and the hook froze whatever height it was holding.
const warnings = [];
page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console.error]', m.text());
    if (m.type() === 'warning' && m.text().includes('[layout]')) warnings.push(m.text());
});
await page.goto(URL);
await page.waitForFunction(() => !!window.__rekenraak);
await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
await page.reload();
await page.waitForFunction(() => !!window.__rekenraak);

await page.evaluate(async ({ plan, seed }) => {
    const r = window.__rekenraak;
    r.clearBlocks();
    r.seed(seed);
    for (const p of plan) {
        r.addBlockFromType(p.typeId, 'Oefening');
        const blocks = r.getState().blocks;
        r.updateBlockSettings(blocks[blocks.length - 1].id, { widthUnits: p.width });
    }
    // Let the measure -> repack -> remeasure chain reach its fixed point before reading.
    for (let i = 0; i < 8; i++) await new Promise((res) => requestAnimationFrame(res));
    await new Promise((res) => setTimeout(res, 400));
    // Then wait out any breaker cooldown and force ONE more measure pass, the way a
    // teacher touching anything would. A height that is only right because the breaker
    // froze the sheet before the wrong value could be written is not right.
    await new Promise((res) => setTimeout(res, 1800));
    // A selection change re-renders App without touching any height, and PageSheet's
    // measure effect has no dep array, so this is exactly one more measure pass.
    r.getState().setActiveSelection('document');
    for (let i = 0; i < 6; i++) await new Promise((res) => requestAnimationFrame(res));
    r.getState().setActiveSelection(null);
    for (let i = 0; i < 6; i++) await new Promise((res) => requestAnimationFrame(res));
    await new Promise((res) => setTimeout(res, 400));
}, { plan: PLAN, seed: SEED });

const audit = await page.evaluate(() => {
    const MM = 96 / 25.4;                       // 1mm at 96dpi
    const sheet = document.querySelector('.page-sheet');
    const zoom = sheet.getBoundingClientRect().width / 794;
    const px = (v) => Math.round((v / zoom) * 10) / 10;

    const pages = [...document.querySelectorAll('.page-sheet')].map((pg, index) => {
        const body = pg.querySelector('.page-sheet-body');
        const bodyRect = body.getBoundingClientRect();
        const head = pg.querySelector('.page-sheet-head');
        const foot = pg.querySelector('.page-sheet-foot');
        const headCs = getComputedStyle(head);
        const gap = parseFloat(headCs.marginBottom) || 0;
        // The print CSS box: 297mm minus the printed head (8mm padding + its content) and
        // the printed foot (4mm + 8mm + its content). Head/foot CONTENT is whatever it is
        // on screen; only the paddings differ between screen px and print mm, and they are
        // the same lengths — this is the check that says so.
        const cssBody = 297 * MM
            - (8 * MM + (px(head.getBoundingClientRect().height) - parseFloat(headCs.paddingTop)))
            - gap
            - (12 * MM + (px(foot.getBoundingClientRect().height) - parseFloat(getComputedStyle(foot).paddingTop) - parseFloat(getComputedStyle(foot).paddingBottom)));

        const cells = [...body.children].filter(c => c.dataset && c.dataset.blockId).map(cell => {
            const cs = getComputedStyle(cell);
            const rect = cell.getBoundingClientRect();
            const opdracht = cell.querySelector('.print-opdracht');
            const rows = [...cell.querySelectorAll('.print-row')];
            const top = (opdracht ?? cell).getBoundingClientRect().top;
            const bottom = rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom
                : (cell.querySelector('.print-block') ?? cell).getBoundingClientRect().bottom;
            const inner = cell.firstElementChild;
            const ics = inner ? getComputedStyle(inner) : cs;
            const innerMargins = (parseFloat(ics.marginTop) || 0) + (parseFloat(ics.marginBottom) || 0);
            return {
                blockId: cell.dataset.blockId,
                width: Number(cell.dataset.width),
                typeId: '',
                ownPx: inner ? Math.round(inner.offsetHeight + innerMargins) : cell.offsetHeight,
                rowPx: px(rect.height),
                printPx: Math.round(px(bottom - top)),
            };
        });
        return {
            index,
            bodyPx: px(bodyRect.height),
            bodyClientPx: Math.round(body.clientHeight / zoom),
            cssBodyPx: Math.round(cssBody),
            rowGapCssPx: parseFloat(getComputedStyle(body).rowGap) || 0,
            cells,
        };
    });

    const snap = window.__rekenraak.measured();
    const state = window.__rekenraak.getState();
    const typeOf = Object.fromEntries(state.blocks.map(b => [b.id, b.typeId]));
    for (const p of pages) for (const c of p.cells) {
        c.typeId = typeOf[c.blockId] ?? '?';
        c.measuredPx = snap?.cells[`${c.blockId}:${c.width}`];
    }
    return { zoom, pages, blockSpacing: state.docSettings.blockSpacing ?? 12, body: snap?.body };
});

await browser.close();

const pad = (s, n) => String(s).padEnd(n);
const num = (v, n = 8) => String(v === undefined ? '–' : v).padStart(n);

console.log(`sheetZoom ${audit.zoom.toFixed(3)}  blockSpacing ${audit.blockSpacing}px  measured body ${JSON.stringify(audit.body)}`);
for (const p of audit.pages) {
    console.log(`\n── page ${p.index + 1} ── body measured ${p.bodyClientPx}px · from print CSS ${p.cssBodyPx}px · delta ${p.bodyClientPx - p.cssBodyPx}px · grid rowGap ${p.rowGapCssPx}px`);
    console.log(`${pad('typeId', 24)}${pad('w', 3)}${num('measured')}${num('own')}${num('row')}${num('print')}${num('chrome')}${num('Δ pack')}`);
    for (const c of p.cells) {
        const chrome = Math.round((c.ownPx - c.printPx) * 10) / 10;
        const delta = c.measuredPx === undefined ? undefined : Math.round((c.measuredPx - c.ownPx) * 10) / 10;
        console.log(`${pad(c.typeId, 24)}${pad(c.width, 3)}${num(c.measuredPx)}${num(c.ownPx)}${num(c.rowPx)}${num(c.printPx)}${num(chrome)}${num(delta)}`);
    }
}

// ── Verdicts ────────────────────────────────────────────────────────────────
const all = audit.pages.flatMap(p => p.cells);
const packMiss = all.filter(c => c.measuredPx !== undefined && Math.abs(c.measuredPx - c.ownPx) > 1);
console.log(`
(a) packer vs paper: ${packMiss.length}/${all.length} cells where the packed height != the block's own height`
    + (packMiss.length ? ` (worst ${Math.max(...packMiss.map(c => Math.abs(c.measuredPx - c.ownPx)))}px)` : ''));
const stretched = all.filter(c => c.rowPx - c.ownPx > 1);
console.log(`(a2) stretched cells (their rect is their ROW's height, not their own): ${stretched.length ? stretched.map(c => `${c.typeId} ${c.ownPx}->${c.rowPx}`).join(', ') : 'none'}`);
const gapMiss = audit.pages.filter(p => Math.abs(p.rowGapCssPx - audit.blockSpacing) > 0.5);
console.log(`(b) row gap: CSS ${audit.pages[0]?.rowGapCssPx}px vs packer ${audit.blockSpacing}px — ${gapMiss.length ? 'DISAGREE' : 'agree'}`);
const bodyMiss = audit.pages.filter(p => Math.abs(p.bodyClientPx - p.cssBodyPx) > 2);
console.log(`(c) page budget: ${bodyMiss.length ? bodyMiss.map(p => `page ${p.index + 1} off by ${p.bodyClientPx - p.cssBodyPx}px`).join(', ') : 'screen body == print body on every page'}`);
const unmeasured = all.filter(c => c.measuredPx === undefined);
console.log(`(e) repack-loop warnings: ${warnings.length ? warnings.join(' | ') : 'none'}`);
console.log(`(d) unmeasured cells (packer fell back to the estimate): ${unmeasured.length ? unmeasured.map(c => `${c.typeId}@${c.width}`).join(', ') : 'none'}`);
