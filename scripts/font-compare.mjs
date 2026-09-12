// Font compare: diff a `before/` and `after/` font-baseline.mjs capture and report what
// actually moved. Built for the 7d font-token sweep: only geometry may change (the sweep
// wires viewer px onto the new --sheet-size-math/-text tokens), text must stay identical.
//
// Usage:
//   node scripts/font-compare.mjs --before C:/Users/ruben/Downloads/font-check/before \
//                                  --after  C:/Users/ruben/Downloads/font-check/after \
//                                  --out    C:/Users/ruben/Downloads/font-check/compare
//
// Writes <out>/report.json (every row), <out>/report.md (table, pixel-diff descending) and
// <out>/contact-sheet.html (before/after side by side for every flagged row).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BEFORE = arg('before');
const AFTER = arg('after');
const OUT = arg('out', join('.', 'font-compare-out'));
if (!BEFORE || !AFTER) { console.error('Usage: font-compare.mjs --before <dir> --after <dir> [--out <dir>]'); process.exit(1); }

mkdirSync(OUT, { recursive: true });

const beforeIndex = JSON.parse(readFileSync(join(BEFORE, 'index.json'), 'utf8'));
const afterIndex = JSON.parse(readFileSync(join(AFTER, 'index.json'), 'utf8'));

const key = (r) => `${r.leafId}-w${r.width}-s${r.solutions}`;
const afterByKey = new Map(afterIndex.rows.map(r => [key(r), r]));

// Width tiers the packer actually promotes at (blockLayout.ts / pagePacker.ts): a leaf
// whose intrinsic content width crosses one of these after the sweep would get measured
// into a different minimum column count — a real layout change, not just nicer type.
const TIER_BOUNDARIES = [151, 338, 688];
const tierOf = (px) => {
    if (px == null) return null;
    for (let i = 0; i < TIER_BOUNDARIES.length; i++) if (px <= TIER_BOUNDARIES[i]) return i;
    return TIER_BOUNDARIES.length;
};

// The title row is expected to move (+4px, 16->20px bold) — mask its top band so a
// pixel diff there never trips the "unexpected visual change" flag on its own.
const TITLE_MASK_PX = 28;
const HEIGHT_DELTA_FLAG_PX = 8;
const PIXEL_DIFF_FLAG_PCT = 0.5;

function pixelDiffPct(beforePath, afterPath) {
    if (!existsSync(beforePath) || !existsSync(afterPath)) return { pct: null, reason: 'missing screenshot' };
    const a = PNG.sync.read(readFileSync(beforePath));
    const b = PNG.sync.read(readFileSync(afterPath));
    if (a.width !== b.width || a.height !== b.height) return { pct: null, reason: `size changed ${a.width}x${a.height} -> ${b.width}x${b.height}` };
    // Blank the masked band identically in both buffers so pixelmatch never scores it.
    const mask = (img) => {
        const rows = Math.min(TITLE_MASK_PX, img.height);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < img.width; x++) {
                const idx = (img.width * y + x) << 2;
                img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = 0; img.data[idx + 3] = 255;
            }
        }
    };
    mask(a); mask(b);
    const diffPng = new PNG({ width: a.width, height: a.height });
    const diffCount = pixelmatch(a.data, b.data, diffPng.data, a.width, a.height, { threshold: 0.1 });
    const total = a.width * a.height;
    return { pct: total > 0 ? (diffCount / total) * 100 : 0 };
}

