import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';

// Each leerjaar its own colour (kiosk.css --kid-tint-1 … 6), and a darker shade of it for the chosen ring.
export const gradeTint = (g: number) => ({ '--tint': `var(--kid-tint-${g})`, '--tint-ring': `var(--kid-tint-ring-${g})` } as React.CSSProperties);

// The leerjaar is remembered per device, so a pupil lands on their own topics next time.
export const GRADE_KEY = 'rekenraak_zelf_leerjaar_v1';

export function readGrade(): Leerjaar | null {
    try {
        const n = Number(globalThis.localStorage?.getItem(GRADE_KEY));
        return (LEERJAREN as readonly number[]).includes(n) ? n as Leerjaar : null;
    } catch { return null; }
}

export function saveGrade(g: Leerjaar) {
    try { globalThis.localStorage?.setItem(GRADE_KEY, String(g)); } catch { /* private mode: this visit only */ }
}
