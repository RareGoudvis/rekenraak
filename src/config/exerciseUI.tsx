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
import OrdenenViewer from '../components/viewer/OrdenenViewer';
import DeelbaarheidViewer from '../components/viewer/DeelbaarheidViewer';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
import TemperatuurViewer from '../components/viewer/TemperatuurViewer';
import PlaatswaardeViewer from '../components/viewer/PlaatswaardeViewer';
import EvenOnevenViewer from '../components/viewer/EvenOnevenViewer';
import VergelijkenViewer from '../components/viewer/VergelijkenViewer';
import AfrondenViewer from '../components/viewer/AfrondenViewer';
import RomeinseViewer from '../components/viewer/RomeinseViewer';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';

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
import OrdenenConfig from '../components/configurator/plugins/OrdenenConfig';
import DeelbaarheidConfig from '../components/configurator/plugins/DeelbaarheidConfig';
import GetallenasConfig from '../components/configurator/plugins/GetallenasConfig';
import TemperatuurConfig from '../components/configurator/plugins/TemperatuurConfig';
import PlaatswaardeConfig from '../components/configurator/plugins/PlaatswaardeConfig';
import EvenOnevenConfig from '../components/configurator/plugins/EvenOnevenConfig';
import VergelijkenConfig from '../components/configurator/plugins/VergelijkenConfig';
import AfrondenConfig from '../components/configurator/plugins/AfrondenConfig';
import RomeinseConfig from '../components/configurator/plugins/RomeinseConfig';
import HerleidingenConfig from '../components/configurator/plugins/HerleidingenConfig';

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

    'ordenen':      { Viewer: OrdenenViewer,      Config: OrdenenConfig },
    'deelbaarheid': { Viewer: DeelbaarheidViewer, Config: DeelbaarheidConfig },
    'getallenas':   { Viewer: GetallenasViewer,   Config: GetallenasConfig },
    'temperatuur':  { Viewer: TemperatuurViewer,  Config: TemperatuurConfig },
    'plaatswaarde': { Viewer: PlaatswaardeViewer, Config: PlaatswaardeConfig },
    'even-oneven':  { Viewer: EvenOnevenViewer,   Config: EvenOnevenConfig },
    'vergelijken':  { Viewer: VergelijkenViewer,  Config: VergelijkenConfig },
    'afronden':     { Viewer: AfrondenViewer,     Config: AfrondenConfig },
    'romeinse-cijfers': { Viewer: RomeinseViewer, Config: RomeinseConfig },
    'herleidingen': { Viewer: HerleidingenViewer, Config: HerleidingenConfig },
};
