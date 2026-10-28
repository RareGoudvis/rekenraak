import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    label?: string;
    numerator: number;
    denominator: number;
    onNumerator: (v: number) => void;
    onDenominator: (v: number) => void;
}

// The highest teller over a bar over the highest noemer: kept where the picture itself helps
// (gemengd getal ↔ breuk, where the cap is an onechte breuk). The words sit beside the inputs,
// a title tooltip is not a label (UI-GUIDE rule 5).
export default function FractionMaxField({ label, numerator, denominator, onNumerator, onDenominator }: Props) {
    return (
        <div style={colStyle}>
            {label && <span style={labelStyle}>{label}</span>}
            <div style={rowStyle}>
                <input type="number" min="1" value={numerator} aria-label="Hoogste teller" onChange={(e) => onNumerator(Math.max(1, Number(e.target.value)))} style={inputStyle} />
                <span style={styles.miniLabel}>teller</span>
            </div>
            <hr style={lineStyle} />
            <div style={rowStyle}>
                <input type="number" min="2" value={denominator} aria-label="Hoogste noemer" onChange={(e) => onDenominator(Math.max(2, Number(e.target.value)))} style={inputStyle} />
                <span style={styles.miniLabel}>noemer</span>
            </div>
        </div>
    );
}

const colStyle: React.CSSProperties = { display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' };
const labelStyle: React.CSSProperties = { ...styles.miniLabel, marginBottom: 'var(--sp-1)' };
const inputStyle: React.CSSProperties = { width: '70px', padding: '8px 0', textAlign: 'center', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', ...styles.numInput };
const lineStyle: React.CSSProperties = { width: '70px', margin: 'var(--sp-2) 0', border: 'none', borderBottom: '2px solid var(--text-muted)' };
