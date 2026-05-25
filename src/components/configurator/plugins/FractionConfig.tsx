import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock, FractionSubType } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

const HOEVEELHEID_VARIANTS: { value: FractionSubType; label: string; description: string }[] = [
    { value: 'hoeveelheid',          label: 'Concreet',    description: 'Objecten (cirkels of vierkanten)' },
    { value: 'hoeveelheid-rechthoek',label: 'Schematisch', description: 'Lege rechthoek om in te delen' },
    { value: 'hoeveelheid-abstract', label: 'Abstract',    description: 'Rekenregel zonder model' },
];

function defaultsFor(subType: FractionSubType): Record<string, unknown> {
    switch (subType) {
        case 'kleuren':               return { shape: 'rectangle', minDenominator: 2, maxDenominator: 8 };
        case 'herkennen':             return { shape: 'rectangle', minDenominator: 2, maxDenominator: 8, answerFormat: 'fraction-questions' };
        case 'hoeveelheid':           return { objectShape: 'circle', minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-hulp' };
        case 'hoeveelheid-rechthoek': return { minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-berekening' };
        case 'hoeveelheid-abstract':  return { minDenominator: 2, maxDenominator: 9, level: 1, answerMode: 'berekeningslijnen', maxAbstractN3: 1000 };
        case 'lijnstuk':              return { minDenominator: 2, maxDenominator: 6, minLineLength: 4, maxLineLength: 12, level: 1, answerMode: 'berekeningslijnen' };
        case 'veelhoek':              return { minDenominator: 2, maxDenominator: 9, maxDimension: 6 };
    }
}

export default function FractionConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const subType: FractionSubType = block.constraints.subType || 'kleuren';
    const c = block.constraints;

    const updateConstraint = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });

    const handleSubTypeChange = (newSubType: FractionSubType) => {
        const isHoeveelheidType = newSubType === 'hoeveelheid' || newSubType === 'hoeveelheid-rechthoek' || newSubType === 'hoeveelheid-abstract';
        updateBlockSettings(block.id, {
            constraints: { subType: newSubType, ...defaultsFor(newSubType) },
            fractionExercises: [],
            ...(isHoeveelheidType ? { numberOfExercises: 1 } : {}),
        });
    };

    const isHoeveelheid       = subType === 'hoeveelheid';
    const isRechthoek         = subType === 'hoeveelheid-rechthoek';
    const isAbstract          = subType === 'hoeveelheid-abstract';
    const isHoeveelheidGroep  = isHoeveelheid || isRechthoek || isAbstract;
    const isShape             = subType === 'kleuren' || subType === 'herkennen';
    const isLijnstuk          = subType === 'lijnstuk';
    const isVeelhoek          = subType === 'veelhoek';

    const minDen = c.minDenominator ?? 2;
    const maxDen = c.maxDenominator ?? 8;
    const absMaxDen = isLijnstuk ? 8 : (isHoeveelheidGroep || isVeelhoek) ? 10 : 16;

    const minLen = c.minLineLength ?? 4;
    const maxLen = c.maxLineLength ?? 12;

    return (
        <div style={styles.container}>

            {/* ── HOEVEELHEID VARIANT RADIO ── */}
            {isHoeveelheidGroep && (
                <div style={styles.section}>
                    <label style={styles.label}>Variant:</label>
                    {HOEVEELHEID_VARIANTS.map(({ value, label, description }) => {
                        const isActive = subType === value;
                        return (
                            <button
                                key={label}
                                onClick={() => handleSubTypeChange(value)}
                                style={{
                                    ...styles.radioBtn(isActive),
                                    display: 'flex', flexDirection: 'column', width: '100%',
                                    marginBottom: '6px', textAlign: 'left', justifyContent: 'flex-start',
                                    padding: '8px 10px',
                                }}
                            >
                                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{label}</span>
                                <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{description}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── SHAPE (kleuren / herkennen) — Rechthoek & Cirkel only ── */}
            {isShape && (
                <div style={styles.section}>
                    <label style={styles.label}>Vorm:</label>
                    <div style={styles.buttonGroup}>
                        {(['rectangle', 'circle'] as const).map(s => (
                            <button key={s} onClick={() => updateConstraint('shape', s)} style={styles.radioBtn(c.shape === s || (s === 'rectangle' && !c.shape))}>
                                {s === 'rectangle' ? 'Rechthoek' : 'Cirkel'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── OBJECT SHAPE (hoeveelheid concreet) ── */}
            {isHoeveelheid && (
                <div style={styles.section}>
                    <label style={styles.label}>Objectvorm:</label>
                    <div style={styles.buttonGroup}>
                        <button onClick={() => updateConstraint('objectShape', 'circle')} style={styles.radioBtn(c.objectShape === 'circle')}>Cirkels</button>
                        <button onClick={() => updateConstraint('objectShape', 'square')} style={styles.radioBtn(c.objectShape === 'square')}>Vierkanten</button>
                    </div>
                </div>
            )}

            {/* ── DENOMINATOR RANGE (sliders) ── */}
            <div style={styles.section}>
                <label style={styles.label}>Noemer bereik: {minDen} – {maxDen}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div>
                        <label style={{ ...styles.label, marginBottom: '3px' }}>Min: {minDen}</label>
                        <input type="range" min="2" max={absMaxDen} step="1"
                            value={minDen}
                            onChange={(e) => {
                                const v = Math.max(2, Number(e.target.value));
                                updateConstraint('minDenominator', v);
                                if (v > maxDen) updateConstraint('maxDenominator', v);
                            }}
                            style={sliderStyle} />
                    </div>
                    <div>
                        <label style={{ ...styles.label, marginBottom: '3px' }}>Max: {maxDen}</label>
                        <input type="range" min="2" max={absMaxDen} step="1"
                            value={maxDen}
                            onChange={(e) => {
                                const v = Math.min(absMaxDen, Number(e.target.value));
                                updateConstraint('maxDenominator', v);
                                if (v < minDen) updateConstraint('minDenominator', v);
                            }}
                            style={sliderStyle} />
                    </div>
                </div>
            </div>

            {/* ── MAX TOTAL (hoeveelheid concreet / rechthoek) ── */}
            {(isHoeveelheid || isRechthoek) && (
                <div style={styles.section}>
                    <label style={styles.label}>Max. aantal objecten:</label>
                    <input type="number" min="4" max="50" step="2"
                        value={c.maxTotal ?? 20}
                        onChange={(e) => updateConstraint('maxTotal', Number(e.target.value))}
                        style={inputStyle} />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Totaal wordt deelbaar door de noemer.
                    </p>
                </div>
            )}

            {/* ── LINE LENGTH SLIDERS (lijnstuk) ── */}
            {isLijnstuk && (
                <div style={styles.section}>
                    <label style={styles.label}>Lijnlengte (cm): {minLen} – {maxLen}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        <div>
                            <label style={{ ...styles.label, marginBottom: '4px' }}>Min: {minLen} cm</label>
                            <input type="range" min="1" max="16" step="1"
                                value={minLen}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    updateConstraint('minLineLength', v);
                                    if (v > maxLen) updateConstraint('maxLineLength', v);
                                }}
                                style={sliderStyle} />
                        </div>
                        <div>
                            <label style={{ ...styles.label, marginBottom: '4px' }}>Max: {maxLen} cm</label>
                            <input type="range" min="1" max="16" step="1"
                                value={maxLen}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    updateConstraint('maxLineLength', v);
                                    if (v < minLen) updateConstraint('minLineLength', v);
                                }}
                                style={sliderStyle} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── MAX DIMENSION (veelhoek) ── */}
            {isVeelhoek && (
                <div style={styles.section}>
                    <label style={styles.label}>Max. afmeting (vakjes): {c.maxDimension ?? 6}</label>
                    <input type="range" min="2" max="8" step="1"
                        value={c.maxDimension ?? 6}
                        onChange={(e) => updateConstraint('maxDimension', Number(e.target.value))}
                        style={sliderStyle} />
                </div>
            )}

            {/* ── ANSWER FORMAT (hoeveelheid concreet) ── */}
            {isHoeveelheid && (
                <div style={styles.section}>
                    <label style={styles.label}>Antwoordvorm:</label>
                    {[
                        { val: 'met-hulp',        label: 'Met hulplijnen' },
                        { val: 'met-breukvragen', label: 'Met breukvragen' },
                        { val: 'zonder-hulp',     label: 'Zonder hulp' },
                    ].map(({ val, label }) => (
                        <button key={val} onClick={() => updateConstraint('answerFormat', val)}
                            style={{ ...styles.radioBtn(c.answerFormat === val), display: 'flex', width: '100%', marginBottom: '6px', textAlign: 'left', justifyContent: 'flex-start' }}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    backgroundColor: '#1a1a1f',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
    fontSize: '13px',
    boxSizing: 'border-box',
};

const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: 'var(--accent-purple)',
    cursor: 'pointer',
};
