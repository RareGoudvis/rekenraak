// The comparison rules both visual harnesses share (font-compare.mjs diffs two captures,
// visual-gate.mjs diffs one capture against the committed baseline). Kept in one place so
// a threshold moves once.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Width tiers the packer actually promotes at (blockLayout.ts / pagePacker.ts): a leaf
// whose intrinsic content width crosses one of these gets measured into a different
// minimum column count — a real layout change, not just nicer type.
export const TIER_BOUNDARIES = [151, 338, 688];
export const tierOf = (px) => {
    if (px == null) return null;
    for (let i = 0; i < TIER_BOUNDARIES.length; i++) if (px <= TIER_BOUNDARIES[i]) return i;
    return TIER_BOUNDARIES.length;
};

// The title row is expected to move (+4px, 16->20px bold) — mask its top band so a pixel
// diff there never trips the "unexpected visual change" flag on its own.
export const TITLE_MASK_PX = 28;
export const HEIGHT_DELTA_FLAG_PX = 8;
export const PIXEL_DIFF_FLAG_PCT = 0.5;

// What BlockErrorBoundary prints on the sheet when a viewer throws — a cell containing it
// rendered "successfully" but shows the teacher an error, so it must never pass a gate.
export const ERROR_BOUNDARY_TEXT = 'Kon dit blok niet tekenen';

export const textHash = (s) => createHash('sha1').update(s ?? '', 'utf8').digest('hex').slice(0, 16);

export function pixelDiffPct(beforePath, afterPath) {
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
