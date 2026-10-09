import { Check } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { checklistProps } from '../../settings/listModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Today's tick colour; the accent or a row's own colour replaces it.
const CHECK_GREEN = '#16a34a';

// Tap-to-check classroom checklist; box shape, tick style, tap size, numbering and per-row
// colours come from the ⚙ panel.
export default function ChecklistWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = checklistProps(widget);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    const box = (p.bigTap ? 44 : 30) * fs;

    const toggle = (i: number) => {
        const next = p.checked.includes(i) ? p.checked.filter(x => x !== i) : [...p.checked, i];
        updateWidget(widget.id, { props: { ...widget.props, checked: next } });
    };

    // Row numbers skip blank rows (precomputed: render must not mutate a counter).
    const numbers = p.items.reduce<number[]>((acc, it) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + (it.text.trim() ? 1 : 0)], []);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: p.bigTap ? '10px' : '6px', padding: '12px 16px' }}>
            {p.items.map((item, i) => {
                if (!item.text.trim()) return null;
                const on = p.checked.includes(i);
                const color = item.color ?? accent;
                return (
                    <button
                        key={i} type="button" aria-pressed={on}
                        onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(i)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                            padding: p.bigTap ? '12px 8px' : '6px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
                            borderRadius: '10px',
                        }}
                    >
                        <span style={{
                            width: `${box}px`, height: `${box}px`, flexShrink: 0,
                            borderRadius: p.round ? '50%' : '7px',
                            border: `2.5px solid ${color ?? '#111'}`, background: on ? (color ?? CHECK_GREEN) : '#fff',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {on && <Check size={box * 0.66} weight="bold" color="#fff" />}
                        </span>
                        <span style={{
                            fontFamily: "'Azeret Mono', monospace", fontSize: `${(p.bigTap ? 24 : 19) * fs}px`, color: '#111',
                            textDecoration: on && p.checkStyle === 'doorstreep' ? 'line-through' : 'none',
                            opacity: on && p.checkStyle !== 'vink' ? (p.checkStyle === 'vervaag' ? 0.4 : 0.55) : 1,
                        }}>
                            {p.numbered && <span style={{ fontWeight: 700, color: color ?? '#111' }}>{numbers[i]}. </span>}
                            {item.text}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
