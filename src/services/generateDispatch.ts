import type { MathBlock } from './math/types';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises } from './math/mathEngine';
import { generateClockExercises } from './clock/clockGenerator';
import { generateFractionExercises } from './fractions/fractionGenerator';
import { generateSplitsenExercises } from './splitsen/splitsenGenerator';
import { generateCijferExercises } from './cijferen/cijferGenerator';
import { generateGeldExercises, generateGeldWisselExercises, generateGeldTeruggevenExercises } from './geld/geldGenerator';
import { generateMabExercises } from './mab/mabGenerator';

// Shape of the store setters we need. Avoids importing the full WorksheetState type
// and keeps this module pure / unit-testable in isolation from Zustand.
export interface BlockSetters {
    setBlockExercises: (id: string, exercises: ReturnType<typeof generateAdditionExercises>) => void;
    setClockExercises: (id: string, exercises: ReturnType<typeof generateClockExercises>) => void;
    setFractionExercises: (id: string, exercises: ReturnType<typeof generateFractionExercises>) => void;
    setSplitsenExercises: (id: string, exercises: ReturnType<typeof generateSplitsenExercises>) => void;
    setCijferExercises: (id: string, exercises: ReturnType<typeof generateCijferExercises>) => void;
    setGeldExercises: (id: string, exercises: ReturnType<typeof generateGeldExercises>) => void;
    setGeldWisselExercises: (id: string, exercises: ReturnType<typeof generateGeldWisselExercises>) => void;
    setGeldTeruggevenExercises: (id: string, exercises: ReturnType<typeof generateGeldTeruggevenExercises>) => void;
    setMabExercises: (id: string, exercises: ReturnType<typeof generateMabExercises>) => void;
}

// Single source of truth for typeId → generator → store-setter mapping.
// Called by both the per-block "Genereer" button in Inspector and the
// document-wide "Genereer alles" button in TopBar.
export function regenerateBlock(block: MathBlock, setters: BlockSetters): void {
    const t = block.typeId;
    if (t.startsWith('klok-'))                       setters.setClockExercises(block.id, generateClockExercises(block));
    else if (t === 'breuken')                        setters.setFractionExercises(block.id, generateFractionExercises(block));
    else if (t === 'splitsen')                       setters.setSplitsenExercises(block.id, generateSplitsenExercises(block));
    else if (t.startsWith('cijferen-'))              setters.setCijferExercises(block.id, generateCijferExercises(block));
    else if (t === 'geld-herkennen' || t === 'geld-tekenen') setters.setGeldExercises(block.id, generateGeldExercises(block));
    else if (t === 'geld-wissel')                    setters.setGeldWisselExercises(block.id, generateGeldWisselExercises(block));
    else if (t === 'geld-teruggeven')                setters.setGeldTeruggevenExercises(block.id, generateGeldTeruggevenExercises(block));
    else if (t === 'mab-herkennen' || t === 'mab-tekenen') setters.setMabExercises(block.id, generateMabExercises(block));
    else if (t.includes('optellen'))                 setters.setBlockExercises(block.id, generateAdditionExercises(block));
    else if (t.includes('aftrekken'))                setters.setBlockExercises(block.id, generateSubtractionExercises(block));
    else if (t.includes('vermenigvuldigen'))         setters.setBlockExercises(block.id, generateMultiplicationExercises(block));
    else if (t.includes('delen'))                    setters.setBlockExercises(block.id, generateDivisionExercises(block));
}
