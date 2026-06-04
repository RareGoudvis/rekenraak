import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props {
    block: MathBlock;
}

const MODES: Array<{ key: string; label: string }> = [
    { key: 'stambreuken', label: 'Stambreuken (1/n)' },
    { key: 'gelijknamige', label: 'Gelijknamige' },
    { key: 'gelijknamig-te-maken', label: 'Gelijknamig te maken' },
    { key: 'speciale', label: 'Speciale breuken' },
];

export default function BreukenRangschikkenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        fractionMode = 'stambreuken',
        count = 4,
        operatorMode = 'oplopend',
        minDenominator = 2,
        maxDenominator = 10,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const showDenoms = fractionMode !== 'speciale';

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Soort breuken:" info="Welk type breuken er gerangschikt wordt." />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {MODES.map(m => (
                        <button key={m.key} onClick={() => set('fractionMode', m.key)} style={styles.radioBtn(fractionMode === m.key)}>{m.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Volgorde:" info="Rangschikken van klein naar groot, omgekeerd, of beide." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('operatorMode', 'oplopend')} style={styles.radioBtn(operatorMode === 'oplopend')}>Oplopend (&lt;)</button>
                    <button onClick={() => set('operatorMode', 'aflopend')} style={styles.radioBtn(operatorMode === 'aflopend')}>Aflopend (&gt;)</button>
                    <button onClick={() => set('operatorMode', 'beide')} style={styles.radioBtn(operatorMode === 'beide')}>Beide</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text={`Aantal breuken: ${count}`} info="Hoeveel breuken er per oefening gerangschikt worden." />
                <input type="range" min="2" max="5" step="1" value={count}
                    onChange={(e) => set('count', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>

            {showDenoms && (
                <div style={styles.section}>
                    <SettingLabel text="Noemer:" info="Bereik van de noemer van de breuken." />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>van</span>
                        <input type="number" min={2} max={maxDenominator} value={minDenominator}
                            onChange={(e) => set('minDenominator', Math.max(2, Math.min(Number(e.target.value), maxDenominator)))}
                            style={inputStyle} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>tot</span>
                        <input type="number" min={minDenominator} max={20} value={maxDenominator}
                            onChange={(e) => set('maxDenominator', Math.max(minDenominator, Math.min(Number(e.target.value), 20)))}
                            style={inputStyle} />
                    </div>
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '64px', padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};