const rows = [];
for (const before of beforeIndex.rows) {
    const after = afterByKey.get(key(before));
    const base = { leafId: before.leafId, path: before.path, typeId: before.typeId, width: before.width, solutions: before.solutions };

    if (before.error || !after) {
        rows.push({ ...base, flagged: true, reason: before.error ? `before errored: ${before.error}` : 'missing from after run' });
        continue;
    }
    if (after.error) {
        rows.push({ ...base, flagged: true, reason: `after errored: ${after.error}` });
        continue;
    }

    const textMatch = before.text === after.text;
    const heightDelta = (after.cellHeightPx ?? 0) - (before.cellHeightPx ?? 0);
    const intrinsicDelta = (after.intrinsicPx ?? 0) - (before.intrinsicPx ?? 0);
    const tierBefore = tierOf(before.intrinsicPx);
    const tierAfter = tierOf(after.intrinsicPx);
    const tierChanged = tierBefore !== tierAfter;

    const beforeShot = before.screenshot ? join(BEFORE, before.screenshot) : null;
    const afterShot = after.screenshot ? join(AFTER, after.screenshot) : null;
    const pixel = beforeShot && afterShot ? pixelDiffPct(beforeShot, afterShot) : { pct: null, reason: 'no screenshot' };

    const flagged = !textMatch
        || Math.abs(heightDelta) > HEIGHT_DELTA_FLAG_PX
        || tierChanged
        || (pixel.pct != null && pixel.pct > PIXEL_DIFF_FLAG_PCT);

    const reasons = [];
    if (!textMatch) reasons.push('text mismatch');
    if (Math.abs(heightDelta) > HEIGHT_DELTA_FLAG_PX) reasons.push(`height Δ${heightDelta}px`);
    if (tierChanged) reasons.push(`tier ${tierBefore} -> ${tierAfter}`);
    if (pixel.pct != null && pixel.pct > PIXEL_DIFF_FLAG_PCT) reasons.push(`pixel diff ${pixel.pct.toFixed(2)}%`);

    rows.push({
        ...base, textMatch, heightDelta, intrinsicDelta, tierChanged,
        pixelDiffPct: pixel.pct, pixelNote: pixel.reason ?? null,
        beforeShot: before.screenshot ?? null, afterShot: after.screenshot ?? null,
        flagged, reason: reasons.join('; ') || null,
    });
}

const flaggedRows = rows.filter(r => r.flagged);
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ before: BEFORE, after: AFTER, total: rows.length, flagged: flaggedRows.length, rows }, null, 2));

// report.md — sorted by pixel-diff descending (errored/missing rows first, they have no
// pixel number to sort by so they float to the top where they can't be missed).
const sorted = [...rows].sort((x, y) => (y.pixelDiffPct ?? 999) - (x.pixelDiffPct ?? 999));
const md = [
    `# Font baseline compare`,
    ``,
    `${BEFORE} -> ${AFTER}`,
    ``,
    `${rows.length} rows, ${flaggedRows.length} flagged.`,
    ``,
    `| leaf | w | sol | text | Δheight | Δintrinsic | tier | pixel% | flagged | reason |`,
    `|---|---|---|---|---|---|---|---|---|---|`,
    ...sorted.map(r => `| ${r.path ?? r.leafId} | ${r.width} | ${r.solutions} | ${r.textMatch === false ? 'NO' : r.textMatch === true ? 'ok' : '-'} | ${r.heightDelta ?? '-'} | ${r.intrinsicDelta ?? '-'} | ${r.tierChanged ? 'CHANGED' : 'same'} | ${r.pixelDiffPct != null ? r.pixelDiffPct.toFixed(2) : (r.pixelNote ?? '-')} | ${r.flagged ? 'YES' : ''} | ${r.reason ?? ''} |`),
].join('\n');
writeFileSync(join(OUT, 'report.md'), md);

// contact-sheet.html — before/after side by side for every flagged row only; the whole
// point is that a clean sweep produces an (almost) empty sheet to eyeball.
const shotSrc = (dir, name) => name ? `file:///${join(dir, name).replace(/\\/g, '/')}` : '';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Font baseline contact sheet</title>
<style>
body{font-family:system-ui,sans-serif;background:#f4f4f2;margin:0;padding:16px;}
h1{font-size:16px;}
.row{background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;padding:12px;}
.row h3{margin:0 0 6px;font-size:13px;}
.reason{color:#b91c1c;font-size:12px;margin-bottom:8px;}
.imgs{display:flex;gap:12px;}
.imgs figure{margin:0;flex:1;min-width:0;}
.imgs img{max-width:100%;border:1px solid #ccc;}
.imgs figcaption{font-size:11px;color:#666;}
</style></head><body>
<h1>${flaggedRows.length} of ${rows.length} rows flagged (${BEFORE} vs ${AFTER})</h1>
${flaggedRows.map(r => `
<div class="row">
  <h3>${r.path ?? r.leafId} — w${r.width}, solutions ${r.solutions ? 'on' : 'off'}</h3>
  <div class="reason">${r.reason ?? ''}</div>
  <div class="imgs">
    <figure><img src="${shotSrc(BEFORE, r.beforeShot)}"><figcaption>before</figcaption></figure>
    <figure><img src="${shotSrc(AFTER, r.afterShot)}"><figcaption>after</figcaption></figure>
  </div>
</div>`).join('\n')}
</body></html>`;
writeFileSync(join(OUT, 'contact-sheet.html'), html);

console.log(`${rows.length} rows compared, ${flaggedRows.length} flagged -> ${OUT}`);
