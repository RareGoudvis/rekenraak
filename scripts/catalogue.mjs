// Exercise catalogue: renders every sidebar leaf, screenshots it, and splices the result
// into public/oefeningen.html between marker comments — the page shell (chrome, intro
// copy) stays hand-editable, only the catalogue section/sidebar-nav/ItemList JSON-LD
// are generated.
//
// Walks window.__rekenraak.leaves — the same flattened set the sidebar renders and
// scripts/font-baseline.mjs measures (see flattenLeaves() in src/config/appstructure.ts).
// For each leaf: clears the sheet, adds the block with its defaultConstraints exactly the
// way a sidebar click does (addBlockFromType), forces full width, screenshots the block
// cell to public/oefeningen/<leafId>.png, and resolves its opdracht-titel *inside the
// browser* — a leaf's `instruction` can be a function, which is lost the moment Playwright
// serialises the leaf back to Node, so the function is called (or the string read) while
// the real object is still alive on window.__rekenraak.leaves.
//
// Usage (dev server must already be running):
//   node scripts/catalogue.mjs --url http://localhost:5173/ --seed 1234
//
// Writes public/oefeningen/<leafId>.png (one per leaf) and rewrites the three marker
// blocks inside public/oefeningen.html: <!-- catalogue-jsonld:start/end --> (ItemList
// JSON-LD, in <head>), <!-- catalogue-nav:start/end --> (sidebar domain/subdomain/leaf
// nav) and <!-- catalogue:start/end --> (the card section in <main>).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL = arg('url', 'http://localhost:5173/');
const SEED = Number(arg('seed', 1234));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const IMG_DIR = join(PUBLIC_DIR, 'oefeningen');
// The page shell lives at the repo root now (a Vite-built page, not a public/ static
// file — see vite.config.ts build.rollupOptions.input) so it can pull in the app's real
// CSS via src/site.ts; only the generated markers below are rewritten by this script.
const OEFENINGEN_HTML = join(ROOT, 'oefeningen.html');
const SITE = 'https://www.rekenraak.be';

// Domain label -> the domain half of its --accent-<name> token (src/config/appstructure.ts
// APP_STRUCTURE, accentVar). Hardcoded rather than read from the page: the sidebar nav is
// plain static HTML, and these five domain labels are stable Dutch product names.
const DOMAIN_ACCENT = {
    'Getallenkennis': 'getallenkennis',
    'Bewerkingen': 'bewerkingen',
    'Meetkunde': 'meetkunde',
    'Meten en metend rekenen': 'metendrekenen',
    'Bladonderdelen': 'vraagstukken',
};

// Fresh output dir each run so a renamed/removed leaf doesn't leave a stale png behind.
rmSync(IMG_DIR, { recursive: true, force: true });
mkdirSync(IMG_DIR, { recursive: true });

// Cheap key -> Dutch label map so common settings read as real words instead of raw
// constraint keys. Anything not covered here falls back to a generic sentence — this is
// deliberately not exhaustive (see plugin components for the authoritative labels).
const KEY_LABELS = {
    numberType: 'getalsoort', maxGetal: 'maximumgetal', decimalPlaces: 'aantal cijfers na de komma',
    bridges: 'brug (MAG/MOET/NOOIT)', operatorMode: 'volgorde', subType: 'variant', operator: 'bewerking',
    layout: 'weergave', divisors: 'deeltallen', roundTargets: 'afrondingsdoel', percents: "percentages",
    measure: 'grootheid', units: 'eenheden', mode: 'modus', variant: 'variant', classify: 'indeling',
    clockType: 'kloktype', exerciseMode: 'oefenvorm', answerMode: 'antwoordvorm', chooseTarget: 'doel',
    target: 'doelgroep', concepts: 'eigenschappen', scaffolding: 'ondersteuning', multiplicationMode: 'tafelmodus',
    selectedTables: 'tafels', maxDenominator: 'grootste noemer', maxTotal: 'maximumtotaal', maxEuro: "maximumbedrag",
    fractionStep: 'stapgrootte (breuk)', step: 'stapgrootte', ticks: 'aantal punten', direction: 'richting',
    leftRep: 'linkervorm', rightRep: 'rechtervorm', viewMode: 'weergavemodus', rasterVorm: 'rastervorm',
};

