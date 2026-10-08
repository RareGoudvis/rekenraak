import { RELEASE_NOTES } from './releaseNotes';

// The banner follows the newest release-notes entry: a new entry (new version) re-shows the
// "Nieuw" banner for everyone, and its summary is the banner's one line. Full notes live in
// ReleaseNotesModal ("Wat is er nieuw").
export const RELEASE_VERSION = RELEASE_NOTES[0].version;
export const RELEASE_SUMMARY = RELEASE_NOTES[0].summary;

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
