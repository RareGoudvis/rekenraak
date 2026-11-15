// Verborgen prent photos: the files live in public/spelen/prent/ (credits in CREDITS.md there). Swapping a photo =
// replace the file and its row here; w × h are the file's own pixels (the frame takes that shape), fallback names a
// drawn picture (prenten/) shown when the photo cannot load (otherwise one is chosen by the id).
export interface PrentPhoto {
    id: string;
    file: string;
    w: number;
    h: number;
    // Read out on the end screen ("De prent: een zeeotter ...").
    alt: string;
    photographer: string;
    title: string;
    year: number;
    url: string;
    source: string;
    fallback?: string;
}

export const PRENT_PHOTO_DIR = 'spelen/prent/';
const CWPA = 'Comedy Wildlife Photography Awards';
const page = (year: number) => `https://www.comedywildlifephoto.com/gallery/finalists/${year}_winners.php`;

export const PRENT_PHOTOS: readonly PrentPhoto[] = [
    { id: 'zeeotter', file: 'zeeotter.webp', w: 1200, h: 800, alt: 'een verbaasde zeeotter met zijn pootjes tegen zijn wangen', photographer: 'Harry Walker', title: 'Oh My!', year: 2019, url: page(2019), source: CWPA },
    { id: 'eekhoorn', file: 'eekhoorn.webp', w: 1200, h: 894, alt: 'een eekhoorn die een paardenbloem uitblaast', photographer: 'Geert Weggen', title: 'Squirrel Wishes', year: 2019, url: page(2019), source: CWPA },
    { id: 'marmot', file: 'marmot.webp', w: 960, h: 1200, alt: 'een marmot die staat te dansen', photographer: 'Martina Gebert', title: 'Dancing...yeah!', year: 2019, url: page(2019), source: CWPA },
    { id: 'parkieten', file: 'parkieten.webp', w: 1200, h: 800, alt: 'twee groene parkieten: de ene steekt een pootje op', photographer: 'Petr Sochman', title: 'Social distance, please!', year: 2020, url: page(2020), source: CWPA },
    { id: 'wasbeer', file: 'wasbeer.webp', w: 1200, h: 1200, alt: 'een wasbeer op het strand die vrolijk zwaait', photographer: 'Miroslav Srb', title: 'Hello everyone', year: 2022, url: page(2022), source: CWPA },
    { id: 'nilgau', file: 'nilgau.webp', w: 1200, h: 830, alt: 'een antilope die vleugels lijkt te hebben', photographer: 'Jagdeep Rajput', title: 'Pegasus, the flying horse', year: 2022, url: page(2022), source: CWPA },
    { id: 'kangoeroe', file: 'kangoeroe.webp', w: 1200, h: 800, alt: 'een kangoeroe die luchtgitaar speelt', photographer: 'Jason Moore', title: 'Air Guitar Roo', year: 2023, url: page(2023), source: CWPA },
    { id: 'otter', file: 'otter.webp', w: 1200, h: 900, alt: 'een otter die op een steen staat te dansen als een ballerina', photographer: 'Otter Kwek', title: 'Otter Ballerina', year: 2023, url: page(2023), source: CWPA },
    { id: 'schildpad', file: 'schildpad.webp', w: 1200, h: 800, alt: 'een lachende schildpad met een libel op zijn neus', photographer: 'Tzahi Finkelstein', title: 'The happy turtle', year: 2023, url: page(2023), source: CWPA },
    { id: 'kikker', file: 'kikker.webp', w: 1200, h: 798, alt: 'een kikker met een grote, verlegen glimlach', photographer: 'Kingston Tam', title: 'Awkward smiley frog', year: 2024, url: page(2024), source: CWPA, fallback: 'kikker' },
    { id: 'pinguins', file: 'pinguins.webp', w: 1200, h: 676, alt: 'vier rotspinguïns die samen over het strand wandelen', photographer: 'Ralph Robinson', title: 'Gang of four', year: 2024, url: page(2024), source: CWPA, fallback: 'pinguin' },
    { id: 'gorilla', file: 'gorilla.webp', w: 1200, h: 800, alt: 'een jonge gorilla op één been, met een voet omhoog voor een high five', photographer: 'Mark Meth-Cohn', title: 'High Five', year: 2025, url: page(2025), source: CWPA },
];

export const photoUrl = (p: PrentPhoto) => `${import.meta.env.BASE_URL}${PRENT_PHOTO_DIR}${p.file}`;
export const photoCredit = (p: PrentPhoto) => `Foto: ${p.photographer} / ${p.source}`;
export const photoById = (id: string | null) => PRENT_PHOTOS.find(p => p.id === id) ?? null;
