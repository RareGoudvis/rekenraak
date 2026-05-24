import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './multiplication/NaturalSettings';
import DecimalSettings from './multiplication/DecimalSettings';
import RationalSettings from './multiplication/RationalSettings'; 
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

export default function MultiplicationConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { numberType = 'natural', equationType = 'normal' } = block.constraints;

    const updateConstraint = (key: string, value: any) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    return (
        <div style={styles.container}>
            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <label style={styles.label}>Type oefening:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => updateConstraint('equationType', 'normal')} style={styles.radioBtn(equationType === 'normal' || !equationType)}>
                        Gewone (a x b = ...)
                    </button>
                    <button onClick={() => updateConstraint('equationType', 'puntoefening')} style={styles.radioBtn(equationType === 'puntoefening')}>
                        Punt (a x . = c)
                    </button>
                </div>
            </div>

            {/* VERZAMELING (Hier kiest de gebruiker welk sub-paneel hij wil zien) */}
            <div style={styles.section}>
                <label style={styles.label}>Verzameling:</label>
                <div style={styles.buttonGroup}>
                    {(['natural', 'decimal', 'rational'] as const).map(type => (
                        <button key={type} onClick={() => updateConstraint('numberType', type)} style={styles.radioBtn(numberType === type)}>
                            {type === 'natural' ? 'Natuurlijke getallen' : type === 'decimal' ? 'Decimale getallen' : 'Rationale getallen'}
                        </button>
                    ))}
                </div>
            </div>

            {/* LAAD DE JUISTE UI GEBASEERD OP DE KEUZE HIERBOVEN */}
            {numberType === 'natural' && <NaturalSettings block={block} />}
            {numberType === 'decimal' && <DecimalSettings block={block} />}

            {/* 🔥 Hier vertellen we React om jouw nieuwe paneel te tonen */}
            {numberType === 'rational' && <RationalSettings block={block} />}

        </div>
    );
}