import { useMemo, useState } from 'react';
import { sharedPluginStyles as styles } from '../configurator/plugins/sharedPluginStyles';
import { generateForBlock } from '../../services/generateDispatch';
import { generateMixedExercises, generateMixedOne } from '../../services/math/mixedGenerator';
import { formatMathNumber, opGlyph } from '../../services/math/formatters';
import type { Equation } from '../../services/math/types';
import type { MathBlock } from '../../services/math/types';
import type { Leerjaar } from '../../config/gradePresets';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useEenvoudigUi } from './useEenvoudigUi';
import {
    COMBO_OPS, COMBO_STEPS, COMBO_TABLES, OP_NAME, OP_SYMBOL, REST_DELERS, REST_LEVELS, activeOps, restLevelFits, restLevelOf, bridgeChoices, bridgePlacesOf, bridgeId, comboConstraints,
    comboFromConstraints, comboLeafId, newCombo, placesOf,
    type ComboOpId, type ComboOpState, type ComboState,
} from './comboModel';

const fmtMax = (n: number) => `Tot ${n.toLocaleString('nl-BE')}`;
const PREVIEW_COUNT = 8;

function previewBlock(constraints: Record<string, unknown>): MathBlock {
    return {
        id: 'ez-combo', typeId: 'hr-std-gemengd', instructionText: '', instructionMode: 'geen', showInstruction: false,
        layoutPreset: 'inline-short', steppedLines: 3, numberOfExercises: 1, totalPoints: 0, verticalSpacing: 14,
        constraints, exercises: [],
    };
}

const sumText = (e: Equation): string => {
    const n = (v: unknown) => formatMathNumber(v as number);
    return `${n(e.operands[0])} ${opGlyph(e.operator)} ${n(e.operands[1])}`;
};
// A met-rest sum asks two numbers, as on the sheet: "55 : 6 = ___ r ___".
const answerSlot = (e: Equation) => (e.remainder !== undefined ? <><u /> r <u /></> : <u />);

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

interface Props { only?: ComboOpId; editBlockId?: string }

