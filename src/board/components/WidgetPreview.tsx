import { useLayoutEffect, useRef, useState } from 'react';
import { WidgetContent } from './BoardPageCanvas';
import { NATURAL_W } from '../widgetSizing';
import { loadWidgetDefaults } from '../settings/widgetDefaults';
import type { BoardWidget, WidgetKind } from '../boardTypes';

// The widget tiles' preview box is this tall; the box clips what does not fit.
export const PREVIEW_H = 100;
// A preview is a glance, not a second card: never blown up past this zoom.
const MAX_ZOOM = 0.6;
// First-paint width before the box is measured (jsdom never measures).
const FALLBACK_W = 200;

// The real widget in its idle state with the props a tap would add (the teacher's own standaard
// under the tool's payload, as addWidget merges them), zoomed like WidgetFrame's body, no chrome.
export default function WidgetPreview({ kind, props }: { kind: WidgetKind; props?: Record<string, unknown> }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [boxW, setBoxW] = useState(0);
    useLayoutEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const read = () => setBoxW(el.clientWidth);
        read();
        const ro = new ResizeObserver(read);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const natural = NATURAL_W[kind];
    const zoom = Math.min(MAX_ZOOM, (boxW || FALLBACK_W) / natural);
    const widget: BoardWidget = {
        id: `preview-${kind}`, kind, x: 0, y: 0, w: natural, z: 0,
        // A fixed place (Brussels) so the weather preview never raises the browser's location prompt.
        props: { ...(kind === 'weer' ? { lat: 50.85, lon: 4.35 } : {}), ...(kind === 'exercise' ? {} : loadWidgetDefaults(kind) ?? {}), ...props, showHeader: false },
    };

    return (
        <div ref={boxRef} aria-hidden="true" data-widget-preview={kind}
            style={{ height: PREVIEW_H, width: '100%', overflow: 'hidden', pointerEvents: 'none', textAlign: 'left' }}>
            <div style={{ zoom, width: natural }}>
                <WidgetContent widget={widget} />
            </div>
        </div>
    );
}
