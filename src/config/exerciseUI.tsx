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
import BreukBewerkViewer from '../components/viewer/BreukBewerkViewer';
import DeelbaarheidViewer from '../components/viewer/DeelbaarheidViewer';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
import GetallenrijenViewer from '../components/viewer/GetallenrijenViewer';
import MetenViewer from '../components/viewer/MetenViewer';
import PatroonViewer from '../components/viewer/PatroonViewer';
import DeelbaarheidKleurViewer from '../components/viewer/DeelbaarheidKleurViewer';
import TemperatuurViewer from '../components/viewer/TemperatuurViewer';
import PlaatswaardeViewer from '../components/viewer/PlaatswaardeViewer';
import EvenOnevenViewer from '../components/viewer/EvenOnevenViewer';
import VergelijkenViewer from '../components/viewer/VergelijkenViewer';
import AfrondenViewer from '../components/viewer/AfrondenViewer';
import RomeinseViewer from '../components/viewer/RomeinseViewer';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import SchattendViewer from '../components/viewer/SchattendViewer';
import VerbandenViewer from '../components/viewer/VerbandenViewer';
import ProcentenViewer from '../components/viewer/ProcentenViewer';
import MaateenheidViewer from '../components/viewer/MaateenheidViewer';
import GeldRekenenViewer from '../components/viewer/GeldRekenenViewer';
import LayoutBlockViewer from '../components/viewer/LayoutBlockViewer';
import LayoutConfig from '../components/configurator/plugins/LayoutConfig';
import RekenvolgordeViewer from '../components/viewer/RekenvolgordeViewer';
import GetalFunctieViewer from '../components/viewer/GetalFunctieViewer';
import TijdsduurViewer from '../components/viewer/TijdsduurViewer';
import KalenderViewer from '../components/viewer/KalenderViewer';
import ControlerenViewer from '../components/viewer/ControlerenViewer';
import OppervlakteViewer from '../components/viewer/OppervlakteViewer';
import WeegschaalViewer from '../components/viewer/WeegschaalViewer';
import VormleerViewer from '../components/viewer/VormleerViewer';

// Config plugins (one per family). All take {block}.
import AdditionConfig from '../components/configurator/plugins/AdditionConfig';
import GemengdConfig from '../components/configurator/plugins/GemengdConfig';
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
import OrdenenConfig, { OrdenenStyleConfig } from '../components/configurator/plugins/OrdenenConfig';
import BreukBewerkConfig from '../components/configurator/plugins/BreukBewerkConfig';
import BreukenRangschikkenConfig, { BreukenRangschikkenStyleConfig } from '../components/configurator/plugins/BreukenRangschikkenConfig';
import DeelbaarheidConfig from '../components/configurator/plugins/DeelbaarheidConfig';
import GetallenasConfig from '../components/configurator/plugins/GetallenasConfig';
import GetallenrijenConfig from '../components/configurator/plugins/GetallenrijenConfig';
import MetenConfig from '../components/configurator/plugins/MetenConfig';
import PatroonConfig from '../components/configurator/plugins/PatroonConfig';
import DeelbaarheidKleurConfig from '../components/configurator/plugins/DeelbaarheidKleurConfig';
import TemperatuurConfig from '../components/configurator/plugins/TemperatuurConfig';
import PlaatswaardeConfig from '../components/configurator/plugins/PlaatswaardeConfig';
import EvenOnevenConfig from '../components/configurator/plugins/EvenOnevenConfig';
import VergelijkenConfig from '../components/configurator/plugins/VergelijkenConfig';
import AfrondenConfig from '../components/configurator/plugins/AfrondenConfig';
import RomeinseConfig from '../components/configurator/plugins/RomeinseConfig';
import HerleidingenConfig from '../components/configurator/plugins/HerleidingenConfig';
import SchattendConfig from '../components/configurator/plugins/SchattendConfig';
import VerbandenConfig from '../components/configurator/plugins/VerbandenConfig';
import ProcentenConfig from '../components/configurator/plugins/ProcentenConfig';
import MaateenheidConfig from '../components/configurator/plugins/MaateenheidConfig';
import GeldRekenenConfig from '../components/configurator/plugins/GeldRekenenConfig';
import RekenvolgordeConfig from '../components/configurator/plugins/RekenvolgordeConfig';
import RekenvolgordeStyleConfig from '../components/configurator/plugins/RekenvolgordeStyleConfig';
import KettingConfig from '../components/configurator/plugins/KettingConfig';
import GetalFunctieConfig from '../components/configurator/plugins/GetalFunctieConfig';
import TijdsduurConfig from '../components/configurator/plugins/TijdsduurConfig';
import KalenderConfig from '../components/configurator/plugins/KalenderConfig';
import ControlerenConfig from '../components/configurator/plugins/ControlerenConfig';
import OppervlakteConfig from '../components/configurator/plugins/OppervlakteConfig';
import WeegschaalConfig from '../components/configurator/plugins/WeegschaalConfig';
import VormleerConfig from '../components/configurator/plugins/VormleerConfig';

