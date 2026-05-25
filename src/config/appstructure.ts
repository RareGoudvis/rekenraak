export interface LeafExercise {
    id: string;
    label: string;
    typeId: string;
    defaultConstraints?: Record<string, unknown>;
}

export interface ExerciseType {
    id: string;
    label: string;
    // Leaf: has typeId, no children
    typeId?: string;
    defaultConstraints?: Record<string, unknown>;
    // Accordion: has children, no typeId
    children?: LeafExercise[];
}

export interface Subdomain {
    id: string;
    label: string;
    types: ExerciseType[];
}

export interface Domain {
    id: string;
    label: string;
    accentVar: string;
    subdomains: Subdomain[];
}

export const APP_STRUCTURE: Domain[] = [
    {
        id: 'getallenkennis',
        label: 'Getallenkennis',
        accentVar: '--accent-getallenkennis',
        subdomains: [
            {
                id: 'breuken',
                label: 'Breuken',
                types: [
                    { id: 'breuken-kleuren', label: 'Breuken kleuren', typeId: 'breuken', defaultConstraints: { subType: 'kleuren' } },
                    { id: 'breuken-herkennen', label: 'Breuken herkennen', typeId: 'breuken', defaultConstraints: { subType: 'herkennen' } },
                    { id: 'breuken-hoeveelheid', label: 'Breuk van een hoeveelheid', typeId: 'breuken', defaultConstraints: { subType: 'hoeveelheid' } },
                    { id: 'breuken-lijnstuk', label: 'Breuk van een lijnstuk', typeId: 'breuken', defaultConstraints: { subType: 'lijnstuk' } },
                    { id: 'breuken-veelhoek', label: 'Breuk van een veelhoek', typeId: 'breuken', defaultConstraints: { subType: 'veelhoek' } },
                ],
            },
        ],
    },
    {
        id: 'bewerkingen',
        label: 'Bewerkingen',
        accentVar: '--accent-bewerkingen',
        subdomains: [
            {
                id: 'hoofdrekenen-standaardprocedure',
                label: 'Hoofdrekenen (standaardprocedure)',
                types: [
                    {
                        id: 'hr-std-optellen',
                        label: 'Optellen',
                        children: [
                            { id: 'hr-std-optellen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-optellen-dec', label: 'Decimale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-optellen-rat', label: 'Rationale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-aftrekken',
                        label: 'Aftrekken',
                        children: [
                            { id: 'hr-std-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-aftrekken-dec', label: 'Decimale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-aftrekken-rat', label: 'Rationale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-vermenigvuldigen',
                        label: 'Vermenigvuldigen',
                        children: [
                            { id: 'hr-std-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-vermenigvuldigen-dec', label: 'Decimale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-vermenigvuldigen-rat', label: 'Rationale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-delen',
                        label: 'Delen',
                        children: [
                            { id: 'hr-std-delen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-delen-dec', label: 'Decimale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-delen-rat', label: 'Rationale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'meten-metend-rekenen',
        label: 'Meten en metend rekenen',
        accentVar: '--accent-metendrekenen',
        subdomains: [
            {
                id: 'kloklezen',
                label: 'Kloklezen',
                types: [
                    { id: 'klok-analoog', label: 'Analoge klok', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog' } },
                    { id: 'klok-digitaal', label: 'Digitale klok', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'digitaal' } },
                ],
            },
        ],
    },
];
