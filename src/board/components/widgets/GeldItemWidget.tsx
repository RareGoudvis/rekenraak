import { Bill, EuroCoin, CentCoin } from '../../../components/viewer/GeldViewer';
import { formatAmount } from '../../../services/geld/geldGenerator';
import { geldItemProps } from '../../mathTools/geld';
import type { BoardWidget } from '../../boardTypes';

// Real ECB note fronts (public/geld, see README there); bills only, coins stay drawn.
const BILL_W = 120, BILL_H = 62;

function RealBill({ denom }: { denom: number }) {
    return (
        <div style={{ width: BILL_W + 'px', height: BILL_H + 'px', position: 'relative', overflow: 'hidden', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            <img src={`${import.meta.env.BASE_URL}geld/eur-${denom / 100}-front.jpg`} alt={`€${denom / 100}`} draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill', pointerEvents: 'none', userSelect: 'none' }} />
            {/* ECB rule: SPECIMEN diagonally at ~75 % of the note width, as an overlay so a crop cannot remove it */}
            <span data-specimen aria-hidden style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-27deg)',
                fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: '15px', letterSpacing: '1px',
                color: 'rgba(60,60,60,0.3)', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none',
            }}>SPECIMEN</span>
        </div>
    );
}

function RealCoin({ denom }: { denom: number }) {
    // 1c-5c copper, 10c-50c gold, €1 silver-in-gold, €2 gold-in-silver.
    const copper = denom < 10, gold = denom >= 10 && denom < 100;
    const outer = denom === 200 ? '#cfd8dc' : denom === 100 ? '#e0b64c' : copper ? '#b87333' : '#e0b64c';
    const inner = denom === 200 ? '#e0b64c' : denom === 100 ? '#cfd8dc' : gold ? '#d4a017' : '#a05a2c';
    const size = denom >= 100 ? 62 : 52;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `radial-gradient(circle, ${inner} 55%, ${outer} 56%)`,
            border: '1.5px solid rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sheet-math)', fontWeight: 800,
            fontSize: denom >= 100 ? '20px' : '15px', color: '#3e2c12',
            boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
        }}>
            {denom >= 100 ? `€${denom / 100}` : `${denom}c`}
        </div>
    );
}

// One dropped coin/bill from the geld-palet (headerless, drag anywhere); optional amount caption.
export default function GeldItemWidget({ widget }: { widget: BoardWidget }) {
    const g = geldItemProps(widget);
    const real = g.style === 'realistisch';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            {real
                ? (g.type === 'bill' ? <RealBill denom={g.denom} /> : <RealCoin denom={g.denom} />)
                : g.type === 'bill' ? <Bill valueCents={g.denom} width={96} height={52} />
                : g.type === 'euro-coin' ? <EuroCoin valueCents={g.denom} size={60} />
                : <CentCoin valueCents={g.denom} size={52} />}
            {g.showLabel && (
                <span data-geld-label style={{ marginTop: '4px', fontFamily: 'var(--font-sheet-math)', fontWeight: 700, fontSize: '15px', color: '#111' }}>
                    {formatAmount(g.denom, 'euros')}
                </span>
            )}
        </div>
    );
}
