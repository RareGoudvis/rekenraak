import { Bill, EuroCoin, CentCoin } from '../../../components/viewer/GeldViewer';
import type { BoardWidget } from '../../boardTypes';

// Realistic euro tints per denomination (bills) — close to the real notes.
const BILL_COLORS: Record<number, { bg: string; border: string }> = {
    50000: { bg: '#d1c4e9', border: '#7e57c2' },   // €500 paars
    20000: { bg: '#fff3c4', border: '#d4a017' },   // €200 geel
    10000: { bg: '#c8e6c9', border: '#43a047' },   // €100 groen
    5000: { bg: '#ffe0b2', border: '#fb8c00' },    // €50 oranje
    2000: { bg: '#bbdefb', border: '#1e88e5' },    // €20 blauw
    1000: { bg: '#ffcdd2', border: '#e53935' },    // €10 rood
    500: { bg: '#eceff1', border: '#78909c' },     // €5 grijs
};

function RealBill({ denom }: { denom: number }) {
    const c = BILL_COLORS[denom] ?? BILL_COLORS[500];
    return (
        <div style={{
            width: '96px', height: '52px', borderRadius: '6px',
            background: `linear-gradient(120deg, ${c.bg}, #ffffff 130%)`,
            border: `2px solid ${c.border}`, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '18px', color: c.border,
        }}>
            <span style={{ position: 'absolute', left: '6px', top: '2px', fontSize: '9px' }}>EURO</span>
            {denom / 100}
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
            fontFamily: "'Azeret Mono', monospace", fontWeight: 800,
            fontSize: denom >= 100 ? '20px' : '15px', color: '#3e2c12',
            boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
        }}>
            {denom >= 100 ? `€${denom / 100}` : `${denom}c`}
        </div>
    );
}

// One dropped coin/bill from the geld-palet (headerless, drag anywhere).
export default function GeldItemWidget({ widget }: { widget: BoardWidget }) {
    const denom = Number(widget.props?.denom ?? 100);
    const type = String(widget.props?.type ?? 'euro-coin');
    const real = widget.props?.geldStyle === 'realistisch';

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            {real
                ? (type === 'bill' ? <RealBill denom={denom} /> : <RealCoin denom={denom} />)
                : type === 'bill' ? <Bill valueCents={denom} width={96} height={52} />
                : type === 'euro-coin' ? <EuroCoin valueCents={denom} size={60} />
                : <CentCoin valueCents={denom} size={52} />}
        </div>
    );
}
