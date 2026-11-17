import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { Prize } from '../machines';

// The arcades' shared layout and helpers (pure, no components): the machine's fixed holes, the colours (theme tokens
// only), point helpers for the bulbs and the shape of an arcade. The drawing kit (kit.tsx) and the five arcades use them.

// The machine's drawing box and the holes the live parts sit in (machine units). Every Cabinet leaves these free.
export const VIEW = { w: 1000, h: 940 } as const;
export const DISPLAY = { x: 180, y: 128, w: 640, h: 124 } as const;
export const GLASS = { x: 96, y: 272, w: 808, h: 468 } as const;
export const PANEL = { x: 80, y: 756, w: 840, h: 124 } as const;
// On the panel: the prize door (under the chute, left), the joystick, the button and the coin slot.
export const DOOR = { x: 120, y: 772, w: 170, h: 92 } as const;
export const STICK = { x: 384, y: 846 } as const;
export const BUTTON = { x: 504, y: 832 } as const;
// The "Nog N" counter (live HTML) and the coin slot.
export const COUNTER = { x: 586, y: 782, w: 180, h: 80 } as const;
export const SLOT = { x: 792, y: 786, w: 94, h: 76 } as const;

/** A rect of the machine as % of the machine box (left, top, width, height), for the live HTML parts. */
export const pctOf = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({
    left: `${(r.x / VIEW.w) * 100}%`, top: `${(r.y / VIEW.h) * 100}%`, width: `${(r.w / VIEW.w) * 100}%`, height: `${(r.h / VIEW.h) * 100}%`,
});

// Theme colours (theme.css / kiosk.css tokens), mixed with color-mix; never a hex here.
export const C = {
    ink: 'var(--spel-ink)',
    paper: 'var(--kiosk-paper)',
    red: 'var(--accent-getallenkennis)',
    blue: 'var(--accent-bewerkingen)',
    green: 'var(--accent-metendrekenen)',
    purple: 'var(--accent-meetkunde)',
    orange: 'var(--accent-vraagstukken)',
    yellow: 'var(--mab-e)',
    violet: 'var(--mab-e2)',
    lime: 'var(--mab-t)',
    sky: 'var(--mab-h)',
    pink: 'var(--kid-tint-ring-6)',
    cream: 'var(--kid-tint-1)',
    mint: 'var(--kid-tint-2)',
    ice: 'var(--kid-tint-3)',
    peach: 'var(--kid-tint-4)',
    lilac: 'var(--kid-tint-5)',
    rose: 'var(--kid-tint-6)',
} as const;
/** a mixed into b: mix(C.red, 40) = 40 % red on paper. */
export const mix = (a: string, pct: number, b: string = C.paper) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
/** The fill style of a shape (SVG presentation attributes take no var(), a style does). */
export const fill = (f: string): CSSProperties => ({ fill: f });
/** A wave part turns round this point (prize units). */
export const pivot = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

export type Pt = readonly [number, number];

/** Points along a rectangle's edge, clockwise from the top-left. */
export function rectPoints(x: number, y: number, w: number, h: number, n: number): Pt[] {
    const per = 2 * (w + h);
    return Array.from({ length: n }, (_, i) => {
        let d = (i / n) * per;
        if (d < w) return [x + d, y] as const;
        d -= w;
        if (d < h) return [x + w, y + d] as const;
        d -= h;
        if (d < w) return [x + w - d, y + h] as const;
        return [x, y + h - (d - w)] as const;
    });
}

/** Points along an arc (centre, radius, from / to degrees, 0 = right, clockwise in screen space). */
export function arcPoints(cx: number, cy: number, r: number, from: number, to: number, n: number): Pt[] {
    return Array.from({ length: n }, (_, i) => {
        const a = ((from + ((to - from) * i) / Math.max(1, n - 1)) * Math.PI) / 180;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
    });
}

/** Points on a line. */
export const linePoints = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n }, (_, i) => {
    const k = n === 1 ? 0.5 : i / (n - 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] as const;
});

// A claw head is drawn in a 120 × 130 box: the hub on top (the cable meets it at 60, 0), three prongs hanging from
// pivots, fingertips at about y 125. The prongs open with --open (grijp.css .gm-prong).
export const CLAW_BOX = { w: 120, h: 130 } as const;

export interface ClawLook {
    hub: ReactNode;
    // One prong drawn hanging straight down from (0, 0); mirrored for the right one.
    prong: ReactNode;
    // The middle prong (seen from the front): absent = none.
    middle?: ReactNode;
    // Where the side prongs hang from.
    pivotY?: number;
    spread?: number;
}

// ── An arcade ────────────────────────────────────────────────────────────────────

export interface ArcadeArt {
    // The room: wall and floor decorations, full-bleed (cropped on narrow screens, so nothing needed sits there).
    Room: ComponentType;
    // The things beside the machine, scaled into the space left and right of it: a 300 × 600 box, the floor at 600.
    WingL: ComponentType;
    WingR: ComponentType;
    // The machine's body in the VIEW box (a <g>), leaving DISPLAY, GLASS and the panel's parts free.
    Cabinet: ComponentType;
    // The glass's back wall and what lives inside (a spider), in a GLASS.w × GLASS.h box.
    Inside: ComponentType;
    Claw: ComponentType;
    // A prize in a 100 × 100 box sitting on y 100; one part has class gm-wave (it waves on the end screen).
    Prize: ComponentType<{ prize: Prize }>;
}


export interface PlushLook { body: string; belly: string; dark?: string }