export default function ComboBuilder({ only, editBlockId }: Props) {
    const grade: Leerjaar = useEenvoudigUi(s => s.grade);
    const setPanel = useWorksheetStore(s => s.setEenvoudigPanel);
    const editBlock = useWorksheetStore(s => (editBlockId ? s.blocks.find(b => b.id === editBlockId) : undefined));

    const [state, setState] = useState<ComboState>(() =>
        (editBlock && comboFromConstraints(editBlock.constraints, grade)) || newCombo(grade, only));
    const [nonce, setNonce] = useState(0);
    // Zelf samenstellen shows its one bewerking; Combinatie shows all four. A block edited in place shows what it holds.
    const shownOps = only ? [only] : COMBO_OPS;
    const patchOp = (k: ComboOpId, p: Partial<ComboOpState>) => setState(s => ({ ...s, ops: { ...s.ops, [k]: { ...s.ops[k], ...p } } }));
    const none = activeOps(state).length === 0;

    const constraints = useMemo(() => comboConstraints(state, grade), [state, grade]);
    const constraintsKey = JSON.stringify(constraints);
    // A bewerking whose settings leave no sum possible gets a warning instead of silently dropping out of the mix.
    const failing = useMemo(() => {
        const block = previewBlock(constraints);
        const out = new Set<ComboOpId>();
        for (const k of activeOps(state)) {
            try { if (!generateMixedOne(block, k)) out.add(k); } catch { out.add(k); }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constraintsKey, nonce]);

    // The preview is plain text from the real generator: the sheet viewer would shrink to unreadable in this column.
    const sums = useMemo(() => {
        if (none) return [];
        try { return generateMixedExercises({ ...previewBlock(constraints), numberOfExercises: PREVIEW_COUNT }); } catch { return []; }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constraintsKey, nonce]);

    const setKind = (kind: 'nat' | 'komma') => setState(s => {
        const fresh = newCombo(grade, only, kind);
        // Switching number kind clears the shapes: a place that exists in one has no meaning in the other.
        return { ...fresh, max: s.max, ops: Object.fromEntries(COMBO_OPS.map(k => [k, { ...fresh.ops[k], on: s.ops[k].on }])) as ComboState['ops'] };
    });
    const setMax = (max: number) => setState(s => {
        const wasKomma = s.kind === 'komma';
        const next: ComboState = { ...s, kind: 'nat', max, ops: { ...s.ops } };
        const ok = new Set(placesOf(next));
        const bridges = new Set(bridgePlacesOf(next));
        for (const k of COMBO_OPS) {
            const o = s.ops[k];
            // A shape or bridge on a place the new range does not have would silently mean nothing: drop it.
            const br = wasKomma ? 'any' : Array.isArray(o.br) ? (o.br.every(p => bridges.has(p)) ? o.br : 'any') : o.br;
            next.ops[k] = { ...o, a: wasKomma ? [] : o.a.filter(p => ok.has(p)), b: wasKomma ? [] : o.b.filter(p => ok.has(p)), br };
        }
        return next;
    });

    const submit = () => {
        const st = useWorksheetStore.getState();
        const cardId = only ? `combo:${only}` : 'combo';
        if (editBlock) {
            const merged = { ...editBlock, constraints, cardId } as MathBlock;
            const { items, note } = generateForBlock(merged, st.docSettings.uniqueExercises ?? true);
            st.updateBlockSettings(editBlock.id, { constraints, cardId });
            st.setExercises(editBlock.id, 'exercises', items);
            st.setGenerationNote(editBlock.id, note);
            st.setActiveSelection(editBlock.id);
        } else {
            const label = only ? `${OP_NAME[only]}, zelf samengesteld` : 'Combinatie';
            st.addBlockFromType('hr-std-gemengd', label, constraints, { exact: true, cardId, leafId: comboLeafId(state), instruction: 'Reken uit.' });
        }
        setPanel(null);
    };

    const places = placesOf(state);
    return (
        <div className="ez-cb">
            <div className="ez-cb-l">
                <div className="ez-range">
                    {COMBO_STEPS.map(n => (
                        <button key={n} type="button" aria-pressed={state.kind === 'nat' && state.max === n} onClick={() => setMax(n)}>{fmtMax(n)}</button>
                    ))}
                    <i className="ez-br" />
                    <button type="button" aria-pressed={state.kind === 'komma'} onClick={() => setKind('komma')}>Kommagetallen</button>
                </div>
                {shownOps.map(k => {
                    const o = state.ops[k];
                    const isMulDiv = k === 'x' || k === ':';
                    const komma = state.kind === 'komma';
                    return (
                        <div key={k} className="ez-op" data-on={o.on}>
                            <button type="button" className="ez-op-head" aria-pressed={o.on} onClick={() => patchOp(k, { on: !o.on })}>
                                <span className="ez-sym">{OP_SYMBOL[k]}</span><b>{OP_NAME[k]}</b>
                                <span className="ez-sw"><i /></span>
                            </button>
                            {o.on && (
                                <div className="ez-op-body">
                                    {isMulDiv && !komma && (
                                        <div className="ez-line"><span>Soort</span>
                                            <div className="seg-group">
                                                <button type="button" className="seg-btn" aria-pressed={o.mode === 'tafels'} onClick={() => patchOp(k, { mode: 'tafels' })}>Tafels</button>
                                                <button type="button" className="seg-btn" aria-pressed={o.mode === 'num'} onClick={() => patchOp(k, { mode: 'num' })}>Eigen getallen</button>
                                                {k === ':' && <button type="button" className="seg-btn" aria-pressed={o.mode === 'rest'} title="Niet-opgaande delingen: er blijft een rest over (52 : 6 = 8 r 4)." onClick={() => patchOp(k, { mode: 'rest' })}>Met rest</button>}
                                            </div>
                                        </div>
                                    )}
                                    {k === ':' && !komma && o.mode === 'rest' ? (
                                        <>
                                            <div className="ez-line"><span>Delers</span>
                                                <div className="ez-ctrl">
                                                    {REST_DELERS.map(t => (
                                                        <button key={t} type="button" style={styles.maskBtn(o.tables.includes(t))} aria-pressed={o.tables.includes(t)}
                                                            onClick={() => { const next = toggle(o.tables, t).sort((p, q) => p - q); if (next.some(d => REST_DELERS.includes(d))) patchOp(k, { tables: next }); }}>{t}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="ez-line"><span>Niveau</span>
                                                <div className="seg-group">
                                                    {REST_LEVELS.map(l => (
                                                        <button key={l} type="button" className="seg-btn" disabled={!restLevelFits(state, l)} aria-pressed={restLevelOf(state, o) === l}
                                                            title={l === 1 ? 'Bv. 52 : 6 = 8 r 4' : l === 2 ? 'Bv. 67 : 6 = 11 r 1' : 'Bv. 127 : 6 = 21 r 1'}
                                                            onClick={() => patchOp(k, { restLevel: l })}>N{l}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="ez-line"><span>Kladlijn</span>
                                                <div className="seg-group">
                                                    <button type="button" className="seg-btn" aria-pressed={!o.klad} onClick={() => patchOp(k, { klad: false })}>Uit</button>
                                                    <button type="button" className="seg-btn" aria-pressed={o.klad} title="Een lijn voor de veelvouden van de deler (6 × 9 = 54 · 6 × 10 = 60)." onClick={() => patchOp(k, { klad: true })}>Aan</button>
                                                </div>
                                            </div>
                                        </>
                                    ) : isMulDiv && !komma && o.mode === 'tafels' ? (
                                        <div className="ez-line"><span>Tafels</span>
                                            <div className="ez-ctrl">
                                                {COMBO_TABLES.map(t => (
                                                    <button key={t} type="button" style={styles.maskBtn(o.tables.includes(t))} aria-pressed={o.tables.includes(t)}
                                                        onClick={() => { const next = toggle(o.tables, t).sort((p, q) => p - q); if (next.length) patchOp(k, { tables: next }); }}>{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <MaskRow label={k === ':' ? 'Deeltal' : 'Getal 1'} places={places} value={o.a} onChange={a => patchOp(k, { a })} />
                                            {isMulDiv && komma
                                                ? <div className="ez-line"><span>{k === ':' ? 'Deler' : 'Getal 2'}</span><div className="ez-ctrl"><em>een getal van 2 tot 9</em></div></div>
                                                : <MaskRow label={k === ':' ? 'Deler' : 'Getal 2'} places={places} value={o.b} onChange={b => patchOp(k, { b })} />}
                                            {!isMulDiv && (
                                                <div className="ez-line"><span>Brug</span>
                                                    <div className="ez-ctrl ez-chips">
                                                        {bridgeChoices(state).map(c => (
                                                            <button key={c.id} type="button" aria-pressed={bridgeId(o.br) === c.id} onClick={() => patchOp(k, { br: c.value })}>{c.label}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {failing.has(k) && <div className="ez-warn">Dit kan niet met deze getallen. Kies iets anders of zet deze bewerking uit.</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="ez-cb-r">
                <div className="ez-pv">
                    <div className="ez-pv-h"><b>Voorbeeld</b><button type="button" onClick={() => setNonce(n => n + 1)}>Andere getallen</button></div>
                    {none
                        ? <p className="ez-pv-none">Zet minstens één bewerking aan.</p>
                        : <div className="ez-sums">{sums.map(e => <div key={e.id}>{sumText(e)} = {answerSlot(e)}</div>)}</div>}
                </div>
                <button type="button" className="ez-cta" disabled={none} onClick={submit}>{editBlock ? 'Bijwerken' : 'Zet op het blad'}</button>
            </div>
        </div>
    );
}

function MaskRow({ label, places, value, onChange }: { label: string; places: string[]; value: string[]; onChange: (v: string[]) => void }) {
    return (
        <div className="ez-line"><span>{label}</span>
            <div className="ez-ctrl">
                {places.map(p => (
                    <button key={p} type="button" style={styles.maskBtn(value.includes(p))} aria-pressed={value.includes(p)}
                        onClick={() => onChange(toggle(value, p))}>{p}</button>
                ))}
                <em>{value.length ? value.join('') : 'alles mag'}</em>
            </div>
        </div>
    );
}
