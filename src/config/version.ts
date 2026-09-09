// Bump RELEASE_VERSION on every ship that should re-show the "Nieuw" banner.
// RELEASE_SUMMARY is the single line shown inside the banner; full details live in
// HelpModal so teachers can read more there.
export const RELEASE_VERSION = 'v0.5-2026-05-31';
export const RELEASE_SUMMARY = 'snel meerdere oefeningen toevoegen, basisinstellingen, curriculum samenstellen (vergrendelde links), temperatuur (incl. verschil) en meer ordenen/getallenas-opties';

// Exercise types added in the July 2026 batch that haven't had a full owner review on
// paper yet. Drives the "nog in proef" banner, which only appears while one of these is
// actually on the sheet. Shrink this list as families get signed off; it is not permanent.
// (The July `tienvoud` and `handig-rekenen` typeIds are absent on purpose — they became
// constraints.preset flavours inside the standard hoofdrekenen configs.)
export const TRYOUT_TYPE_IDS: ReadonlySet<string> = new Set([
    'schattend', 'verbanden', 'procenten', 'maateenheid', 'geld-rekenen',
    'rekenvolgorde', 'kettingsommen', 'getalfunctie', 'tijdsduur', 'kalender',
    'controleren', 'oppervlakte', 'weegschaal',
    'vormleer-punt-lijn', 'vormleer-hoeken', 'vormleer-figuren',
]);
