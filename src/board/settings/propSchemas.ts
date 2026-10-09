import type { BoardWidget, WidgetKind } from '../boardTypes';
import { cleanProps, type Schema } from './propSchema';
import { STOPWATCH_SCHEMA, STOPWATCH_CONTENT_KEYS } from './stopwatchModel';

// Per-kind props schema (one line per kind) + the content keys "Standaard herstellen" keeps
// (widgetDefaults.resetProps).
export const PROP_SCHEMAS: Partial<Record<WidgetKind, { schema: Schema; content: readonly string[] }>> = {
    stopwatch: { schema: STOPWATCH_SCHEMA, content: STOPWATCH_CONTENT_KEYS },
};

// Load-time clean-up of one widget's props: junk values of schema'd keys are dropped so the
// read-time default applies; kinds without a schema pass through untouched.
export function cleanWidgetProps(w: BoardWidget): BoardWidget {
    const entry = PROP_SCHEMAS[w.kind];
    if (!entry || !w.props || typeof w.props !== 'object' || Array.isArray(w.props)) return w;
    return { ...w, props: cleanProps(entry.schema, w.props) };
}
