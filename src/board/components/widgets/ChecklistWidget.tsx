import { Check } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { checklistItems } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Tap-to-check classroom checklist; square or round boxes (settings).
export default function ChecklistWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const items = checklistItems(widget);
    const round = widget.props?.round === true;
    const checked: number[] = Array.isArray(widget.props?.checked) ? widget.props.checked as number[] : [];

    const toggle = (i: number) => {
        const next = checked.includes(i) ? checked.filter(x => x !== i) : [...checked, i];
        updateWidget(widget.id, { props: { ...widget.props, checked: next } });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 16px' }}>
            {items.map((item, i) => {
                const on = checked.includes(i);
                return (
                    <button
                        key={i} type="button"
                        onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(i)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                            padding: '6px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
                        }}
                    >
                        <span style={{
                            width: '30px', height: '30px', flexShrink: 0,
                            borderRadius: round ? '50%' : '7px',
                            border: '2.5px solid #111', background: on ? '#16a34a' : '#fff',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {on && <Check size={20} weight="bold" color="#fff" />}
                        </span>
                        <span style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: '19px', color: '#111',
                            textDecoration: on ? 'line-through' : 'none', opacity: on ? 0.55 : 1,
                        }}>{item}</span>
                    </button>
                );
            })}
        </div>
    );
}
