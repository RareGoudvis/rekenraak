import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './addition/NaturalSettings';
import DecimalSettings from './addition/DecimalSettings';
import RationalSettings from './addition/RationalSettings';
import { sharedPluginStyles as styles } from './sharedPluginStyles'; // 🔥 Zelfde import!
import SettingLabel from './SettingLabel';
import HrPresetRow from './HrPresetRow';
import type { AddSubConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

const SubConfigMap = {
    natural: NaturalSettings,
    decimal: DecimalSettings,
    rational: RationalSettings
};

export default function SubtractionConfig({ block }: Props) {
    const [c, patch] = useConstraints<AddSubConstraints>(block);
    const { numberType = 'natural', equationType = 'normal' } = c;

    const ActiveSubConfig = SubConfigMap[numberType as keyof typeof SubConfigMap] || NaturalSettings;

    const updateConstraint = (key: string, value: unknown) => {
        patch({ [key]: value } as Partial<AddSubConstraints>);
    };

    return (
        <div style={styles.container}>

            {/* OEFENVORM + AANTAL TERMEN */}
            <HrPresetRow block={block} variant="addsub" />

            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <SettingLabel text="Type oefening:" info="Gewone som (a - b = …) of puntoefening (a - … = c)." />
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

            {/* SPECIFIEKE INSTELLINGEN (Max uitkomst, Getalopbouw, Bruggen) */}
            <ActiveSubConfig block={block} />

        </div>
    );
}