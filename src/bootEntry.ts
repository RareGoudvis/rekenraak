import type { WorksheetView } from './store/types';

// bord.html carries <html data-boot="bord"> so the flag exists before any module runs:
// the store reads it at creation, which a flag set from an entry script would be too late for.
export function isBordPage(): boolean {
    return typeof document !== 'undefined' && document.documentElement.dataset.boot === 'bord';
}

export function initialView(): WorksheetView {
    return isBordPage() ? 'whiteboard' : 'editor';
}

// On the board's own address there is no editor to fall back to: leaving goes to the app page.
export function leaveBordPage(): void {
    window.location.assign('/');
}
