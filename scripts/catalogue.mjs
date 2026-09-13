// Exercise catalogue: build public/oefeningen.html + one PNG per sidebar leaf, so the
// full exercise list is indexable (SEO) and browsable outside the app.
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
//   node scripts/catalogue.mjs --url http://localhost:5175/ --seed 1234
//
// Writes public/oefeningen/<leafId>.png (one per leaf) and public/oefeningen.html.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
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
const OUT_HTML = join(PUBLIC_DIR, 'oefeningen.html');
const SITE = 'https://www.rekenraak.be';

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

let toc = '<ul class="toc">\n';
let sections = '';
for (const [domainLabel, subs] of domains) {
    const domId = slug(domainLabel);
    toc += `      <li><a href="#${domId}">${esc(domainLabel)}</a> <span class="domain-count">(${[...subs.values()].reduce((n, a) => n + a.length, 0)})</span></li>\n`;
    sections += `\n    <section id="${domId}">\n      <h2>${esc(domainLabel)}</h2>\n`;
    for (const [subLabel, leafRows] of subs) {
        if (subLabel) sections += `      <h3>${esc(subLabel)}</h3>\n`;
        for (const row of leafRows) {
            sections += `      <article class="ex-card" id="${esc(row.id)}">
        <h4>${esc(row.label)}</h4>
        <p class="ex-instruction">&ldquo;${esc(row.instruction)}&rdquo;</p>
        <p class="ex-desc">${esc(describeSettings(row.defaultConstraints))}</p>
        <img src="/oefeningen/${esc(row.screenshot)}" alt="Voorbeeld van de oefening ${esc(row.label)}" loading="lazy" width="${row.imgWidth}" height="${row.imgHeight}" />
      </article>\n`;
        }
    }
    sections += `    </section>\n`;
}
toc += '    </ul>';

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

const today = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="nl-BE">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <title>Oefeningen — alle oefentypes van RekenRaak</title>
  <meta name="description" content="Alle ${ok.length} oefentypes van RekenRaak op een rij: getallenkennis, bewerkingen, meten en metend rekenen, meetkunde. Met voorbeeld en instelbare opties per oefening." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE}/oefeningen.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Oefeningen — alle oefentypes van RekenRaak" />
  <meta property="og:description" content="Alle oefentypes van RekenRaak op een rij, met voorbeeld en instelbare opties." />
  <meta property="og:url" content="${SITE}/oefeningen.html" />
  <meta property="og:locale" content="nl_BE" />
  <meta property="og:image" content="${SITE}/favicon-96x96.png" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Oefeningen — alle oefentypes van RekenRaak" />
  <meta name="twitter:description" content="Alle oefentypes van RekenRaak op een rij, met voorbeeld en instelbare opties." />
  <meta name="twitter:image" content="${SITE}/favicon-96x96.png" />
  <script type="application/ld+json">
${itemListJson}
  </script>
  <style>
    /* Self-contained — copies the app's theme token values (theme.css) verbatim, since a
       static page can't import the app's CSS. Same palette as about.html / faq.html. */
    :root {
      --bg-base: #F2EFE9;
      --bg-surface: #FBFAF8;
      --bg-surface-2: #EDEAE4;
      --separator: rgba(0, 0, 0, 0.20);
      --text-main: #1D1D1F;
      --text-muted: #5A5A5F;
      --accent: #0A5FD0;
      --accent-strong: #0847A8;
      --accent-soft: rgba(10, 95, 208, 0.12);
      --accent-on: #ffffff;
      --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.06);
      --shadow-2: 0 4px 14px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: var(--bg-base);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .wrap { max-width: 920px; margin: 0 auto; padding: 40px 20px 64px; }
    .top-link { display: inline-block; margin-bottom: 24px; color: var(--accent); text-decoration: none; font-weight: 600; font-size: 15px; }
    .top-link:hover { text-decoration: underline; }
    .hero { padding: 8px 0 28px; }
    .wordmark { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; color: var(--text-main); margin: 0 0 10px; }
    .wordmark .raak { color: var(--accent); }
    h1 { font-size: 30px; line-height: 1.2; margin: 0 0 14px; }
    .promise { font-size: 18px; color: var(--text-muted); margin: 0 0 20px; }
    .cta {
      display: inline-block; background: var(--accent); color: var(--accent-on); text-decoration: none;
      font-weight: 600; font-size: 15px; padding: 12px 22px; border-radius: 12px; box-shadow: var(--shadow-2);
    }
    .cta:hover { background: var(--accent-strong); }
    h2 { font-size: 22px; margin: 44px 0 14px; padding-top: 12px; border-top: 1px solid var(--separator); }
    h3 { font-size: 16px; margin: 22px 0 10px; color: var(--text-muted); }
    p { margin: 0 0 16px; }
    a { color: var(--accent); }

    .toc { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
    .toc li { background: var(--bg-surface-2); border-radius: 10px; padding: 8px 14px; }
    .toc a { text-decoration: none; font-weight: 600; }
    .domain-count { color: var(--text-muted); font-weight: 400; }

    .ex-grid { display: block; }
    .ex-card {
      background: var(--bg-surface); border: 1px solid var(--separator); border-radius: 12px;
      padding: 16px 18px; margin: 0 0 16px; box-shadow: var(--shadow-1);
    }
    .ex-card h4 { margin: 0 0 6px; font-size: 16px; }
    .ex-instruction { margin: 0 0 6px; font-style: italic; color: var(--text-muted); }
    .ex-desc { margin: 0 0 10px; font-size: 13px; color: var(--text-muted); }
    .ex-card img { display: block; max-width: 100%; height: auto; border: 1px solid var(--separator); border-radius: 8px; background: #fff; }

    footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--separator); color: var(--text-muted); font-size: 13px; }
    footer a { color: var(--text-muted); }
    footer p { margin: 0 0 6px; }

    @media (max-width: 400px) {
      .wrap { padding: 24px 16px 48px; }
      h1 { font-size: 24px; }
      .promise { font-size: 16px; }
    }
  </style>
</head>

<body>
  <main class="wrap">
    <a class="top-link" href="/">&larr; Terug naar RekenRaak</a>

    <section class="hero">
      <p class="wordmark">reken<span class="raak">raak</span></p>
      <h1>Alle oefeningen</h1>
      <p class="promise">${ok.length} oefentypes, elk met een voorbeeld en de instellingen die je kan aanpassen.</p>
      <a class="cta" href="/">Open RekenRaak</a>
    </section>

    <p>
      Dit is de volledige lijst van oefeningen die je in RekenRaak kan samenstellen, per
      leerdomein. Klik links in de sidebar van de app op een oefening om ze meteen op je
      werkblad te zetten — hier zie je vooraf wat elke oefening toont en wat je erin kan
      instellen. Meer over hoe je een werkblad samenstelt: <a href="/faq.html">veelgestelde vragen</a>
      en <a href="/about.html">over RekenRaak</a>.
    </p>

    ${toc}
${sections}
    <footer>
      <p>Gemaakt met <a href="/">RekenRaak.be</a> — gratis werkbladgenerator wiskunde voor het lager onderwijs.</p>
      <p>Bijgewerkt ${today} · <a href="/about.html">Over RekenRaak</a> · <a href="/faq.html">Veelgestelde vragen</a></p>
    </footer>
  </main>
</body>

</html>
`;

writeFileSync(OUT_HTML, html);
console.log(`Wrote ${OUT_HTML}`);
