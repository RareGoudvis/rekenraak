import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './addition/NaturalSettings';
import DecimalSettings from './addition/DecimalSettings';
import RationalSettings from './addition/RationalSettings';
import { sharedPluginStyles as styles } from './sharedPluginStyles'; // 🔥 Zelfde import!

interface Props {
    block: MathBlock;
}

const SubConfigMap = {
    natural: NaturalSettings,
    decimal: DecimalSettings,
    rational: RationalSettings
};

export default function SubtractionConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { numberType = 'natural', equationType = 'normal' } = block.constraints;

    const ActiveSubConfig = SubConfigMap[numberType as keyof typeof SubConfigMap] || NaturalSettings;

    const updateConstraint = (key: string, value: any) => {
        updateBlockSettings(block.id, {
            constraints: { ...block.constraints, [key]: value }
        });
    };

    return (
        <div style={styles.container}>

            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <label style={styles.label}>Type oefening:</label>
                <div style={styles.buttonGroup}>
                    <button
                        onClick={() => updateConstraint('equationType', 'normal')}
                        style={styles.radioBtn(equationType === 'normal' || !equationType)}
                    >
                        Gewone (a - b = ...)
                    </button>
                    <button
                        onClick={() => updateConstraint('equationType', 'puntoefening')}
                        style={styles.radioBtn(equationType === 'puntoefening')}
                    >
                        Punt (a - . = c)
                    </button>
                </div>
            </div>

            {/* DOMEIN / GETALTYPE */}
            <div style={styles.section}>
                <label style={styles.label}>Verzameling:</label>
                <div style={styles.buttonGroup}>
                    {(['natural', 'decimal', 'rational'] as const).map(type => (
                        <button key={type}
                            onClick={() => updateConstraint('numberType', type)}
                            style={styles.radioBtn(numberType === type)}
                        >
                            {type === 'natural' ? 'Natuurlijke getallen' : type === 'decimal' ? 'Decimale getallen' : 'Rationale getallen'}
                        </button>
                    ))}
                </div>
            </div>

            {/* SPECIFIEKE INSTELLINGEN (Max uitkomst, Getalopbouw, Bruggen) */}
            <ActiveSubConfig block={block} />

        </div>
    );
}