export interface ExerciseType {
    id: string;
    label: string;
}

export interface Subdomain {
    id: string;
    label: string;
    types: ExerciseType[];
}

export interface Domain {
    id: string;
    label: string;
    subdomains: Subdomain[];
}

export const APP_STRUCTURE: Domain[] = [
    {
        id: 'hoofdrekenen',
        label: 'Hoofdrekenen',
        subdomains: [
            {
                id: 'standaardprocedure',
                label: 'Standaardprocedure',
                types: [
                    { id: 'hr-std-optellen', label: 'Optellen' },
                    { id: 'hr-std-aftrekken', label: 'Aftrekken' },
                    { id: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen' },
                    { id: 'hr-std-delen', label: 'Delen' }
                ]
            }
        ]
    },
    // 👇 Of je voegt een compleet nieuw hoofddomein toe:
    {
        id: 'meten',
        label: 'Metend rekenen',
        subdomains: [
            {
                id: 'klok',
                label: 'kloklezen',
                types: [
                    { id: 'meten-klok-analoog', label: 'Analoge klok' },
                    { id: 'meten-klok-digitaal', label: 'Digitale klok' }
                ]
            }
        ]
    }
];