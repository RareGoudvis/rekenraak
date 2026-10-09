import type { BoardWidget, WidgetKind } from '../boardTypes';
import { cleanProps, type Schema } from './propSchema';
import { STOPWATCH_SCHEMA, STOPWATCH_CONTENT_KEYS } from './stopwatchModel';
import { TIMER_SCHEMA, TIMER_CONTENT_KEYS } from './timerModel';
import { ADEM_SCHEMA, ADEM_CONTENT_KEYS } from './ademModel';
import { GELUID_SCHEMA, GELUID_CONTENT_KEYS } from './geluidModel';
import { DOBBEL_SCHEMA, DOBBEL_CONTENT_KEYS } from './dobbelModel';

// Per-kind props schema (one line per kind) + the content keys "Standaard herstellen" keeps
// (widgetDefaults.resetProps).
export const PROP_SCHEMAS: Partial<Record<WidgetKind, { schema: Schema; content: readonly string[] }>> = {
    stopwatch: { schema: STOPWATCH_SCHEMA, content: STOPWATCH_CONTENT_KEYS },
    timer: { schema: TIMER_SCHEMA, content: TIMER_CONTENT_KEYS },
    adem: { schema: ADEM_SCHEMA, content: ADEM_CONTENT_KEYS },
    geluid: { schema: GELUID_SCHEMA, content: GELUID_CONTENT_KEYS },
    dobbelsteen: { schema: DOBBEL_SCHEMA, content: DOBBEL_CONTENT_KEYS },
};

// Load-time clean-up of one widget's props: junk values of schema'd keys are dropped so the
// read-time default applies; kinds without a schema pass through untouched.
export function cleanWidgetProps(w: BoardWidget): BoardWidget {
    const entry = PROP_SCHEMAS[w.kind];
    if (!entry || !w.props || typeof w.props !== 'object' || Array.isArray(w.props)) return w;
    return { ...w, props: cleanProps(entry.schema, w.props) };
}
