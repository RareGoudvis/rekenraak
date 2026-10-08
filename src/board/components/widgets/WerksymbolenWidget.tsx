import { SpeakerSlash, Ear, HandPointing, UsersThree, ChalkboardTeacher } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { werksymbolenProps, WERKSYMBOLEN } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';
import type { Icon } from '@phosphor-icons/react';

const ICONS: Record<string, Icon> = {
    stil: SpeakerSlash, fluisteren: Ear, buur: HandPointing, samen: UsersThree, juf: ChalkboardTeacher,
};

// Work-mode selector (owner screenshot): tap a tile = active mode (red), rest dimmed.
// Layout + icon-only + visible modes are settings.
export default function WerksymbolenWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = werksymbolenProps(widget);
    const modes = WERKSYMBOLEN.filter(m => p.enabled.includes(m.key));

    return (
        <div style={{
            display: p.vertical ? 'flex' : 'grid',
            flexDirection: p.vertical ? 'column' : undefined,
            gridTemplateColumns: p.vertical ? undefined : 'repeat(3, 1fr)',
            gap: '10px', padding: '14px',
        }}>
            {modes.map(m => {
                const Icon = ICONS[m.key];
                const active = p.active === m.key;
                return (
                    <button
                        key={m.key} type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => updateWidget(widget.id, { props: { ...widget.props, active: m.key } })}
                        style={{
                            display: 'flex', flexDirection: p.vertical && p.iconOnly ? 'row' : 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            minHeight: p.iconOnly ? '64px' : '92px', padding: '10px 8px',
                            borderRadius: '12px', cursor: 'pointer',
                            border: active ? '2px solid #dc2626' : '1px solid rgba(0,0,0,0.15)',
                            background: active ? '#ef4444' : 'rgba(0,0,0,0.03)',
                            color: active ? '#fff' : '#444',
                            fontFamily: "'Azeret Mono', monospace", fontSize: '13px', fontWeight: active ? 700 : 400,
                            transition: 'background 120ms',
                        }}
                    >
                        <Icon size={30} weight={active ? 'fill' : 'regular'} />
                        {!p.iconOnly && <span style={{ textAlign: 'center', lineHeight: 1.25 }}>{m.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}