function describeSettings(defaultConstraints) {
    const keys = Object.keys(defaultConstraints ?? {}).filter(k => KEY_LABELS[k]);
    if (!keys.length) {
        return 'Instelbaar: aantal, breedte, lettergrootte, schrijfruimte en de opties in het configuratiepaneel.';
    }
    const labels = [...new Set(keys.map(k => KEY_LABELS[k]))];
    const joined = labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}`;
    return `Instelbaar: ${joined}, plus aantal, breedte, lettergrootte en schrijfruimte.`;
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });

await page.goto(URL);
await page.waitForFunction(() => !!window.__rekenraak);
await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
await page.reload();
await page.waitForFunction(() => !!window.__rekenraak);

const leaves = await page.evaluate(() => window.__rekenraak.leaves.map(l => ({
    id: l.id, path: l.path, typeId: l.typeId, label: l.label, defaultConstraints: l.defaultConstraints,
})));
console.log(`${leaves.length} leaves, seed ${SEED}`);

const rows = [];
const t0 = Date.now();

for (const leaf of leaves) {
    const key = leaf.id;
    try {
        const result = await page.evaluate(async ({ leaf, seed }) => {
            const r = window.__rekenraak;
            r.seed(seed);
            r.clearBlocks();
            r.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints);
            const block = r.getState().blocks[0];
            if (!block) return { error: 'no block produced' };
            r.updateBlockSettings(block.id, { widthUnits: 4 });
            // addBlockFromType auto-selects the new block, which paints it with the app's
            // blue selection background — deselect before the screenshot so the catalogue
            // pngs show the plain white sheet a teacher actually sees.
            r.getState().setActiveSelection(null);
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

            const cell = document.querySelector(`[data-block-id="${block.id}"]`);
            if (!cell) return { error: 'cell not found after render' };

            // Resolve the opdracht-titel here, while the leaf object (and its instruction
            // function, if any) is still a live reference — Playwright would drop the
            // function the moment this leaf crosses back to Node as a return value.
            const realLeaf = r.leaves.find((x) => x.id === leaf.id);
            let instruction = null;
            if (realLeaf && realLeaf.instruction !== undefined) {
                instruction = typeof realLeaf.instruction === 'function'
                    ? realLeaf.instruction(realLeaf.defaultConstraints ?? {})
                    : realLeaf.instruction;
            }
            return { blockId: block.id, instruction };
        }, { leaf, seed: SEED });

        if (result.error) {
            rows.push({ ...leaf, error: result.error });
            console.log(`! ${key}: ${result.error}`);
            continue;
        }

        const shot = `${leaf.id}.png`;
        const cellHandle = page.locator(`[data-block-id]`).first();
        let box;
        try {
            box = await cellHandle.boundingBox();
            await cellHandle.screenshot({ path: join(IMG_DIR, shot) });
        } catch (e) {
            rows.push({ ...leaf, error: `screenshot failed: ${e}` });
            console.log(`! ${key} screenshot failed: ${e}`);
            continue;
        }

        rows.push({
            ...leaf,
            instruction: result.instruction ?? leaf.label,
            screenshot: shot,
            // deviceScaleFactor 1, so the CSS bounding box equals the PNG's pixel size —
            // <img width height> avoids layout shift while the lazy image loads.
            imgWidth: Math.round(box?.width ?? 600),
            imgHeight: Math.round(box?.height ?? 300),
        });
    } catch (err) {
        rows.push({ ...leaf, error: String(err) });
        console.log(`! ${key} threw: ${err}`);
    }
}

await browser.close();

const skipped = rows.filter(r => r.error);
const ok = rows.filter(r => !r.error);
const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${rows.length} rows (${ok.length} ok, ${skipped.length} skipped) in ${elapsedS}s`);
if (skipped.length) {
    console.log('Skipped:');
    for (const s of skipped) console.log(`  ${s.id}: ${s.error}`);
}

// Total png size, for a quick sanity check against the ~60 KB/image budget.
let totalBytes = 0;
let overBudget = [];
for (const f of readdirSync(IMG_DIR)) {
    const sz = statSync(join(IMG_DIR, f)).size;
    totalBytes += sz;
    if (sz > 60 * 1024) overBudget.push(`${f} (${(sz / 1024).toFixed(0)} KB)`);
}
console.log(`Images: ${ok.length}, total ${(totalBytes / 1024).toFixed(0)} KB`);
if (overBudget.length) console.log(`Over 60 KB: ${overBudget.join(', ')}`);

