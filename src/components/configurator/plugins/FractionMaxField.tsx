interface Props {
    label?: string;
    numerator: number;
    denominator: number;
    onNumerator: (v: number) => void;
    onDenominator: (v: number) => void;
}

// Canonical fraction getalopbouw control: a teller input over a bar over a noemer
// input (same visual as the addition "Breuk 1" widget). Use everywhere a fraction's
// max teller/noemer is configured.
export default function FractionMaxField({ label, numerator, denominator, onNumerator, onDenominator }: Props) {
    return (
        <div style={colStyle}>
            {label && <label style={labelStyle}>{label}</label>}
            <input type="number" min="1" value={numerator} onChange={(e) => onNumerator(Math.max(1, Number(e.target.value)))} style={inputStyle} title="Max. teller" />
            <hr style={lineStyle} />
            <input type="number" min="2" value={denominator} onChange={(e) => onDenominator(Math.max(2, Number(e.target.value)))} style={inputStyle} title="Max. noemer" />
        </div>
    );
}

const colStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 0', textAlign: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', fontSize: '14px', fontWeight: 'bold' };
const lineStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '2px solid var(--text-muted)', margin: '8px 0' };