// Per-family Opmaak sections (Differentiatie rows + the Geavanceerd accordion body).
// They live next to the family's own settings so one file owns the whole option list.
import { AddSubStyleConfig, MulDivStyleConfig } from '../components/configurator/plugins/shared/HrStdStyleConfig';
import { CijferStyleConfig, CijferAdvancedConfig } from '../components/configurator/plugins/CijferConfig';
import { FractionStyleConfig, FractionAdvancedConfig, fractionAdvancedApplies } from '../components/configurator/plugins/FractionConfig';
import { SplitsenAdvancedConfig } from '../components/configurator/plugins/SplitsenConfig';
import { GeldStyleConfig, GeldAdvancedConfig } from '../components/configurator/plugins/GeldConfig';
import { GeldTeruggevenStyleConfig } from '../components/configurator/plugins/GeldTeruggevenConfig';
import { MabStyleConfig, MabAdvancedConfig } from '../components/configurator/plugins/MabConfig';
import { GetallenrijenStyleConfig } from '../components/configurator/plugins/GetallenrijenConfig';
import { PatroonStyleConfig } from '../components/configurator/plugins/PatroonConfig';
import { MetenStyleConfig } from '../components/configurator/plugins/MetenConfig';
import { HerleidingenStyleConfig, HerleidingenAdvancedConfig } from '../components/configurator/plugins/HerleidingenConfig';
import { ControlerenStyleConfig } from '../components/configurator/plugins/ControlerenConfig';

// ── React side of the registry ──────────────────────────────────────────────
// Keyed by the SAME typeIds as REGISTRY in exerciseRegistry.ts. Split out so the
// pure-data registry (imported by the store) carries no React/component imports.
// SYNC: every typeId in exerciseRegistry.ts must have a row here and vice versa.

export type ViewerComponent = FC<{ block: MathBlock; showSolutions: boolean }>;
export type ConfigComponent = FC<{ block: MathBlock }>;

export interface ExerciseUIDef {
    Viewer: ViewerComponent;
    Config: ConfigComponent;
    /** Differentiatie rows that belong to this family (Inspector mounts them; no typeId branch). */
    StyleConfig?: ConfigComponent;
    /** Body of the Geavanceerd accordion for this family. Its presence is what shows the accordion. */
    AdvancedConfig?: ConfigComponent;
    /** Optional extra test: the accordion is only worth opening when this returns true. */
    advancedApplies?: (block: MathBlock) => boolean;
}

