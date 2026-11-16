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
    { id: 'hamster', file: 'hamster.webp', w: 1200, h: 704, alt: 'een hamster die als een bolletje over de grond rent', photographer: 'Julian Rad', title: 'Rush Hour', year: 2015, url: page(2015), source: CWPA },
    { id: 'maki', file: 'maki.webp', w: 1200, h: 800, alt: 'een maki die op zijn tenen danst met zijn armen opzij', photographer: 'Alison Buttigieg', title: 'Highly commended', year: 2015, url: page(2015), source: CWPA },
    { id: 'nijlpaard', file: 'nijlpaard.webp', w: 1200, h: 800, alt: 'een jong nijlpaard met open bek dat rent, met vogeltjes op zijn kop', photographer: 'Marc Mol', title: 'Highly commended', year: 2015, url: page(2015), source: CWPA },
    { id: 'bavianen', file: 'bavianen.webp', w: 1200, h: 798, alt: 'twee babybavianen die elkaar knuffelen alsof ze dansen', photographer: 'Tony Dilger', title: 'Highly commended', year: 2015, url: page(2015), source: CWPA },
    { id: 'zebras', file: 'zebras.webp', w: 1200, h: 814, alt: 'drie zebra\'s, waarvan eentje breed lacht', photographer: 'Thomas Bullivant', title: 'Say cheese!', year: 2016, url: page(2016), source: CWPA },
    { id: 'ijsberen', file: 'ijsberen.webp', w: 1200, h: 802, alt: 'een ijsbeerwelpje dat zwaait naast zijn slapende moeder', photographer: 'Philip Marazzi', title: 'Hello!', year: 2016, url: page(2016), source: CWPA },
    { id: 'holenuilen', file: 'holenuilen.webp', w: 1200, h: 866, alt: 'vier jonge holenuiltjes op een rij, eentje met een scheef hoofd', photographer: 'Mario Fiorucci', title: 'Curious', year: 2016, url: page(2016), source: CWPA },
    { id: 'pelikaan', file: 'pelikaan.webp', w: 1200, h: 800, alt: 'een pelikaan met wijd open bek die zijn vis laat vallen', photographer: 'Nicolas de Vaulx', title: 'Damn!', year: 2016, url: page(2016), source: CWPA },
    { id: 'makaken', file: 'makaken.webp', w: 1200, h: 798, alt: 'twee apen op een scooter, eentje gaapt luid', photographer: 'Katy Laveck-Foster', title: 'Monkey-Escape', year: 2017, url: page(2017), source: CWPA },
    { id: 'zeeolifanten', file: 'zeeolifanten.webp', w: 1200, h: 794, alt: 'een zeeolifant met een verbaasd gezicht naast een andere', photographer: 'George Cathcart', title: 'WTF', year: 2017, url: page(2017), source: CWPA },
    { id: 'konijn', file: 'konijn.webp', w: 1200, h: 800, alt: 'een konijn dat rechtop staat met gras in zijn bek', photographer: 'Olivier Colle', title: 'Eh What\'s Up Doc?', year: 2017, url: page(2017), source: CWPA },
    { id: 'beerwelp', file: 'beerwelp.webp', w: 1200, h: 800, alt: 'een bruin berenwelpje dat zijn pootje voor zijn ogen houdt', photographer: 'Danielle D\'Ermo', title: 'Coastal Brown Bear Cub with a Headache', year: 2018, url: page(2018), source: CWPA },
    { id: 'langoeren', file: 'langoeren.webp', w: 1200, h: 802, alt: 'drie apen tussen een hoop fietsen', photographer: 'Yevhen Samuchenko', title: 'The race', year: 2020, url: page(2020), source: CWPA },
    { id: 'ezelspinguin', file: 'ezelspinguin.webp', w: 1200, h: 800, alt: 'een pinguïn die op een golf surft', photographer: 'Elmar Weiss', title: 'Surfing...South Atlantic Style!', year: 2019, url: page(2019), source: CWPA },
    { id: 'sneeuwaap', file: 'sneeuwaap.webp', w: 1200, h: 800, alt: 'een sneeuwaap met ijs in zijn vacht die voorzichtig loopt', photographer: 'Roie Galitz', title: 'Space Man', year: 2019, url: page(2019), source: CWPA },
    { id: 'papegaaivis', file: 'papegaaivis.webp', w: 1200, h: 800, alt: 'een felgekleurde vis met een grote glimlach', photographer: 'Arthur Telle Thiemann', title: 'Smiley', year: 2020, url: page(2020), source: CWPA },
    { id: 'papegaaiduikers', file: 'papegaaiduikers.webp', w: 1200, h: 858, alt: 'twee papegaaiduikers, eentje met een bek vol visjes', photographer: 'Krisztina Scheeff', title: 'Seriously, would you share some', year: 2020, url: page(2020), source: CWPA },
    { id: 'neusaap', file: 'neusaap.webp', w: 800, h: 1200, alt: 'een neusaap die een boomstam omhelst', photographer: 'Jakub Hodan', title: 'Treehugger', year: 2021, url: page(2021), source: CWPA },
    { id: 'duif', file: 'duif.webp', w: 1200, h: 756, alt: 'een duif met een blad op zijn kop', photographer: 'John Speirs', title: 'I guess summer\'s over', year: 2021, url: page(2021), source: CWPA },
    { id: 'leeuwenwelp', file: 'leeuwenwelp.webp', w: 1200, h: 900, alt: 'een jong leeuwtje dat tegen een boom botst en naar beneden glijdt', photographer: 'Jennifer Hadley', title: 'Not so cat-like reflexes', year: 2022, url: page(2022), source: CWPA },
    { id: 'vlekuiltje', file: 'vlekuiltje.webp', w: 1200, h: 800, alt: 'een uiltje in een buis dat een oog dichtknijpt', photographer: 'Arshdeep Singh', title: 'I CU boy !', year: 2022, url: page(2022), source: CWPA },
    { id: 'trekkervis', file: 'trekkervis.webp', w: 1200, h: 800, alt: 'twee vissen met grote lachende monden', photographer: 'Arturo Telle Thiemann', title: 'Say cheeeese', year: 2022, url: page(2022), source: CWPA },
    { id: 'stokstaartjes', file: 'stokstaartjes.webp', w: 800, h: 1200, alt: 'twee stokstaartjes die tegen elkaar staan, eentje met open mond', photographer: 'Emmanuel Do Linh San', title: 'I\'m gonna strangle you!', year: 2022, url: page(2022), source: CWPA },
    { id: 'sneeuwhoen', file: 'sneeuwhoen.webp', w: 1200, h: 800, alt: 'een sneeuwhoen dat eruitziet als een ronde sneeuwbal', photographer: 'Jacques Poulard', title: 'Snowball', year: 2023, url: page(2023), source: CWPA },
];

export const photoUrl = (p: PrentPhoto) => `${import.meta.env.BASE_URL}${PRENT_PHOTO_DIR}${p.file}`;
export const photoCredit = (p: PrentPhoto) => `Foto: ${p.photographer} / ${p.source}`;
export const photoById = (id: string | null) => PRENT_PHOTOS.find(p => p.id === id) ?? null;
