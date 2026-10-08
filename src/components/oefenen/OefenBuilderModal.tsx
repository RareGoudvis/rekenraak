import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FloppyDisk, Plus, Share, Trash, Warning } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { saveOefenSessie } from '../../services/persistence';
import type { OefenSessie } from '../../services/oefenen/types';
import { makeDraftBlock } from '../curriculum/draftBlock';
import ExercisePreview from '../shared/ExercisePreview';
import ModalShell from '../ui/ModalShell';
import Switch from '../ui/Switch';
import OefenShareModal from './OefenShareModal';
import { newSessieId } from '../../services/oefenen/session';
import { kioskSupports } from '../../services/oefenen/kiosk';
import {
    LIMIT_MAX, TIMER_STEPS, buildSessie, draftIdOf, listOefenLeaves, normaliseWeights, rowsFromSessie,
    type BuilderRow, type OefenLeaf,
} from './oefenBuild';

interface Props {
    onClose: () => void;
    // Reopen a saved session for editing (same id, so "Opslaan" replaces it).
    initial?: OefenSessie;
}

// Row = what the builder owns per slot; the row's constraints live in the store's draft block.
type Row = Omit<BuilderRow, 'constraints'>;

// Authoring UI for Oefenmodus: pick kiosk-capable leaves, tune each through its REAL config
// plugin (mounted against an off-sheet draft block, same mechanism as the curriculum builder),
// then save the session to the library or share it as link + QR.
export default function OefenBuilderModal({ onClose, initial }: Props) {
    const leaves = useMemo(() => listOefenLeaves(), []);
    const domains = useMemo(() => {
        const seen = new Map<string, { id: string; label: string; accentVar: string }>();
        for (const l of leaves) if (!seen.has(l.domainId)) seen.set(l.domainId, { id: l.domainId, label: l.domainLabel, accentVar: l.accentVar });
        return [...seen.values()];
    }, [leaves]);

    const setDraftBlocks = useWorksheetStore((s) => s.setDraftBlocks);
    const clearDraftBlocks = useWorksheetStore((s) => s.clearDraftBlocks);
    const draftBlocks = useWorksheetStore((s) => s.draftBlocks);

    const [rows, setRows] = useState<Row[]>(() => (initial ? rowsFromSessie(initial).map(r => ({ key: r.key, leaf: r.leaf, limit: r.limit, weight: r.weight })) : []));
    const [title, setTitle] = useState(initial?.title ?? '');
    const [mode, setMode] = useState(initial?.mode ?? 'afwisselen');
    const [allowRepeatType, setAllowRepeatType] = useState(initial?.allowRepeatType ?? false);
    const [timerMin, setTimerMin] = useState<number | undefined>(initial?.timerMin);
    const [testMode, setTestMode] = useState(initial?.testMode ?? false);
    const [statsLocked, setStatsLocked] = useState(initial?.statsLocked ?? false);
    const [shareOf, setShareOf] = useState<OefenSessie | null>(null);
    const [saved, setSaved] = useState(false);
    const nextKey = useRef(rows.length);
    // Whole minutes: the share link then carries createdAt as a 8-digit minute count.
    const [meta] = useState(() => ({ id: initial?.id ?? newSessieId(), createdAt: initial?.createdAt ?? Math.floor(Date.now() / 60_000) * 60_000 }));

    // Seed drafts for a reopened session; always tear them down on close (they are off-sheet).
    useEffect(() => {
        if (initial) {
            const seeded = rowsFromSessie(initial);
            setDraftBlocks(seeded.map(r => makeDraftBlock(r.leaf.typeId, r.constraints, draftIdOf(r.key))));
        } else setDraftBlocks([]);
        return () => clearDraftBlocks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const constraintsOf = (key: string): Record<string, unknown> | undefined =>
        draftBlocks.find(b => b.id === draftIdOf(key))?.constraints as Record<string, unknown> | undefined;

    const addLeaf = (leaf: OefenLeaf) => {
        const key = `r${nextKey.current++}`;
        const st = useWorksheetStore.getState();
        st.setDraftBlocks([...st.draftBlocks, makeDraftBlock(leaf.typeId, leaf.constraints, draftIdOf(key))]);
        setRows(rs => [...rs, { key, leaf, weight: 50 }]);
    };
    const removeRow = (key: string) => {
        const st = useWorksheetStore.getState();
        st.setDraftBlocks(st.draftBlocks.filter(b => b.id !== draftIdOf(key)));
        setRows(rs => rs.filter(r => r.key !== key));
    };
    const patchRow = (key: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));

    // Rows whose draft block has not landed in the store yet (first render after add) are skipped.
    const buildable: BuilderRow[] = rows.flatMap(r => {
        const constraints = constraintsOf(r.key);
        return constraints ? [{ ...r, constraints }] : [];
    });
    const { sessie, excluded } = buildSessie(buildable, { ...meta, title, mode, allowRepeatType, timerMin, testMode, statsLocked });
    const percents = normaliseWeights(sessie.types.map(t => t.weight));
    const percentOf = (key: string): number | null => {
        const i = buildable.filter(r => kioskSupports(r.leaf.typeId, r.constraints)).findIndex(r => r.key === key);
        return i < 0 ? null : percents[i];
    };

    const handleSave = () => {
        if (sessie.types.length === 0) return;
        let name = title.trim();
        if (!name) {
            const asked = window.prompt('Naam voor deze oefensessie:', 'Oefensessie');
            if (asked === null) return;
            name = asked;
        }
        // The library name doubles as the pupil's title, so the kiosk never falls back on "Oefenen".
        const titled = title.trim() ? sessie : { ...sessie, title: name.trim().slice(0, 60) };
        if (!title.trim()) setTitle(titled.title ?? '');
        const entry = saveOefenSessie(titled, name);
        if (!entry) { window.alert('Opslaan mislukt: de opslag van je browser is vol.'); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const canShip = sessie.types.length > 0;

    return (
        <>
            <ModalShell onClose={() => { if (!shareOf) onClose(); }} ariaLabel="Oefenmodus samenstellen" variant="sheet" maxWidth={1280}>
                <div style={S.header}>
                    <h2 style={S.title}>Oefenmodus</h2>
                    <p style={S.subtitle}>Kies een paar soorten oefeningen en stel ze in. Leerlingen scannen de QR-code of openen de link en oefenen op hun eigen toestel; de resultaten blijven op dat toestel.</p>
                </div>

                <div style={S.bodyRow}>
                    {/* LEFT: kiosk-capable leaves grouped by domain, click adds a row */}
                    <div style={S.list}>
                        {domains.map(dom => (
                            <div key={dom.id} style={S.domGroup}>
                                <div style={S.domHead}>
                                    <span style={{ ...S.domDot, background: `var(${dom.accentVar})` }} aria-hidden />
                                    <span>{dom.label}</span>
                                </div>
                                {(() => {
                                    let prevCtx: string | null = null;
                                    const els: React.ReactNode[] = [];
                                    for (const leaf of leaves.filter(l => l.domainId === dom.id)) {
                                        if (leaf.context !== prevCtx) {
                                            prevCtx = leaf.context;
                                            els.push(<div key={`sub-${leaf.context}`} style={S.subHead}>{leaf.context}</div>);
                                        }
                                        const n = rows.filter(r => r.leaf.id === leaf.id).length;
                                        els.push(
                                            <button key={leaf.id} className="ui-hover" style={S.leafBtn} onClick={() => addLeaf(leaf)} title="Toevoegen aan de sessie">
                                                <Plus size={14} />
                                                <span style={S.leafLabel}>{leaf.label}</span>
                                                {n > 0 && <span style={S.leafCount}>{n}×</span>}
                                            </button>,
                                        );
                                    }
                                    return els;
                                })()}
                            </div>
                        ))}
                    </div>

                    {/* MAIN: session settings, then one row per added type */}
                    <div style={S.main}>
                        <section style={S.card} aria-label="Instellingen van de sessie">
                            <div style={S.settingsGrid}>
                                <div style={S.field}>
                                    <label style={S.label} htmlFor="oefen-title">Titel</label>
                                    <input id="oefen-title" style={S.input} value={title} maxLength={60} placeholder="Bv. Tafels en procenten" onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div style={S.field}>
                                    <span style={S.label}>Volgorde</span>
                                    <div className="seg-group">
                                        <button className="seg-btn" aria-pressed={mode === 'afwisselen'} onClick={() => setMode('afwisselen')}>Afwisselen</button>
                                        <button className="seg-btn" aria-pressed={mode === 'willekeurig'} onClick={() => setMode('willekeurig')}>Willekeurig</button>
                                    </div>
                                </div>
                                <div style={S.field}>
                                    <span style={S.label}>Tijd</span>
                                    <div className="seg-group" role="group" aria-label="Tijd">
                                        {TIMER_STEPS.map(m => (
                                            <button key={m ?? 'uit'} className="seg-btn" aria-pressed={timerMin === m} onClick={() => setTimerMin(m)}>
                                                {m === undefined ? 'Uit' : `${m} min`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={S.switches}>
                                {mode === 'willekeurig' && (
                                    <SwitchRow label="Zelfde soort na elkaar toestaan" checked={allowRepeatType} onChange={setAllowRepeatType} />
                                )}
                                <SwitchRow label="Testmodus (geen juist/fout tijdens het oefenen)" checked={testMode} onChange={setTestMode} />
                                <SwitchRow label="Statistieken pas op het einde" checked={statsLocked} onChange={setStatsLocked} />
                            </div>
                        </section>

                        {rows.length === 0 && (
                            <p style={S.empty}>Klik links op een soort oefening om te beginnen. Je kan dezelfde soort ook twee keer toevoegen met andere instellingen.</p>
                        )}

                        {rows.map(r => {
                            const draft = draftBlocks.find(b => b.id === draftIdOf(r.key));
                            const Config = EXERCISE_UI[r.leaf.typeId]?.Config;
                            const constraints = draft?.constraints as Record<string, unknown> | undefined;
                            const supported = !constraints || kioskSupports(r.leaf.typeId, constraints);
                            const pct = percentOf(r.key);
                            return (
                                <section key={r.key} style={S.card} aria-label={r.leaf.label}>
                                    <div style={S.rowHead}>
                                        <div style={S.rowTitle}>
                                            <span style={{ ...S.domDot, background: `var(${r.leaf.accentVar})` }} aria-hidden />
                                            <span style={S.rowLabel}>{r.leaf.label}</span>
                                            <span style={S.rowDomain}>{r.leaf.domainLabel}</span>
                                        </div>
                                        <button className="ui-hover" style={S.removeBtn} onClick={() => removeRow(r.key)}>
                                            <Trash size={14} /> Verwijderen
                                        </button>
                                    </div>

                                    {!supported && (
                                        <p style={S.hint} role="status">
                                            <Warning size={14} /> Deze instelling kan nog niet in de oefenmodus. Deze soort komt niet in de link tot je een andere instelling kiest.
                                        </p>
                                    )}

                                    <div style={S.rowGrid}>
                                        <div style={S.configCol}>
                                            {draft && Config ? <Config block={draft} /> : <p style={S.muted}>Geen instellingen voor deze soort.</p>}
                                        </div>
                                        <div style={S.sideCol}>
                                            <div style={S.previewWrap}>
                                                {constraints && <ExercisePreview typeId={r.leaf.typeId} constraints={constraints} count={2} height={130} />}
                                            </div>
                                            <div style={S.field}>
                                                <label style={S.label} htmlFor={`n-${r.key}`}>Aantal: {r.limit ?? '∞'}</label>
                                <input
                                    id={`n-${r.key}`} type="range" min={0} max={LIMIT_MAX} step={1} value={r.limit ?? 0}
                                    style={S.range} onChange={e => patchRow(r.key, { limit: Number(e.target.value) || undefined })}
                                />
                            </div>
                                            {mode === 'willekeurig' && (
                                                <div style={S.field}>
                                                    <label style={S.label} htmlFor={`w-${r.key}`}>Kans: {pct === null ? '–' : `${pct}%`}</label>
                                                    <input
                                                        id={`w-${r.key}`} type="range" min={1} max={100} value={r.weight}
                                                        style={S.range} onChange={e => patchRow(r.key, { weight: Number(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>

                <div style={S.footer}>
                    <span style={S.footerCount}>
                        {sessie.types.length} {sessie.types.length === 1 ? 'soort' : 'soorten'} in de sessie
                        {excluded.length > 0 && ` · ${excluded.length} niet ondersteund`}
                    </span>
                    <div style={S.footerBtns}>
                        <button className="ui-hover" style={S.btn(canShip)} disabled={!canShip} onClick={handleSave}>
                            {saved ? <><Check size={15} /> Opgeslagen</> : <><FloppyDisk size={15} /> Opslaan</>}
                        </button>
                        <button className="ui-hover" style={S.btn(canShip)} disabled={!canShip} onClick={() => setShareOf(sessie)}>
                            <Share size={15} /> Delen
                        </button>
                    </div>
                </div>
            </ModalShell>
            {shareOf && <OefenShareModal sessie={shareOf} onClose={() => setShareOf(null)} />}
        </>
    );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={S.switchRow}>
            <span style={S.switchText}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
}

const S = {
    header: { padding: 'var(--sp-4) 56px var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)', flexShrink: 0 } as React.CSSProperties,
    title: { margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: 'var(--sp-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '780px' } as React.CSSProperties,
    bodyRow: { flex: 1, display: 'flex', minHeight: 0 } as React.CSSProperties,
    list: { width: '280px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--separator)', padding: 'var(--sp-3)' } as React.CSSProperties,
    domGroup: { marginBottom: 'var(--sp-4)' } as React.CSSProperties,
    domHead: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)', padding: 'var(--sp-1) var(--sp-2)' } as React.CSSProperties,
    domDot: { width: '8px', height: '8px', borderRadius: 'var(--radius-pill)', flexShrink: 0 } as React.CSSProperties,
    subHead: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', padding: 'var(--sp-2) var(--sp-2) 2px' } as React.CSSProperties,
    leafBtn: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%', textAlign: 'left', padding: '6px var(--sp-2)', borderRadius: 'var(--radius-xs)', border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    leafLabel: { flex: 1, minWidth: 0 } as React.CSSProperties,
    leafCount: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent)' } as React.CSSProperties,
    main: { flex: 1, minWidth: 0, overflowY: 'auto', padding: 'var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' } as React.CSSProperties,
    card: { background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-1)', padding: 'var(--sp-4)' } as React.CSSProperties,
    settingsGrid: { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1fr) minmax(260px, 1.4fr)', gap: 'var(--sp-4)', alignItems: 'start' } as React.CSSProperties,
    field: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    label: { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' } as React.CSSProperties,
    input: { padding: '6px 10px', height: 'var(--control-h)', boxSizing: 'border-box', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    switches: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--separator)' } as React.CSSProperties,
    switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', maxWidth: '520px' } as React.CSSProperties,
    switchText: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    empty: { margin: 0, padding: 'var(--sp-6)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', border: '2px dashed var(--separator)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    rowHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' } as React.CSSProperties,
    rowTitle: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 } as React.CSSProperties,
    rowLabel: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    rowDomain: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    removeBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    hint: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: '0 0 var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-xs)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    rowGrid: { display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(240px, 320px)', gap: 'var(--sp-5)', alignItems: 'start' } as React.CSSProperties,
    configCol: { minWidth: 0 } as React.CSSProperties,
    sideCol: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    previewWrap: { borderRadius: 'var(--radius-xs)', border: '1px solid var(--separator)', background: '#fff' } as React.CSSProperties,
    muted: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    range: { width: '100%', accentColor: 'var(--accent)' } as React.CSSProperties,
    footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-5)', borderTop: '1px solid var(--separator)', flexShrink: 0 } as React.CSSProperties,
    footerCount: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 } as React.CSSProperties,
    footerBtns: { display: 'flex', gap: 'var(--sp-2)' } as React.CSSProperties,
    btn: (enabled: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5 }),
};
