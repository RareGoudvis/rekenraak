export type ConstraintType = 'FREE' | 'REQUIRED' | 'FORBIDDEN';

export interface BridgeConstraints {
    units: ConstraintType;
    tens: ConstraintType;
    hundreds: ConstraintType;
}

export type LayoutPreset = 'inline-short' | 'inline-long' | 'stepped';

export interface Fraction {
    whole?: number; // geheel getal voor breuk
    n: number;      // Teller
    d: number;      // Noemer
}

export interface Equation {
    id: string;
    operands: (number | Fraction)[];
    operator: '+' | '-' | 'x' | ':';
    answer: number | Fraction; // we willen een getal of een breuk krijgen, voor de breuk roepen we het type van hierboven aan
    steps?: number[];
    isManuallyEdited: boolean;
    missingTerm?: 'result' | 'operand1' | 'operand2';
}

export interface MathBlock {
    id: string;
    typeId: string;
    instructionText: string;
    layoutPreset: LayoutPreset;
    instructionMode: 'geen' |'mag' | 'moet'
    steppedLines: number;
    numberOfExercises: number;
    totalPoints: number;
    constraints: any;
    exercises: Equation[];
    verticalSpacing: number; // witruimte na een oefening
}

export interface FooterData {
    school: string;
    klas: string;
    leerkracht: string;
}