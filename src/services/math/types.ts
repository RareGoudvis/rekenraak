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
    remainder?: number;
}

export type FractionShape = 'rectangle' | 'circle';

export type FractionSubType =
    | 'kleuren'
    | 'herkennen'
    | 'hoeveelheid'
    | 'hoeveelheid-rechthoek'
    | 'hoeveelheid-abstract'
    | 'lijnstuk'
    | 'veelhoek';

export interface FractionExercise {
    id: string;
    subType: FractionSubType;
    numerator: number;
    denominator: number;
    // Shape-based (kleuren, herkennen, tekenen)
    shape?: FractionShape;
    coloredIndices?: number[];
    gridRows?: number;
    gridCols?: number;
    // Amount-based (hoeveelheid, hoeveelheid-rechthoek)
    total?: number;
    objectShape?: 'circle' | 'square';
    // Line segment (lijnstuk)
    lineLength?: number;
    // Veelhoek grid rectangle
    rectangleWidth?: number;
    rectangleHeight?: number;
    isManuallyEdited: boolean;
}

export interface MathBlock {
    id: string;
    typeId: string;
    instructionText: string;
    layoutPreset: LayoutPreset;
    instructionMode: 'geen' | 'mag' | 'moet' | 'plus' | 'aangepast';
    customInstructionText?: string;
    steppedLines: number;
    numberOfExercises: number;
    totalPoints: number;
    constraints: any;
    exercises: Equation[];
    clockExercises?: ClockExercise[];
    fractionExercises?: FractionExercise[];
    verticalSpacing: number;
}

export interface ClockExercise {
    id: string;
    hours: number;        // 1-12 (12h mode) or 0-23 (24h mode)
    minutes: number;      // 0-59
    timeText: string;     // "kwart over 3", "25 voor 1"
    digitalText: string;  // "03:15"
    isManuallyEdited: boolean;
}

export interface FooterData {
    school: string;
    klas: string;
    leerkracht: string;
    showSchool: boolean;
    showKlas: boolean;
    showLeerkracht: boolean;
    showPagina: boolean;
    centerText: string;
    showCenterText: boolean;
}