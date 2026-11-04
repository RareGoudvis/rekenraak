// Oefenmodus: "teken een scherpe / rechte / stompe / gestrekte hoek" on the card. The pupil
// opens an angle by dragging its free been (leg) round the hoekpunt; the angle snaps to 5°.
// Shared by HoekDragSVG (pointer maths) and VORMLEER_KIOSK (the check).

export const HOEK_STEP = 5;

// The class as a centre ± tolerance over the snapped angles: scherp 5°–85°, recht 90°,
// stomp 95°–175°, gestrekt 180° (a 0° "angle" is no hoek; reflex angles are not asked).
const RANGE: Record<string, { min: number; max: number }> = {
    scherp: { min: HOEK_STEP, max: 90 - HOEK_STEP },
    recht: { min: 90, max: 90 },
    stomp: { min: 90 + HOEK_STEP, max: 180 - HOEK_STEP },
    gestrekt: { min: 180, max: 180 },
};

export const HOEK_DRAG_CONCEPTS = Object.keys(RANGE);

/** The angle class as `centre` ± `tolerance` degrees (check.ts drag compares within it). */
export function hoekTarget(concept: string): { centre: number; tolerance: number } {
    const r = RANGE[concept] ?? RANGE.recht;
    return { centre: (r.min + r.max) / 2, tolerance: (r.max - r.min) / 2 };
}

/** The opening at hoekpunt (vx, vy) towards p, counter-clockwise from the vaste been along +x (screen y grows down), snapped and kept to 0°–180°. */
export function hoekFromPoint(p: { x: number; y: number }, vx: number, vy: number): number {
    const deg = (Math.atan2(vy - p.y, p.x - vx) * 180) / Math.PI;
    // Below the vaste been: the nearer end of the half turn (the right side folds to 0°).
    const half = deg >= 0 ? deg : deg > -90 ? 0 : 180;
    return Math.round(half / HOEK_STEP) * HOEK_STEP;
}

/** One arrow-key step of HOEK_STEP, kept to 0°–180°. */
export const hoekStep = (angle: number | undefined, dir: 1 | -1): number => Math.min(180, Math.max(0, (angle ?? 0) + dir * HOEK_STEP));
