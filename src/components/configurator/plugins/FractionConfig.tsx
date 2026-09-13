import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { regenerateBlock } from '../../../services/generateDispatch';
import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import type { MathBlock, FractionSubType } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import type { FractionConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

const HOEVEELHEID_VARIANTS: { value: FractionSubType; label: string; description: string }[] = [
    { value: 'hoeveelheid',          label: 'Concreet',    description: 'Objecten (cirkels of vierkanten)' },
    { value: 'hoeveelheid-rechthoek',label: 'Schematisch', description: 'Lege rechthoek om in te delen' },
    { value: 'hoeveelheid-abstract', label: 'Abstract',    description: 'Rekenregel zonder model' },
];

function defaultsFor(subType: FractionSubType): Record<string, unknown> {
    switch (subType) {
        case 'kleuren':               return { shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8 };
        case 'herkennen':             return { shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8, answerFormat: 'fraction-questions' };
        case 'hoeveelheid':           return { objectShape: 'circle', minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-hulp' };
        case 'hoeveelheid-rechthoek': return { minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-berekening' };
        case 'hoeveelheid-abstract':  return { minDenominator: 2, maxDenominator: 9, level: 1, answerMode: 'berekeningslijnen', maxAbstractN3: 1000 };
        // maxLineLength 12 -> 8 (C1 step 11): past 8cm the to-scale line eats more than
        // half of even a full-width column, so the default now stays inside that budget.
        case 'lijnstuk':              return { minDenominator: 2, maxDenominator: 6, minLineLength: 4, maxLineLength: 8, answerMode: 'berekeningslijnen' };
        case 'veelhoek':              return { minDenominator: 2, maxDenominator: 9, maxWidth: 6, maxHeight: 6 };
    }
}

export default function FractionConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const setExercises = useWorksheetStore((state) => state.setExercises);
    const setGenerationNote = useWorksheetStore((state) => state.setGenerationNote);
    const uniqueExercises = useWorksheetStore((state) => state.docSettings.uniqueExercises ?? true);

    const c = block.constraints as FractionConstraints;
    const subType: FractionSubType = c.subType || 'kleuren';

    const updateConstraint = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });

    // kleuren/herkennen shapes: ≥1 included; back-compat reads the legacy single `shape`.
    const selectedShapes: string[] = Array.isArray(c.shapes) && c.shapes.length ? c.shapes : [c.shape ?? 'rectangle'];
    const toggleShape = (s: string) => {
        const has = selectedShapes.includes(s);
        const next = has ? selectedShapes.filter(x => x !== s) : [...selectedShapes, s];
        updateConstraint('shapes', next.length ? next : selectedShapes);   // keep ≥1
    };

    const handleSubTypeChange = (newSubType: FractionSubType) => {
        const isHoeveelheidType = newSubType === 'hoeveelheid' || newSubType === 'hoeveelheid-rechthoek' || newSubType === 'hoeveelheid-abstract';
        const updates: Partial<MathBlock> = {
            constraints: { subType: newSubType, ...defaultsFor(newSubType) },
            ...(isHoeveelheidType ? { numberOfExercises: 1 } : {}),
        };
        updateBlockSettings(block.id, updates);
        // A mode switch used to blank the block until the teacher pressed Genereer; the
        // new mode's exercises are exactly what they switched over to look at.
        regenerateBlock({ ...block, ...updates } as MathBlock, setExercises, setGenerationNote, uniqueExercises);
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
                    <SettingLabel text="Variant:" info="Hoe de breuk getoond wordt: concreet, schematisch of abstract." />
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

            {/* ── SHAPE (kleuren / herkennen) — multi-select toggles, mixed per exercise ── */}
            {isShape && (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Vorm:" info="De vorm die in stukken wordt verdeeld (mengen kan)." />
                        <div style={styles.buttonGroup}>
                            {([
                                { val: 'rectangle', label: 'Rechthoek' },
                                { val: 'square',    label: 'Vierkant' },
                                { val: 'circle',    label: 'Cirkel' },
                            ] as const).map(({ val, label }) => (
                                <button key={val} onClick={() => toggleShape(val)} style={styles.radioBtn(selectedShapes.includes(val))}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Static size only makes sense with a single shape (mixed shapes scale per fraction) */}
                    {selectedShapes.length === 1 && (
                        <div style={styles.section}>
                            <div style={styles.onOffRow}>
                                <span style={styles.onOffLabel}>Vaste grootte</span>
                                <button onClick={() => updateConstraint('staticSize', !c.staticSize)} style={styles.onOffBtn(!!c.staticSize)}>
                                    {c.staticSize ? 'AAN' : 'UIT'}
                                </button>
                            </div>
                            <p style={styles.hint}>
                                Vorm blijft even groot, ook als de breuk verandert. Stel de maat in onder Geavanceerd.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── OBJECT SHAPE (hoeveelheid concreet) ── */}
            {isHoeveelheid && (
                <div style={styles.section}>
                    <SettingLabel text="Objectvorm:" info="De vorm van de te verdelen objecten." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => updateConstraint('objectShape', 'circle')} style={styles.radioBtn(c.objectShape === 'circle')}>Cirkels</button>
                        <button onClick={() => updateConstraint('objectShape', 'square')} style={styles.radioBtn(c.objectShape === 'square')}>Vierkanten</button>
                    </div>
                </div>
            )}

            {/* ── DENOMINATOR RANGE (sliders) ── */}
            <div style={styles.section}>
                <SettingLabel text={`Noemer bereik: ${minDen} – ${maxDen}`} info="Bereik van de noemer van de breuken." />
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
                    <SettingLabel text="Max. aantal objecten:" info="Het grootste aantal objecten dat verdeeld wordt." />
                    <input type="number" min="4" max="50" step="2"
                        value={c.maxTotal ?? 20}
                        onChange={(e) => updateConstraint('maxTotal', Number(e.target.value))}
                        style={inputStyle} />
                    <p style={styles.hint}>
                        Totaal wordt deelbaar door de noemer.
                    </p>
                </div>
            )}

            {/* ── LINE LENGTH SLIDERS (lijnstuk) ── */}
            {isLijnstuk && (
                <div style={styles.section}>
                    <SettingLabel text={`Lijnlengte (cm): ${minLen} – ${maxLen}`} info="Bereik van de lengte van het lijnstuk in cm." />
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

            {/* ── MAX DIMENSIONS (veelhoek) ── */}
            {isVeelhoek && (
                <div style={styles.section}>
                    <SettingLabel text={`Max. breedte (vakjes): ${c.maxWidth ?? 6}`} info="Grootste breedte van de veelhoek in roostervakjes." />
                    <input type="range" min="1" max="10" step="1"
                        value={c.maxWidth ?? 6}
                        onChange={(e) => updateConstraint('maxWidth', Number(e.target.value))}
                        style={sliderStyle} />
                    <label style={{ ...styles.label, marginTop: '8px' }}>Max. hoogte (vakjes): {c.maxHeight ?? 6}</label>
                    <input type="range" min="1" max="10" step="1"
                        value={c.maxHeight ?? 6}
                        onChange={(e) => updateConstraint('maxHeight', Number(e.target.value))}
                        style={sliderStyle} />

                    {/* Achtergrondrooster aan/uit — uit = enkel omtrek + gekleurd gebied, vakjes van 1 cm */}
                    <div style={{ ...styles.onOffRow, marginTop: '12px' }}>
                        <span style={styles.onOffLabel}>Achtergrondrooster</span>
                        <button onClick={() => updateConstraint('showGrid', c.showGrid === false)} style={styles.onOffBtn(c.showGrid !== false)}>
                            {c.showGrid !== false ? 'AAN' : 'UIT'}
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '13px',
    boxSizing: 'border-box',
};

const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: 'var(--accent-purple)',
    cursor: 'pointer',
};

// ── Differentiatie: the per-subType scaffolding of the fraction views.
// Mounted by Inspector through EXERCISE_UI['breuken'].StyleConfig.
export function FractionStyleConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<FractionConstraints>(block);
    const subType: string = c.subType ?? '';
    return (
        <>
            {/* ── Niveau (hoeveelheid-abstract only) — with example range per level ── */}
            {subType === 'hoeveelheid-abstract' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Niveau</label>
                    <div style={F.optionCol}>
                        {([
                            { n: 1, hint: 'Kleine getallen (× 1 – 10), bv. ⅗ van 30' },
                            { n: 2, hint: 'Tientallen (× 10 – 100), bv. ⅗ van 300' },
                            { n: 3, hint: 'Tot het ingestelde maximum' },
                        ] as const).map(({ n, hint }) => {
                            const isActive = (c.level ?? 1) === n;
                            return (
                                <button key={n} onClick={() => patch({ level: n })}
                                    style={{ ...F.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                    <span style={{ fontWeight: 'bold' }}>N{n}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{hint}</span>
                                </button>
                            );
                        })}
                    </div>
                    {(c.level ?? 1) === 3 && (
                        <div style={{ marginTop: '8px' }}>
                            <label style={F.label}>Max. getal (N3)</label>
                            <input
                                type="number" min="100" step="100"
                                style={F.input}
                                value={c.maxAbstractN3 ?? 1000}
                                onChange={(e) => patch({ maxAbstractN3: Number(e.target.value) })}
                            />
                        </div>
                    )}
                </>
            )}

            {/* ── Scaffolding (herkennen) ── */}
            {subType === 'herkennen' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
                    <div style={F.optionCol}>
                        {([
                            { val: 'fraction-questions', label: 'Breukvragen' },
                            { val: 'phrase',             label: 'Zin invullen' },
                            { val: 'blank-fraction',     label: 'Blanco breuk' },
                            { val: 'blank-line',         label: 'Blanco lijn' },
                        ] as const).map(({ val, label }) => (
                            <button key={val} onClick={() => patch({ answerFormat: val })}
                                style={{ ...F.radioBtn((c.answerFormat ?? 'fraction-questions') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* ── Scaffolding (hoeveelheid concreet) ── */}
            {subType === 'hoeveelheid' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
                    <div style={F.optionCol}>
                        {([
                            { val: 'met-hulp',        label: 'Met hulplijnen' },
                            { val: 'met-breukvragen', label: 'Met breukvragen' },
                            { val: 'zonder-hulp',     label: 'Zonder hulp' },
                        ] as const).map(({ val, label }) => (
                            <button key={val} onClick={() => patch({ answerFormat: val })}
                                style={{ ...F.radioBtn((c.answerFormat ?? 'met-hulp') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Groepering — makkelijker groeperen helpt starters de delen zien */}
                    <label style={{ ...F.label, marginTop: '12px' }}>Groepering</label>
                    <div style={F.optionCol}>
                        {([
                            { val: 'standaard',    label: 'Standaard',          hint: 'Rijen van 10' },
                            { val: 'gebalanceerd', label: 'Gelijke rijen',      hint: 'Evenveel per rij (18 → 2×9)' },
                            { val: 'per-deel',     label: 'Per breukdeel',      hint: 'Elke rij = één gelijk deel' },
                        ] as const).map(({ val, label, hint }) => {
                            const isActive = (c.groupingMode ?? 'standaard') === val;
                            return (
                                <button key={val} onClick={() => patch({ groupingMode: val })}
                                    style={{ ...F.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                    <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{label}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{hint}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Scaffolding (hoeveelheid-rechthoek) ── */}
            {subType === 'hoeveelheid-rechthoek' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
                    <div className="seg-group">
                        <button onClick={() => patch({ answerFormat: 'met-berekening' })} className="seg-btn" aria-pressed={(c.answerFormat ?? 'met-berekening') === 'met-berekening'}>Met lijnen</button>
                        <button onClick={() => patch({ answerFormat: 'zonder-berekening' })} className="seg-btn" aria-pressed={(c.answerFormat ?? 'met-berekening') === 'zonder-berekening'}>Zonder lijnen</button>
                    </div>
                </>
            )}

            {/* ── Scaffolding (lijnstuk / hoeveelheid-abstract) — with example line layout ── */}
            {(subType === 'lijnstuk' || subType === 'hoeveelheid-abstract') && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
                    <div style={F.optionCol}>
                        {([
                            // lijnstuk works in cm (line lengths); hoeveelheid-abstract is unitless.
                            { val: 'berekeningslijnen', label: 'Berekeningslijnen', hint: subType === 'lijnstuk' ? '___ cm : ___ = ___ cm  en  ___ × ___ cm = ___ cm' : '___ : ___ = ___  en  ___ × ___ = ___' },
                            { val: 'structuurlijnen',   label: 'Structuurlijnen',   hint: '___ : ___ = ___   /   ___ × ___ = ___' },
                            { val: 'blanco',            label: 'Blanco',            hint: '2 lege lijnen' },
                        ] as const).map(({ val, label, hint }) => {
                            const isActive = (c.answerMode ?? 'berekeningslijnen') === val;
                            return (
                                <button key={val} onClick={() => patch({ answerMode: val })}
                                    style={{ ...F.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                    <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{label}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'Azeret Mono, monospace' }}>{hint}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </>
    );
}

// The Geavanceerd accordion only has fraction content for a fixed-size single shape or for
// the schematisch draw box; without this test it would open onto an empty card.
// It lives here, beside the settings it reads, at the cost of this file losing fast refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function fractionAdvancedApplies(block: MathBlock) {
    const c = block.constraints as FractionConstraints;
    const subType = c.subType ?? '';
    return ((subType === 'kleuren' || subType === 'herkennen') && (Array.isArray(c.shapes) ? c.shapes.length === 1 : true) && !!c.staticSize)
        || subType === 'hoeveelheid-rechthoek';
}

// ── Geavanceerd: printed size of the shape / of the draw box, in cm.
export function FractionAdvancedConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<FractionConstraints>(block);
    const subType: string = c.subType ?? '';
    return (
        <>
            {/* ── Breuken: vaste vormgrootte (kleuren/herkennen) ── */}
            {(subType === 'kleuren' || subType === 'herkennen') && c.staticSize && (() => {
                const shape: string = Array.isArray(c.shapes) && c.shapes.length ? c.shapes[0] : (c.shape ?? 'rectangle');
                if (shape === 'circle') {
                    return (
                        <>
                            <label style={F.label}>Diameter cirkel: {c.staticDiam ?? 4} cm</label>
                            <input type="range" min={1} max={10} step={0.5} value={c.staticDiam ?? 4}
                                onChange={e => patch({ staticDiam: Number(e.target.value) })}
                                style={F.range} />
                        </>
                    );
                }
                if (shape === 'square') {
                    return (
                        <>
                            <label style={F.label}>Zijde vierkant: {c.staticSide ?? 4} cm</label>
                            <input type="range" min={1} max={10} step={0.5} value={c.staticSide ?? 4}
                                onChange={e => patch({ staticSide: Number(e.target.value) })}
                                style={F.range} />
                        </>
                    );
                }
                return (
                    <>
                        <label style={F.label}>Breedte rechthoek: {c.staticW ?? 4} cm</label>
                        <input type="range" min={1} max={12} step={0.5} value={c.staticW ?? 4}
                            onChange={e => patch({ staticW: Number(e.target.value) })}
                            style={F.range} />
                        <label style={{ ...F.label, marginTop: '10px' }}>Hoogte rechthoek: {c.staticH ?? 3} cm</label>
                        <input type="range" min={1} max={10} step={0.5} value={c.staticH ?? 3}
                            onChange={e => patch({ staticH: Number(e.target.value) })}
                            style={F.range} />
                    </>
                );
            })()}
            {/* ── Breuken: tekenvak (schematisch / hoeveelheid-rechthoek) ── */}
            {subType === 'hoeveelheid-rechthoek' && (
                <>
                    <label style={F.label}>Breedte tekenvak: {c.drawBoxW ? `${c.drawBoxW} cm` : 'volledig'}</label>
                    <input type="range" min={0} max={16} step={0.5} value={c.drawBoxW ?? 0}
                        onChange={e => patch({ drawBoxW: Number(e.target.value) })}
                        style={F.range} />
                    <label style={{ ...F.label, marginTop: '10px' }}>Hoogte tekenvak: {c.drawBoxH ?? 3} cm</label>
                    <input type="range" min={1} max={12} step={0.5} value={c.drawBoxH ?? 3}
                        onChange={e => patch({ drawBoxH: Number(e.target.value) })}
                        style={F.range} />
                </>
            )}
        </>
    );
}
