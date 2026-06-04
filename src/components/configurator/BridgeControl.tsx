import { ArrowBendLeftUp } from '@phosphor-icons/react';
import type { ConstraintType } from '../../services/math/types';

interface BridgePlace { key: string; label?: string }

interface Props {
    places: BridgePlace[];                 // high→low (getBridgePlaces order)
    bridges: Record<string, ConstraintType>;
    onChange: (key: string, value: ConstraintType) => void;
}

// 'bruggetje' = a carry/borrow across a place-value boundary (Dutch primary term).
// bridges[key] = the carry OUT of that place into the next-higher one. Each place
// (D/H/T/E) shows a tappable carry-arrow above its column header, so the whole config
// reads at a glance. Tap cycles mag → moet → geen.
const NEXT: Record<ConstraintType, ConstraintType> = { FREE: 'REQUIRED', REQUIRED: 'FORBIDDEN', FORBIDDEN: 'FREE' };
const META: Record<ConstraintType, { label: string; title: string }> = {
    FREE: { label: 'mag', title: 'Brug mag (niet verplicht)' },
    REQUIRED: { label: 'moet', title: 'Brug verplicht' },
    FORBIDDEN: { label: 'geen', title: 'Geen brug' },
};

function arrowStyle(state: ConstraintType): React.CSSProperties {
    const base: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '26px', height: '26px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
        border: '1px solid transparent', background: 'transparent',
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), opacity var(--dur) var(--ease-out)',
    };
    if (state === 'REQUIRED') return { ...base, color: 'var(--accent-on)', background: 'var(--accent)', border: '1px solid var(--accent)' };
    if (state === 'FREE') return { ...base, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent)' };
    return { ...base, color: 'var(--text-muted)', opacity: 0.45 };   // FORBIDDEN
}

export default function BridgeControl({ places, bridges, onChange }: Props) {
    if (places.length === 0) return null;
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                {places.map((p) => {
                    const state = bridges[p.key] ?? 'FREE';
                    const m = META[state];
                    return (
                        <div key={p.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <button
                                type="button"
                                onClick={() => onChange(p.key, NEXT[state])}
                                title={`Brug uit ${p.label ?? p.key}: ${m.title}`}
                                aria-label={`Brug bij ${p.key}: ${m.label}`}
                                style={arrowStyle(state)}
                            >
                                <ArrowBendLeftUp size={16} weight={state === 'FORBIDDEN' ? 'regular' : 'bold'} />
                            </button>
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)' }}>{p.key}</span>
                        </div>
                    );
                })}
            </div>

            {/* Legend — the three carry states, color-matched to the arrows. */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><ArrowBendLeftUp size={13} weight="bold" color="var(--accent)" /> mag</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '3px', background: 'var(--accent)' }}><ArrowBendLeftUp size={11} weight="bold" color="var(--accent-on)" /></span> moet</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', opacity: 0.6 }}><ArrowBendLeftUp size={13} /> geen</span>
            </div>
        </div>
    );
}
