import { useBoardStore } from '../../useBoardStore';
import type { BoardWidget } from '../../boardTypes';

// Free text card. Editing happens directly in the textarea (tap to focus);
// dragging uses the frame's drag handle, so the two never fight.
export default function TekstWidget({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const text = String(widget.props?.text ?? '');
    return (
        <textarea
            value={text}
            placeholder="Typ hier…"
            onChange={(e) => updateWidget(widget.id, { props: { ...widget.props, text: e.target.value } })}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
                width: '100%', minHeight: '80px', resize: 'none',
                background: 'transparent', border: 'none', outline: 'none',
                color: dark ? '#fff' : '#111', fontSize: '26px', lineHeight: 1.4,
                fontFamily: "'Azeret Mono', monospace",
            }}
            rows={Math.max(2, text.split('\n').length)}
        />
    );
}
