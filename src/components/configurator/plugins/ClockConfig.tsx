import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import type { ClockType, ExerciseMode, MinuteDirection, HandChoice, TimeCategory } from '../../../services/clock/clockTypes';
import { DIRECTION_CHOICES, directionZones } from '../../../services/clock/minuteDirection';
import type { ClockConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

const TIME_TYPE_LABELS: Record<TimeCategory, string> = {
    uren: 'Uren  (3 uur, 12 uur)',
    halve_uren: 'Halve uren  (half 4)',
    kwartier_over: 'Kwartier over  (kwart over 3)',
    kwartier_voor: 'Kwartier voor  (kwart voor 4)',
    nauwkeurig_5: "Tot 5' nauwkeurig  (20 over 3)",
    nauwkeurig_1: "Tot 1' nauwkeurig  (23 over 3)",
};

export default function ClockConfig({ block }: Props) {
    const [c, patch] = useConstraints<ClockConstraints>(block);
    const {
        clockType = 'analoog' as ClockType,
        exerciseMode = 'lezen' as ExerciseMode,
        is24hour = false,
        timeTypes = ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'] as TimeCategory[],
        minuteDirection = 'beide' as MinuteDirection,
        handChoice = 'beide' as HandChoice,
    } = c;

    const updateConstraint = (key: string, value: unknown) => {
        patch({ [key]: value } as Partial<ClockConstraints>);
    };

    const toggleTimeType = (type: TimeCategory) => {
        const current: TimeCategory[] = timeTypes;
        updateConstraint('timeTypes',
            current.includes(type)
                ? current.filter(t => t !== type)
                : [...current, type]
        );
    };

    const showMinuteDirection = timeTypes.includes('nauwkeurig_5') || timeTypes.includes('nauwkeurig_1');

    return (
        <div style={styles.container}>
            {/* Activity + clock type come from the sidebar leaf; show the current mode as a hint. */}
            <div style={{ ...styles.section, fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {/* Also the Oefenmodus builder's hint, where the pupil types / drags instead of writing / drawing. */}
                {clockType === 'analoog' && exerciseMode === 'lezen' && 'Analoog · Klok zien → tijd in woorden schrijven (oefenmodus: tijd typen als uu:mm)'}
                {clockType === 'analoog' && exerciseMode === 'tekenen' && 'Analoog · Tijd in woorden → wijzers tekenen op klok (oefenmodus: wijzers slepen)'}
                {clockType === 'analoog' && exerciseMode === 'omzetten' && 'Analoog · Klok zien → digitale tijd invullen'}
                {clockType === 'digitaal' && exerciseMode === 'lezen' && 'Digitaal · Digitale tijd zien → tijd in woorden schrijven'}
                {clockType === 'digitaal' && exerciseMode === 'tekenen' && 'Digitaal · Tijd in woorden → digitale klok invullen'}
                {clockType === 'digitaal' && exerciseMode === 'omzetten' && 'Digitaal · Digitale tijd zien → wijzers tekenen op klok'}
            </div>

            {/* TIJDSSYSTEEM */}
            <div style={styles.section}>
                <SettingLabel text="Tijdssysteem:" info="12-uurnotatie (1–12) of 24-uurnotatie (0–23)." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => updateConstraint('is24hour', false)} style={styles.radioBtn(!is24hour)}>12 uur  (1–12)</button>
                    <button onClick={() => updateConstraint('is24hour', true)} style={styles.radioBtn(is24hour)}>24 uur  (0–23)</button>
                </div>
            </div>

            {/* TIJDSTYPES */}
            <div style={styles.section}>
                <SettingLabel text="Tijdstypes:" info="Welke tijden mogen voorkomen (uren, halve uren, kwartieren, …)." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(Object.keys(TIME_TYPE_LABELS) as TimeCategory[]).map(type => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={timeTypes.includes(type)}
                                onChange={() => toggleTimeType(type)}
                                style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }}
                            />
                            {TIME_TYPE_LABELS[type]}
                        </label>
                    ))}
                </div>
            </div>

            {/* RICHTING (voor nauwkeurig types) */}
            {showMinuteDirection && (
                <div style={styles.section}>
                    <SettingLabel text="Richting:" info="Over (5 over 2), voor half (5 voor half 3), over half (5 over half 3), voor (5 voor 3), of alle vier." />
                    <div style={{ ...styles.buttonGroup, flexWrap: 'wrap' }}>
                        {DIRECTION_CHOICES.map((ch) => (
                            <button key={ch.value} onClick={() => updateConstraint('minuteDirection', ch.value)}
                                style={styles.radioBtn(minuteDirection !== 'beide' && directionZones(minuteDirection).includes(ch.value))}>{ch.label}</button>
                        ))}
                        <button onClick={() => updateConstraint('minuteDirection', 'beide')} style={styles.radioBtn(minuteDirection === 'beide')}>Alle</button>
                    </div>
                </div>
            )}

            {/* TE TEKENEN WIJZER (analoog + tekenen) */}
            {clockType === 'analoog' && exerciseMode === 'tekenen' && (
                <div style={styles.section}>
                    <SettingLabel text="Te tekenen wijzer(s):" info="Welke wijzer(s) de leerling zelf moet tekenen." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => updateConstraint('handChoice', 'uur')} style={styles.radioBtn(handChoice === 'uur')}>Uurwijzer</button>
                        <button onClick={() => updateConstraint('handChoice', 'minuut')} style={styles.radioBtn(handChoice === 'minuut')}>Minutenwijzer</button>
                        <button onClick={() => updateConstraint('handChoice', 'beide')} style={styles.radioBtn(handChoice === 'beide')}>Beide</button>
                    </div>
                </div>
            )}
        </div>
    );
}
