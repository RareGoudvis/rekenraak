// Pure copy for the returning-teacher upgrade modal (UpgradeModal.tsx). Dutch, teacher language.
export const UPGRADE_TITLE = 'Nieuw in RekenRaak';
export const UPGRADE_INTRO = 'Een eenvoudigere manier om een blad te maken, twee nieuwe manieren om te werken en een stapel verbeteringen aan de bladen die je al kent.';

export const UPGRADE_MODES = {
    oefenmodus: {
        title: 'Oefenmodus',
        text: 'Leerlingen oefenen op hun eigen toestel via een link of QR-code. De resultaten blijven op het toestel.',
    },
    bordmodus: {
        title: 'Bordmodus',
        text: 'Een digibord-canvas met rekenblokken, klok, timer, geld en meetinstrumenten.',
    },
} as const;

// Each ≤ 160 chars (tested), like the release items.
export const UPGRADE_HIGHLIGHTS: readonly string[] = [
    'Breuken: één instellingenblok, onechte breuken en gelijknamig veelvoud.',
    'Opmaak: een opdrachtkleur per domein, te vinden onder Blad › Opdrachten.',
    'Getallen tot 1 miljard bij leerjaar 6.',
    'Bladen van vroeger openen gewoon, ook oude deellinks.',
];
