import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FloppyDisk, Share, Trash, Warning } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { deleteOefenSessie, saveOefenSessie } from '../../services/persistence';
import { attemptsOf, type OefenAttempts, type OefenSessie } from '../../services/oefenen/types';
import { makeDraftBlock } from '../curriculum/draftBlock';
import ExercisePreview from '../shared/ExercisePreview';
import ModalShell from '../ui/ModalShell';
import Switch from '../ui/Switch';
import OefenShareModal from './OefenShareModal';
import OefenCatalogue from './OefenCatalogue';
import { newSessieId } from '../../services/oefenen/session';
import { kioskSupports } from '../../services/oefenen/kiosk';
import { plannedTotal } from '../../services/oefenen/scheduler';
import {
    LIMIT_MAX, TIMER_STEPS, buildSessie, deadRows, draftIdOf, listOefenLeaves, normaliseWeights, rowsFromSessie,
    type BuilderRow, type OefenLeaf,
} from './oefenBuild';

interface Props {
    onClose: () => void;
    // Reopen a saved session for editing ("Opslaan" replaces it; a content edit gets a new id).
    initial?: OefenSessie;
}

// Row = what the builder owns per slot; the row's constraints live in the store's draft block.
type Row = Omit<BuilderRow, 'constraints'>;

