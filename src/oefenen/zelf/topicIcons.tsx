import type { ReactNode } from 'react';

// The Zelf oefenen tiles' badge per Eenvoudig section: its tint (kiosk.css tokens) and a glyph or a small drawing per topic.
// A topic missing here shows its first letter, so a new topic never breaks the picker.

export const SECTION_TINT: Record<string, string> = {
    Getallen: 'var(--kid-tint-1)',
    Hoofdrekenen: 'var(--kid-tint-3)',
    Cijferen: 'var(--kid-tint-4)',
    'Slim rekenen': 'var(--kid-tint-5)',
    Meten: 'var(--kid-tint-2)',
    Meetkunde: 'var(--kid-tint-6)',
};

const svg = (body: ReactNode) => <svg viewBox="0 0 24 24" aria-hidden>{body}</svg>;

const CLOCK = svg(<><circle className="zi-paper" cx="12" cy="12" r="10" /><path className="zi-line" d="M12 6 V12 L16.5 14" /></>);
const COIN = svg(<><circle className="zi-gold" cx="12" cy="12" r="10" /><circle className="zi-line" cx="12" cy="12" r="6.5" /><text className="zi-text" x="12" y="16.5">€</text></>);
const RULER = svg(<><rect className="zi-paper" x="2" y="8" width="20" height="8" rx="1.5" /><path className="zi-line" d="M6 8 v3 M10 8 v4 M14 8 v3 M18 8 v4" /></>);
const STAR = svg(<path className="zi-gold" d="M12 2 l3 6.4 7 .9 -5.1 4.8 1.3 7 -6.2 -3.5 -6.2 3.5 1.3 -7 -5.1 -4.8 7 -.9 z" />);
const SQUARE = svg(<><rect className="zi-paper" x="4" y="4" width="16" height="16" rx="1" /><path className="zi-line" d="M4 9 h16 M9 4 v16" /></>);
const ANGLE = svg(<path className="zi-line" d="M4 19 H20 M4 19 L16 6 M9 19 a5 5 0 0 0 -1.6 -3.6" />);
const TRIANGLE = svg(<path className="zi-paper" d="M12 3 L21 19 H3 Z" />);
const TREE = svg(<><path className="zi-line" d="M12 8 L6 15 M12 8 L18 15" /><circle className="zi-paper" cx="12" cy="6" r="3.5" /><circle className="zi-paper" cx="6" cy="17" r="3.5" /><circle className="zi-paper" cx="18" cy="17" r="3.5" /></>);

const ICON: Record<string, ReactNode> = {
    'Tellen en getallenrijen': '123',
    'Getallen lezen en plaatswaarde': 'TE',
    'Vergelijken, ordenen, afronden': '<>',
    Splitsen: TREE,
    Deelbaarheid: '2|6',
    'Negatieve getallen': '−5',
    Breuken: '½',
    'Kommagetallen en procenten': '%',
    'Hoofdrekenen · Optellen': '+',
    'Hoofdrekenen · Aftrekken': '−',
    'Hoofdrekenen · Maaltafels': '×',
    'Hoofdrekenen · Deeltafels': ':',
    'Hoofdrekenen · Vermenigvuldigen': '×',
    'Hoofdrekenen · Delen': '÷',
    'Hoofdrekenen · Combinatie': '+−',
    'Cijferen · Optellen': '+',
    'Cijferen · Aftrekken': '−',
    'Cijferen · Vermenigvuldigen': '×',
    'Cijferen · Delen': '÷',
    'Handig rekenen': STAR,
    'Schatten en controleren': '≈',
    'Klok en kalender': CLOCK,
    Geld: COIN,
    'Meten en herleiden': RULER,
    'Omtrek en oppervlakte': SQUARE,
    'Lijnen en hoeken': ANGLE,
    Figuren: TRIANGLE,
};

/** The topic's badge content and its size class: a long glyph (123) needs a smaller font in the same circle. */
export function topicIcon(topicId: string, label: string): { icon: ReactNode; size: '' | ' is-wide' | ' is-long' } {
    const icon = ICON[topicId] ?? label.charAt(0).toUpperCase();
    const size = typeof icon !== 'string' || icon.length < 2 ? '' : icon.length === 2 ? ' is-wide' : ' is-long';
    return { icon, size };
}