// ── group by domain › subdomain (path = "Domein › Subdomein › Type[ › Leaf]") ───────
const domains = new Map(); // domainLabel -> Map(subLabel -> rows[])
for (const row of ok) {
    const parts = row.path.split(' › ');
    const domainLabel = parts[0];
    const subLabel = parts[1] ?? '';
    if (!domains.has(domainLabel)) domains.set(domainLabel, new Map());
    const subs = domains.get(domainLabel);
    if (!subs.has(subLabel)) subs.set(subLabel, []);
    subs.get(subLabel).push(row);
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Sidebar "Oefeningen" group: domain headers (colour rail like the app's sidebar) with
// subdomain labels and one leaf row per card. Clicking a row filters the catalogue below
// (see src/site.ts) — the href still lets no-JS / crawlers jump there. data-leaf carries
// the APP_STRUCTURE leaf id so a vitest guard can diff this file against the registry and
// catch a shipped exercise type whose catalogue entry was never regenerated.
let navHtml = '';
// Main-column catalogue section: same domain/subdomain/card structure as the old
// standalone oefeningen.html.
let sectionHtml = `    <!-- catalogue: seed ${SEED}, ${new Date().toISOString().slice(0, 10)}, ${ok.length} leaves -->\n`;
for (const [domainLabel, subs] of domains) {
    const domId = slug(domainLabel);
    const accent = DOMAIN_ACCENT[domainLabel] ?? 'bewerkingen';

    navHtml += `      <div class="site-domain">\n`;
    navHtml += `        <div class="site-domain-head" style="--rail: var(--domain-${accent}-line); --fill: var(--domain-${accent}-soft)">${esc(domainLabel)}</div>\n`;
    navHtml += `        <div class="site-domain-body">\n`;

    sectionHtml += `    <section id="${domId}">\n      <h2>${esc(domainLabel)}</h2>\n`;
    for (const [subLabel, leafRows] of subs) {
        if (subLabel) {
            navHtml += `          <div class="site-sub-label">${esc(subLabel)}</div>\n`;
            sectionHtml += `      <h3>${esc(subLabel)}</h3>\n`;
        }
        for (const row of leafRows) {
            navHtml += `          <a class="sidebar-row site-row" href="#${esc(row.id)}" data-card="${esc(row.id)}" data-leaf="${esc(row.id)}">${esc(row.label)}</a>\n`;
            sectionHtml += `      <article class="ex-card" id="${esc(row.id)}" data-leaf="${esc(row.id)}" data-type="${esc(row.typeId)}">
        <h4>${esc(row.label)}</h4>
        <p class="ex-instruction">&ldquo;${esc(row.instruction)}&rdquo;</p>
        <p class="ex-desc">${esc(describeSettings(row.defaultConstraints))}</p>
        <img src="/oefeningen/${esc(row.screenshot)}" alt="Voorbeeld van de oefening ${esc(row.label)}" loading="lazy" width="${row.imgWidth}" height="${row.imgHeight}" />
      </article>\n`;
        }
    }
    navHtml += `        </div>\n      </div>\n`;
    sectionHtml += `    </section>\n`;
}

const itemListJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Oefentypes in RekenRaak',
    itemListElement: ok.map((row, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: row.label,
        url: `${SITE}/oefeningen.html#${row.id}`,
    })),
}, null, 2);

// ── splice the three generated blocks into the hand-edited faq.html ────────────────
function replaceBetween(html, startMark, endMark, content) {
    const s = html.indexOf(startMark);
    const e = html.indexOf(endMark, s + startMark.length);
    if (s === -1 || e === -1) throw new Error(`marker not found or out of order: ${startMark} / ${endMark}`);
    return html.slice(0, s + startMark.length) + '\n' + content.replace(/\n$/, '') + '\n' + html.slice(e);
}

let pageHtml = readFileSync(OEFENINGEN_HTML, 'utf8');
pageHtml = replaceBetween(pageHtml, '<!-- catalogue-jsonld:start -->\n  <script type="application/ld+json">\n', '\n  </script>\n  <!-- catalogue-jsonld:end -->', itemListJson);
pageHtml = replaceBetween(pageHtml, '<!-- catalogue-nav:start -->', '<!-- catalogue-nav:end -->', navHtml);
pageHtml = replaceBetween(pageHtml, '<!-- catalogue:start -->', '<!-- catalogue:end -->', sectionHtml);
writeFileSync(OEFENINGEN_HTML, pageHtml);
console.log(`\nWrote ${ok.length} cards into ${OEFENINGEN_HTML}`);