// Authoring UI for Oefenmodus: pick kiosk-capable leaves, tune each through its REAL config
// plugin (mounted against an off-sheet draft block, same mechanism as the curriculum builder),
// then save the session to the library or share it as link + QR.
export default function OefenBuilderModal({ onClose, initial }: Props) {
    const leaves = useMemo(() => listOefenLeaves(), []);

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
    // Kept apart from testMode: switching testmodus off again restores the teacher's choice.
    const [attempts, setAttempts] = useState<OefenAttempts>(initial ? (initial.attempts ?? 1) : 1);
    const [shareOf, setShareOf] = useState<OefenSessie | null>(null);
    const [saved, setSaved] = useState(false);
    const nextKey = useRef(rows.length);
    // Whole minutes: the share link then carries createdAt as a 8-digit minute count.
    const [meta] = useState(() => ({ id: initial?.id ?? newSessieId(), createdAt: initial?.createdAt ?? Math.floor(Date.now() / 60_000) * 60_000 }));
    // The id an edited session ships under once its content differs from `initial`.
    const [editedId] = useState(newSessieId);

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
    const { sessie: built, excluded } = buildSessie(buildable, { ...meta, title, mode, allowRepeatType, timerMin, testMode, statsLocked, attempts });
    // Pupils' runs are stored per session id with per-slot stats, so changed content must not reopen
    // (or mislabel) old runs: a content edit is a new session, a rename keeps the id.
    const sessie = initial && !sameContent(built, initial) ? { ...built, id: editedId } : built;
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
        // One library row per edited session: drop the version saved under the other id of this edit.
        if (initial) for (const id of [initial.id, editedId]) if (id !== titled.id) deleteOefenSessie(id);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const canShip = sessie.types.length > 0;
    // Pre-flight: a row that yields no exercise would end every pupil's run, so it blocks Delen until fixed.
    const dead = new Set(deadRows(buildable).map(r => r.key));
    const canShare = canShip && dead.size === 0;
    // A dead row the kiosk also refuses (klok without tijdstypes) is counted once, as dead.
    const unsupportedOnly = excluded.filter(r => !dead.has(r.key)).length;
    // The kiosk's own rule: one row without a limit makes the run endless, and only a timer ends it then.
    const endless = sessie.types.length > 0 && plannedTotal(sessie) === null && !sessie.timerMin;

    return (
        <>
            <ModalShell onClose={() => { if (!shareOf) onClose(); }} ariaLabel="Oefenmodus samenstellen" variant="sheet" maxWidth={1280}>
                <div style={S.header}>
                    <h2 style={S.title}>Oefenmodus</h2>
                    <p style={S.subtitle}>Kies een paar soorten oefeningen en stel ze in. Leerlingen scannen de QR-code of openen de link en oefenen op hun eigen toestel; de resultaten blijven op dat toestel.</p>
                </div>

                <div style={S.bodyRow}>
                    <OefenCatalogue leaves={leaves} countOf={id => rows.filter(r => r.leaf.id === id).length} onAdd={addLeaf} />

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
                                <div style={S.switchRow}>
                                    <span style={S.switchText}>
                                        Kansen per oefening
                                        {testMode && <span style={S.switchNote}>In testmodus 1 kans: zonder juist/fout weet een leerling niet dat het opnieuw moet.</span>}
                                    </span>
                                    <div className="seg-group" role="group" aria-label="Kansen per oefening">
                                        {([1, 2] as const).map(n => (
                                            <button key={n} className="seg-btn" disabled={testMode} aria-pressed={attemptsOf({ attempts, testMode }) === n}
                                                onClick={() => setAttempts(n)}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* The kiosk hides a test's results until the end anyway; the teacher's own choice returns when testmodus goes off. */}
                                <SwitchRow label="Statistieken pas op het einde" checked={statsLocked || testMode} onChange={setStatsLocked} disabled={testMode}
                                    note={testMode ? 'In testmodus zie je de resultaten pas op het einde.' : undefined} />
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
                            const isDead = dead.has(r.key);
                            const pct = percentOf(r.key);
                            return (
                                <section key={r.key} style={isDead ? { ...S.card, border: '1px solid var(--danger)' } : S.card} aria-label={r.leaf.label}>
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

                                    {isDead && <p style={S.deadNote} role="alert"><Warning size={14} /> Deze instellingen leveren geen oefeningen op.</p>}

                                    {!supported && !isDead && (
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
                                                <label style={S.label} htmlFor={`n-${r.key}`}>Aantal: {r.limit ?? 'onbeperkt'}</label>
                                <input
                                    // ∞ sits past 50 at the right end: a "0 = unlimited" left end read as "none" to teachers.
                                    id={`n-${r.key}`} type="range" min={1} max={LIMIT_MAX + 1} step={1} value={r.limit ?? LIMIT_MAX + 1}
                                    style={S.range} onChange={e => { const v = Number(e.target.value); patchRow(r.key, { limit: v > LIMIT_MAX ? undefined : v }); }}
                                />
                            </div>
                                            {mode === 'willekeurig' && (
                                                <div style={S.field}>
                                                    <label style={S.label} htmlFor={`w-${r.key}`}>Kans: {pct === null ? '–' : `${pct}%`}</label>
                                                    <input
                                                        id={`w-${r.key}`} type="range" min={1} max={100} value={r.weight}
                                                        // The % is this row's share of all rows, so one row is always 100 %: say so instead of a dead slider.
                                                        disabled={percents.length < 2}
                                                        style={S.range} onChange={e => patchRow(r.key, { weight: Number(e.target.value) })}
                                                    />
                                                    {percents.length < 2 && <p style={S.note}>Voeg een tweede soort toe om de kansen te verdelen.</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            );
                        })}

                        {endless && <p style={S.note} role="note">Zonder limiet en zonder timer stopt de sessie pas als de leerling op Resultaten tikt.</p>}
                    </div>
                </div>

                <div style={S.footer}>
                    <span style={S.footerCount}>
                        {sessie.types.length} {sessie.types.length === 1 ? 'soort' : 'soorten'} in de sessie
                        {unsupportedOnly > 0 && ` · ${unsupportedOnly} niet ondersteund`}
                        {dead.size > 0 && ` · ${dead.size} zonder oefeningen`}
                    </span>
                    <div style={S.footerBtns}>
                        <button className="ui-hover" style={S.btn(canShip)} disabled={!canShip} onClick={handleSave}>
                            {saved ? <><Check size={15} /> Opgeslagen</> : <><FloppyDisk size={15} /> Opslaan</>}
                        </button>
                        <button className="ui-hover" style={S.btn(canShare)} disabled={!canShare} onClick={() => setShareOf(sessie)}>
                            <Share size={15} /> Delen
                        </button>
                    </div>
                </div>
            </ModalShell>
            {shareOf && <OefenShareModal sessie={shareOf} onClose={() => setShareOf(null)} />}
        </>
    );
}

// Key-order-independent JSON, so two equal sessions compare equal however they were built.
const stable = (v: unknown): string => JSON.stringify(v, (_, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : x));

// Everything but the name: id, title and createdAt do not change what a pupil practises.
function sameContent(a: OefenSessie, b: OefenSessie): boolean {
    const strip = ({ id: _id, title: _title, createdAt: _createdAt, ...rest }: OefenSessie) => rest;
    return stable(strip(a)) === stable(strip(b));
}

function SwitchRow({ label, checked, onChange, disabled, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
    return (
        <div style={S.switchRow}>
            <span style={S.switchText}>
                {label}
                {note && <span style={S.switchNote}>{note}</span>}
            </span>
            <Switch checked={checked} onChange={onChange} aria-label={label} disabled={disabled} />
        </div>
    );
}

const S = {
    header: { padding: 'var(--sp-4) 56px var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)', flexShrink: 0 } as React.CSSProperties,
    title: { margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: 'var(--sp-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '780px' } as React.CSSProperties,
    bodyRow: { flex: 1, display: 'flex', minHeight: 0 } as React.CSSProperties,
    domDot: { width: '8px', height: '8px', borderRadius: 'var(--radius-pill)', flexShrink: 0 } as React.CSSProperties,
    main: { flex: 1, minWidth: 0, overflowY: 'auto', padding: 'var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' } as React.CSSProperties,
    card: { background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-1)', padding: 'var(--sp-4)' } as React.CSSProperties,
    settingsGrid: { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1fr) minmax(260px, 1.4fr)', gap: 'var(--sp-4)', alignItems: 'start' } as React.CSSProperties,
    field: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    label: { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' } as React.CSSProperties,
    input: { padding: '6px 10px', height: 'var(--control-h)', boxSizing: 'border-box', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    switches: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--separator)' } as React.CSSProperties,
    switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', maxWidth: '520px' } as React.CSSProperties,
    switchText: { fontSize: 'var(--text-sm)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    switchNote: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    empty: { margin: 0, padding: 'var(--sp-6)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', border: '2px dashed var(--separator)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    rowHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' } as React.CSSProperties,
    rowTitle: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 } as React.CSSProperties,
    rowLabel: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    rowDomain: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    removeBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    note: { margin: 'var(--sp-1) 0 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' } as React.CSSProperties,
    deadNote: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: '0 0 var(--sp-3)', color: 'var(--danger)', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
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
