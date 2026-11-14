// Drives the Oefenmodus catalogue (OefenSidebar) in jsdom: the Uitgebreid tab, its search and leerjaar, a leaf's button.
import { fireEvent, within } from '@testing-library/react';
import { APP_STRUCTURE } from '../../config/appstructure';

export const oefenAside = () => {
    const el = document.querySelector('aside.oefen-sidebar');
    if (!el) throw new Error('no OefenSidebar mounted');
    return el as HTMLElement;
};

export function showUitgebreid(): void {
    const btn = within(oefenAside().querySelector('.panel-head') as HTMLElement).getByRole('button', { name: 'Uitgebreid' });
    if (btn.getAttribute('aria-pressed') !== 'true') fireEvent.click(btn);
}

const subOf = (leafId: string) => APP_STRUCTURE.flatMap(d => d.subdomains).find(s => s.types.some(t => t.id === leafId || t.children?.some(l => l.id === leafId)))?.id;

/** The leaf's add button in the Uitgebreid tree, opening its subdomain first; null when the tree hides it (leerjaar, search, not kiosk). */
export function queryLeafBtn(leafId: string): HTMLButtonElement | null {
    showUitgebreid();
    const find = () => oefenAside().querySelector<HTMLButtonElement>(`button[data-leaf-id="${leafId}"]`);
    if (!find()) {
        const sub = oefenAside().querySelector<HTMLButtonElement>(`button[data-sub-id="${subOf(leafId)}"]`);
        if (sub) fireEvent.click(sub);
    }
    return find();
}

export function leafBtn(leafId: string): HTMLButtonElement {
    const b = queryLeafBtn(leafId);
    if (!b) throw new Error(`leaf ${leafId} is not in the Oefenmodus catalogue`);
    return b;
}

/** Every leaf id the Uitgebreid tree currently shows (each subdomain opened in turn). */
export function shownLeafIds(): string[] {
    showUitgebreid();
    const subs = () => [...oefenAside().querySelectorAll<HTMLButtonElement>('button[data-sub-id]')];
    const searching = (oefenAside().querySelector('input[type=text]') as HTMLInputElement).value.trim() !== '';
    const ids = (): string[] => [...oefenAside().querySelectorAll('button[data-leaf-id]')].map(b => b.getAttribute('data-leaf-id')!);
    // A search force-opens the whole tree.
    if (searching) return ids();
    const out: string[] = [];
    for (let i = 0; i < subs().length; i++) {
        fireEvent.click(subs()[i]);
        out.push(...ids());
        fireEvent.click(subs()[i]);
    }
    return out;
}

export const searchTree = (value: string) => { showUitgebreid(); fireEvent.change(within(oefenAside()).getByPlaceholderText('Zoek oefening…'), { target: { value } }); };

/** Picks the Uitgebreid leerjaar ("Alle", "L1" … "L6") in the catalogue's popup. */
export function pickGrade(label: string): void {
    showUitgebreid();
    fireEvent.click(within(oefenAside()).getByRole('button', { name: 'Leerjaar kiezen' }));
    fireEvent.click(within(oefenAside()).getByRole('option', { name: label }));
}

export const gradeShown = () => within(oefenAside()).getByRole('button', { name: 'Leerjaar kiezen' }).textContent;
