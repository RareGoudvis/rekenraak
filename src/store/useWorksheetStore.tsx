import { create } from 'zustand';
import type { MathBlock, Equation, FooterData, LayoutPreset } from '../services/math/types';

interface HeaderData {
    naam: boolean;
    klas: boolean;
    nummer: boolean;
    datum: boolean;
    titel:string;
}

interface WorksheetState {
    blocks: MathBlock[];
    activeBlockId: string | 'document' | null;
    header: HeaderData;
    footer: FooterData;
    showSolutions: boolean;
    addBlockFromType: (typeId: string, label: string) => void;
    removeBlock: (id: string) => void;
    moveBlockUp: (id: string) => void;    // 🔥 NIEUW
    moveBlockDown: (id: string) => void;  // 🔥 NIEUW
    updateBlockInstruction: (id: string, text: string) => void;
    updateBlockLayout: (id: string, layout: LayoutPreset, steppedLines?: number) => void;
    updateBlockSettings: (id: string, updates: Partial<MathBlock>) => void;
    setBlockExercises: (id: string, exercises: Equation[]) => void;
    updateExercise: (blockId: string, exerciseId: string, updates: Partial<Equation>) => void;
    setActiveSelection: (id: string | 'document' | null) => void;
    updateHeader: (updates: Partial<HeaderData>) => void;
    updateFooter: (updates: Partial<FooterData>) => void;
    setShowSolutions: (show: boolean) => void;
}

export const useWorksheetStore = create<WorksheetState>((set) => ({
    blocks: [],
    activeBlockId: null,
    header: { naam: true, klas: true, nummer: false, datum: false, titel: '' },
    footer: { school: '', klas: '', leerkracht: '' },
    showSolutions: false,

    addBlockFromType: (typeId, label) => set((state) => {
        const defaultConstraints = {
            numberType: 'natural', decimalPlaces: 2, maxGetal: 1000,
            bridges: { E: 'FREE', T: 'FREE' },
            operand1Mask: {}, operand2Mask: {},

            
            fractionDifficulty: 'same',
            mixedNumber1: false,  // Checkbox breuk 1
            mixedNumber2: false,  // Checkbox breuk 2
            maxNumerator1: 10,
            maxDenominator1: 10,
            maxNumerator2: 10,
            maxDenominator2: 10,
            linkFractions: true,   // Koppel-knopje staat standaard aan

            //extra dingen voor vermenigvuldigen
            multiplicationMode: 'tafels', // 'tafels' of 'andere'
            selectedTables: [2, 3, 4, 5, 10], // Standaard een paar tafels geselecteerd
            tableLimit: 10 // Tot 10x of Tot 20x
        };

        const newBlock: MathBlock = {
            id: Math.random().toString(36).substring(2, 9),
            typeId,
            instructionText: `${label}:`,
            instructionMode: 'geen',
            layoutPreset: 'inline-short',
            steppedLines: 3,
            numberOfExercises: 10,
            totalPoints: 5,
            verticalSpacing: 14, 
            constraints: defaultConstraints,
            exercises: []
        };

        return { blocks: [...state.blocks, newBlock], activeBlockId: newBlock.id };
    }),

    removeBlock: (id) => set((state) => ({ blocks: state.blocks.filter(b => b.id !== id), activeBlockId: state.activeBlockId === id ? null : state.activeBlockId })),

    // Sorteren
    moveBlockUp: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index <= 0) return state; // Kan niet hoger
        const newBlocks = [...state.blocks];
        [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]; // Verwissel
        return { blocks: newBlocks };
    }),

    moveBlockDown: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1 || index === state.blocks.length - 1) return state; // Kan niet lager
        const newBlocks = [...state.blocks];
        [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]; // Verwissel
        return { blocks: newBlocks };
    }),

    updateBlockInstruction: (id, text) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, instructionText: text } : b) })),
    updateBlockLayout: (id, layout, steppedLines) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, layoutPreset: layout, steppedLines: steppedLines ?? b.steppedLines } : b) })),
    updateBlockSettings: (id, updates) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b) })),
    setBlockExercises: (id, exercises) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, exercises } : b) })),
    updateExercise: (blockId, exerciseId, updates) => set((state) => ({ blocks: state.blocks.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }) })),
    setActiveSelection: (id) => set({ activeBlockId: id }),
    updateHeader: (updates) => set((state) => ({ header: { ...state.header, ...updates } })),
    updateFooter: (updates) => set((state) => ({ footer: { ...state.footer, ...updates } })),
    setShowSolutions: (show) => set({ showSolutions: show })
}));