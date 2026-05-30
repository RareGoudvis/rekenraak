import type { FC } from 'react';
import type { MathBlock } from '../services/math/types';

// Viewers (one per family). All take a uniform {block, showSolutions}.
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import CijferViewer from '../components/viewer/CijferViewer';
import ClockViewer from '../components/viewer/ClockViewer';
import FractionViewer from '../components/viewer/FractionViewer';
import SplitsenViewer from '../components/viewer/SplitsenViewer';
import GeldViewer from '../components/viewer/GeldViewer';
import GeldTekenenViewer from '../components/viewer/GeldTekenenViewer';
import GeldWisselViewer from '../components/viewer/GeldWisselViewer';
import GeldTeruggevenViewer from '../components/viewer/GeldTeruggevenViewer';
import MabViewer from '../components/viewer/MabViewer';

// Config plugins (one per family). All take {block}.
import AdditionConfig from '../components/configurator/plugins/AdditionConfig';
import SubtractionConfig from '../components/configurator/plugins/SubtractionConfig';
import MultiplicationConfig from '../components/configurator/plugins/MultiplicationConfig';
import DivisionConfig from '../components/configurator/plugins/DivisionConfig';
import CijferConfig from '../components/configurator/plugins/CijferConfig';
import ClockConfig from '../components/configurator/plugins/ClockConfig';
import FractionConfig from '../components/configurator/plugins/FractionConfig';
import SplitsenConfig from '../components/configurator/plugins/SplitsenConfig';
import GeldConfig from '../components/configurator/plugins/GeldConfig';
import GeldWisselConfig from '../components/configurator/plugins/GeldWisselConfig';
import GeldTeruggevenConfig from '../components/configurator/plugins/GeldTeruggevenConfig';
import MabConfig from '../components/configurator/plugins/MabConfig';

// ── React side of the registry ──────────────────────────────────────────────
// Keyed by the SAME typeIds as REGISTRY in exerciseRegistry.ts. Split out so the
// pure-data registry (imported by the store) carries no React/component imports.
// SYNC: every typeId in exerciseRegistry.ts must have a row here and vice versa.

export type ViewerComponent = FC<{ block: MathBlock; showSolutions: boolean }>;
export type ConfigComponent = FC<{ block: MathBlock }>;

export interface ExerciseUIDef {
    Viewer: ViewerComponent;
    Config: ConfigComponent;
}

export const EXERCISE_UI: Record<string, ExerciseUIDef> = {
    // Mental math — shared viewer, operation-specific config.
    'hr-std-optellen':         { Viewer: MathBlockRenderer, Config: AdditionConfig },
    'hr-std-aftrekken':        { Viewer: MathBlockRenderer, Config: SubtractionConfig },
    'hr-std-vermenigvuldigen': { Viewer: MathBlockRenderer, Config: MultiplicationConfig },
    'hr-std-delen':            { Viewer: MathBlockRenderer, Config: DivisionConfig },

    // Cijferen — shared viewer + config across all 8 leaves.
    'cijferen-optellen-nat':         { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-optellen-dec':         { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-aftrekken-nat':        { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-aftrekken-dec':        { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-vermenigvuldigen-nat': { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-vermenigvuldigen-dec': { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-delen-nat':            { Viewer: CijferViewer, Config: CijferConfig },
    'cijferen-delen-dec':            { Viewer: CijferViewer, Config: CijferConfig },

    'klok-kloklezen': { Viewer: ClockViewer,    Config: ClockConfig },
    'breuken':        { Viewer: FractionViewer, Config: FractionConfig },
    'splitsen':       { Viewer: SplitsenViewer, Config: SplitsenConfig },

    'geld-herkennen':  { Viewer: GeldViewer,           Config: GeldConfig },
    'geld-tekenen':    { Viewer: GeldTekenenViewer,    Config: GeldConfig },
    'geld-wissel':     { Viewer: GeldWisselViewer,     Config: GeldWisselConfig },
    'geld-teruggeven': { Viewer: GeldTeruggevenViewer, Config: GeldTeruggevenConfig },

    'mab-herkennen': { Viewer: MabViewer, Config: MabConfig },
    'mab-tekenen':   { Viewer: MabViewer, Config: MabConfig },
};