export const EXERCISE_UI: Record<string, ExerciseUIDef> = {
    // Mental math — shared viewer, operation-specific config.
    'hr-std-optellen':         { Viewer: MathBlockRenderer, Config: AdditionConfig, StyleConfig: AddSubStyleConfig },
    'hr-std-aftrekken':        { Viewer: MathBlockRenderer, Config: SubtractionConfig, StyleConfig: AddSubStyleConfig },
    'hr-std-vermenigvuldigen': { Viewer: MathBlockRenderer, Config: MultiplicationConfig, StyleConfig: MulDivStyleConfig },
    'hr-std-delen':            { Viewer: MathBlockRenderer, Config: DivisionConfig, StyleConfig: MulDivStyleConfig },
    'hr-std-gemengd':          { Viewer: MathBlockRenderer, Config: GemengdConfig, StyleConfig: AddSubStyleConfig },

    // Cijferen — shared viewer + config across all 8 leaves.
    'cijferen-optellen-nat':         { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-optellen-dec':         { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-aftrekken-nat':        { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-aftrekken-dec':        { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-vermenigvuldigen-nat': { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-vermenigvuldigen-dec': { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-delen-nat':            { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },
    'cijferen-delen-dec':            { Viewer: CijferViewer, Config: CijferConfig, StyleConfig: CijferStyleConfig, AdvancedConfig: CijferAdvancedConfig },

    'klok-kloklezen': { Viewer: ClockViewer,    Config: ClockConfig },
    'breuken':        { Viewer: FractionViewer, Config: FractionConfig, StyleConfig: FractionStyleConfig, AdvancedConfig: FractionAdvancedConfig, advancedApplies: fractionAdvancedApplies },
    'splitsen':       { Viewer: SplitsenViewer, Config: SplitsenConfig, AdvancedConfig: SplitsenAdvancedConfig },

    'geld-herkennen':  { Viewer: GeldViewer,           Config: GeldConfig, StyleConfig: GeldStyleConfig, AdvancedConfig: GeldAdvancedConfig },
    'geld-tekenen':    { Viewer: GeldTekenenViewer,    Config: GeldConfig, StyleConfig: GeldStyleConfig, AdvancedConfig: GeldAdvancedConfig },
    'geld-wissel':     { Viewer: GeldWisselViewer,     Config: GeldWisselConfig, AdvancedConfig: GeldAdvancedConfig },
    // No AdvancedConfig: geld-teruggeven has no Geavanceerd settings, and the accordion
    // only appears for rows that register one.
    'geld-teruggeven': { Viewer: GeldTeruggevenViewer, Config: GeldTeruggevenConfig, StyleConfig: GeldTeruggevenStyleConfig },

    'mab-herkennen': { Viewer: MabViewer, Config: MabConfig, StyleConfig: MabStyleConfig, AdvancedConfig: MabAdvancedConfig },
    'mab-tekenen':   { Viewer: MabViewer, Config: MabConfig, StyleConfig: MabStyleConfig, AdvancedConfig: MabAdvancedConfig },

    'ordenen':      { Viewer: OrdenenViewer,      Config: OrdenenConfig, StyleConfig: OrdenenStyleConfig },
    'breuken-bewerken':     { Viewer: BreukBewerkViewer, Config: BreukBewerkConfig },
    'breuken-rangschikken': { Viewer: OrdenenViewer,     Config: BreukenRangschikkenConfig, StyleConfig: BreukenRangschikkenStyleConfig },
    'deelbaarheid': { Viewer: DeelbaarheidViewer, Config: DeelbaarheidConfig },
    'getalpatronen': { Viewer: PatroonViewer, Config: PatroonConfig, StyleConfig: PatroonStyleConfig },
    'deelbaarheid-kleuren': { Viewer: DeelbaarheidKleurViewer, Config: DeelbaarheidKleurConfig },
    'getallenas':   { Viewer: GetallenasViewer,   Config: GetallenasConfig },
    'getallenrijen':{ Viewer: GetallenrijenViewer, Config: GetallenrijenConfig, StyleConfig: GetallenrijenStyleConfig },
    'lengte-meten': { Viewer: MetenViewer, Config: MetenConfig, StyleConfig: MetenStyleConfig },
    'omtrek':       { Viewer: MetenViewer, Config: MetenConfig, StyleConfig: MetenStyleConfig },
    'temperatuur':  { Viewer: TemperatuurViewer,  Config: TemperatuurConfig },
    'plaatswaarde': { Viewer: PlaatswaardeViewer, Config: PlaatswaardeConfig },
    'even-oneven':  { Viewer: EvenOnevenViewer,   Config: EvenOnevenConfig },
    'vergelijken':  { Viewer: VergelijkenViewer,  Config: VergelijkenConfig },
    'afronden':     { Viewer: AfrondenViewer,     Config: AfrondenConfig },
    'romeinse-cijfers': { Viewer: RomeinseViewer, Config: RomeinseConfig },
    'herleidingen': { Viewer: HerleidingenViewer, Config: HerleidingenConfig, StyleConfig: HerleidingenStyleConfig, AdvancedConfig: HerleidingenAdvancedConfig },

    'schattend': { Viewer: SchattendViewer, Config: SchattendConfig },

    'verbanden': { Viewer: VerbandenViewer, Config: VerbandenConfig },
    'procenten': { Viewer: ProcentenViewer, Config: ProcentenConfig },

    'maateenheid':  { Viewer: MaateenheidViewer, Config: MaateenheidConfig },
    'geld-rekenen': { Viewer: GeldRekenenViewer, Config: GeldRekenenConfig, AdvancedConfig: GeldAdvancedConfig },

    'rekenvolgorde':  { Viewer: RekenvolgordeViewer, Config: RekenvolgordeConfig, StyleConfig: RekenvolgordeStyleConfig },
    'layout-sectie':        { Viewer: LayoutBlockViewer, Config: LayoutConfig },
    'layout-schrijflijnen': { Viewer: LayoutBlockViewer, Config: LayoutConfig },
    'layout-raster':        { Viewer: LayoutBlockViewer, Config: LayoutConfig },
    'layout-kader':         { Viewer: LayoutBlockViewer, Config: LayoutConfig },
    'layout-lege-pagina':   { Viewer: LayoutBlockViewer, Config: LayoutConfig },
    'kettingsommen':  { Viewer: PatroonViewer,       Config: KettingConfig },
    'getalfunctie':   { Viewer: GetalFunctieViewer,  Config: GetalFunctieConfig },
    'tijdsduur':      { Viewer: TijdsduurViewer,     Config: TijdsduurConfig },
    'kalender':       { Viewer: KalenderViewer,      Config: KalenderConfig },
    'controleren':    { Viewer: ControlerenViewer,   Config: ControlerenConfig, StyleConfig: ControlerenStyleConfig },

    // Meetkunde + SVG-heavy meten types — vormleer shares one viewer/config trio.
    'oppervlakte': { Viewer: OppervlakteViewer, Config: OppervlakteConfig },
    'weegschaal':  { Viewer: WeegschaalViewer,  Config: WeegschaalConfig },
    'vormleer-punt-lijn': { Viewer: VormleerViewer, Config: VormleerConfig },
    'vormleer-hoeken':    { Viewer: VormleerViewer, Config: VormleerConfig },
    'vormleer-figuren':   { Viewer: VormleerViewer, Config: VormleerConfig },
};
