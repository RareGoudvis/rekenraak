import { Plus, Minus } from '@phosphor-icons/react';
import { MabPlaceColumn, type MabPlace } from '../../../components/viewer/MabBlocksSVG';
import { useBoardStore } from '../../useBoardStore';
import type { MabStyle } from '../../../services/math/types';
import type { BoardWidget } from '../../boardTypes';

const PLACES: Array<{ key: string; place: MabPlace; label: string; value: number }> = [
    { key: 'd', place: 'thousands', label: 'D', value: 1000 },
    { key: 'h', place: 'hundreds', label: 'H', value: 100 },
    { key: 't', place: 'tens', label: 'T', value: 10 },
    { key: 'e', place: 'units', label: 'E', value: 1 },
];

// Loose MAB manipulative: build any number by adding/removing Dienes blocks per
// place. Style realistisch (mab-color) / zwart-wit / symbolisch via settings.
export default function MabMatWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const style = (widget.props?.mabStyle ?? 'mab-color') as MabStyle;
    const showTotal = widget.props?.showTotal === true;
    const counts: Record<string, number> = {
        d: Number(widget.props?.d ?? 0), h: Number(widget.props?.h ?? 0),
        t: Number(widget.props?.t ?? 0), e: Number(widget.props?.e ?? 0),
    };
    const bump = (key: string, delta: number) =>
        updateWidget(widget.id, { props: { ...widget.props, [key]: Math.min(15, Math.max(0, counts[key] + delta)) } });

    const total = PLACES.reduce((s, p) => s + counts[p.key] * p.value, 0);
    const btn: React.CSSProperties = {
        width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.25)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };

    return (
        <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {PLACES.map(p => (
                    <div key={p.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: '15px', color: '#111' }}>{p.label}</div>
                        <div style={{ minHeight: '120px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <MabPlaceColumn count={counts[p.key]} place={p.place} style={style} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
                            <button type="button" style={btn} aria-label={`${p.label} erbij`} onClick={() => bump(p.key, 1)}><Plus size={16} /></button>
                            <span style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '15px', minWidth: '20px', textAlign: 'center' }}>{counts[p.key]}</span>
                            <button type="button" style={btn} aria-label={`${p.label} eraf`} onClick={() => bump(p.key, -1)}><Minus size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            {showTotal && (
                <div style={{ textAlign: 'center', marginTop: '10px', fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '26px', color: '#111' }}>
                    {total}
                </div>
            )}
        </div>
    );
}
