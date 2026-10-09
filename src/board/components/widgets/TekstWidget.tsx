import { useState } from 'react';
import { useBoardStore } from '../../useBoardStore';
import { tekstProps, TEKST_FONTS, TEKST_LINE_HEIGHT } from '../../settings/tekstModel';
import { widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Free text card. Editing happens directly in the textarea (tap to focus); dragging uses the
// frame's drag handle, so the two never fight. In bullet mode the card shows a rendered list
// and swaps to the raw textarea while it has focus.
export default function TekstWidget({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const m = tekstProps(widget);
    const [editing, setEditing] = useState(false);
    const linePx = m.textPx * TEKST_LINE_HEIGHT;

    const box: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box', minHeight: '80px', margin: 0,
        padding: `${m.padding}px`, border: 'none', outline: 'none',
        background: m.bg || 'transparent',
        color: widgetAccent(widget) ?? (dark ? '#fff' : '#111'),
        fontSize: `${m.textPx}px`, lineHeight: TEKST_LINE_HEIGHT,
        fontFamily: TEKST_FONTS[m.font],
        fontWeight: m.bold ? 700 : undefined, fontStyle: m.italic ? 'italic' : undefined,
        textAlign: m.align,
        whiteSpace: m.wrap === 'eenregel' ? 'pre' : 'pre-wrap',
        overflowX: m.wrap === 'eenregel' ? 'auto' : undefined,
        // Notebook ruling: one line per text line, drawn at the baseline gap and scrolling with the text.
        ...(m.lines ? {
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${linePx - 1.5}px, ${m.lineColor} ${linePx - 1.5}px, ${m.lineColor} ${linePx}px)`,
            backgroundPosition: `0 ${m.padding}px`,
            backgroundAttachment: 'local',
        } : {}),
    };

    if (m.bullets !== 'geen' && !editing) {
        const items = m.text.split('\n').filter(l => l.trim());
        const ListTag = m.bullets === 'nummers' ? 'ol' : 'ul';
        return (
            <div data-tekst-view tabIndex={0} role="textbox" aria-label="Tekst bewerken"
                onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditing(true)} onFocus={() => setEditing(true)}
                style={{ ...box, cursor: 'text' }}>
                {items.length ? (
                    <ListTag style={{ margin: 0, paddingLeft: m.align === 'left' ? `${m.textPx * 1.3}px` : 0, listStylePosition: m.align === 'left' ? 'outside' : 'inside' }}>
                        {items.map((l, i) => <li key={i}>{l}</li>)}
                    </ListTag>
                ) : <span style={{ opacity: 0.45 }}>Typ hier…</span>}
            </div>
        );
    }

    return (
        <textarea
            value={m.text}
            placeholder="Typ hier…"
            autoFocus={editing}
            wrap={m.wrap === 'eenregel' ? 'off' : undefined}
            onBlur={() => setEditing(false)}
            onChange={(e) => updateWidget(widget.id, { props: { ...widget.props, text: e.target.value } })}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ ...box, resize: 'none' }}
            rows={Math.max(2, m.text.split('\n').length)}
        />
    );
}
