import { Bill, EuroCoin, CentCoin } from '../../../components/viewer/GeldViewer';
import { formatAmount } from '../../../services/geld/geldGenerator';
import { geldItemProps } from '../../mathTools/geld';
import type { BoardWidget } from '../../boardTypes';

// Real ECB note fronts and coin faces (public/geld, see README there).
const BILL_W = 120, BILL_H = 62;

// The ECB specimen files carry their own diagonal "specimen" mark (reproduction rule), so no overlay.
function RealBill({ denom }: { denom: number }) {
    return (
        <div style={{ width: BILL_W + 'px', height: BILL_H + 'px', position: 'relative', overflow: 'hidden', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            <img src={`${import.meta.env.BASE_URL}geld/eur-${denom / 100}-front.jpg`} alt={`€${denom / 100}`} draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill', pointerEvents: 'none', userSelect: 'none' }} />
        </div>
    );
}

function RealCoin({ denom }: { denom: number }) {
    const size = denom >= 100 ? 62 : 52;
    // The ECB common-side photo already carries the value, so no text; the PNG is circle-clipped with alpha.
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.25)' }}>
            <img src={`${import.meta.env.BASE_URL}geld/coin-${denom}.png`} alt={denom >= 100 ? `€${denom / 100}` : `${denom}c`} draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', borderRadius: '50%', pointerEvents: 'none', userSelect: 'none' }} />
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
