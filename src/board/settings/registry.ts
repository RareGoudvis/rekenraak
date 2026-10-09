import type { ComponentType } from 'react';
import type { BoardWidget, WidgetKind } from '../boardTypes';
import KlokSettings from './KlokSettings';
import WeerSettings from './WeerSettings';
import NamenSettings from './NamenSettings';
import DatumSettings from './DatumSettings';
import WerksymbolenSettings from './WerksymbolenSettings';
import GroepjesSettings from './GroepjesSettings';
import ChecklistSettings from './ChecklistSettings';
import StappenplanSettings from './StappenplanSettings';
import StopwatchSettings from './StopwatchSettings';
import TimerSettings from './TimerSettings';
import AdemSettings from './AdemSettings';
import GeluidSettings from './GeluidSettings';
import DobbelsteenSettings from './DobbelsteenSettings';

export type WidgetSettingsPanel = ComponentType<{ widget: BoardWidget }>;

// One ⚙ panel per widget kind (src/board/settings/<Kind>Settings.tsx), looked up by
// WidgetInspector — no kind switch anywhere else. Under every panel WidgetInspector adds the
// baseline all kinds share (BaselineSettings.tsx): Titel, Titelbalk tonen, Tekstgrootte
// (props.fontSize, baseProps.FONT_SIZES), Accentkleur (props.accent) and the Standaard pair
// (reset; "Bewaar als mijn standaard" → rekenraak_board_defaults_v1, applied by addWidget).
// A kind's prop reader defaults every missing or junk key to today's look.
export const WIDGET_SETTINGS: Partial<Record<WidgetKind, WidgetSettingsPanel>> = {
    klok: KlokSettings,
    weer: WeerSettings,
    namen: NamenSettings,
    datum: DatumSettings,
    werksymbolen: WerksymbolenSettings,
    groepjes: GroepjesSettings,
    checklist: ChecklistSettings,
    stappenplan: StappenplanSettings,
    stopwatch: StopwatchSettings,
    timer: TimerSettings,
    adem: AdemSettings,
    geluid: GeluidSettings,
    dobbelsteen: DobbelsteenSettings,
};
