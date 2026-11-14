import type { ComponentType } from 'react';
import Giraffe from './Giraffe';
import Koe from './Koe';
import Pinguin from './Pinguin';
import Nijlpaard from './Nijlpaard';
import Uil from './Uil';
import Luiaard from './Luiaard';
import Octopus from './Octopus';
import Kikker from './Kikker';

// The hidden pictures. A new one = one self-contained 400 × 300 component (parts.tsx) + one line here.
export interface PrentEntry {
    id: string;
    // Read out on the end screen ("een giraf met een zonnebril").
    label: string;
    Art: ComponentType;
}

export const PRENTEN: readonly PrentEntry[] = [
    { id: 'giraf', label: 'een giraf met een zonnebril', Art: Giraffe },
    { id: 'koe', label: 'een koe op een skateboard', Art: Koe },
    { id: 'pinguin', label: 'een pinguïn met een ijsje', Art: Pinguin },
    { id: 'nijlpaard', label: 'een nijlpaard in bad', Art: Nijlpaard },
    { id: 'uil', label: 'een uil met een boekentas', Art: Uil },
    { id: 'luiaard', label: 'een luiaard in een hangmat', Art: Luiaard },
    { id: 'octopus', label: 'een octopus die jongleert', Art: Octopus },
    { id: 'kikker', label: 'een kikker op een step', Art: Kikker },
];

export const prentById = (id: string | null) => PRENTEN.find(p => p.id === id) ?? null;
