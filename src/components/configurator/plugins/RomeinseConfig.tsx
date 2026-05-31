import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { NIVEAU_MAX, NIVEAU_HINT } from '../../../services/romeinse/romeinseGenerator';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

export default function RomeinseConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { niveau = 2 } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <label style={styles.label}>Niveau:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.keys(NIVEAU_MAX).map(k => {
                        const n = Number(k);
                        const isActive = niveau === n;
                        return (
                            <button key={n} onClick={() => set('niveau', n)}
                                style={{ ...styles.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                <span style={{ fontWeight: 'bold' }}>N{n}</span>
                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{NIVEAU_HINT[n]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
