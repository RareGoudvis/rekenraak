import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowsClockwise, CaretLeft, Check, Copy, FloppyDisk, Share, Trash, Warning } from '@phosphor-icons/react';
import type { OefenSessie } from '../../services/oefenen/types';
import { MAX_TITLE, MAX_TYPES } from '../../services/oefenen/session';
import { kioskSupports } from '../../services/oefenen/kiosk';
import BetaStrip from '../ui/BetaStrip';
import FirstRunCard from '../ui/FirstRunCard';
import OefenShareModal from './OefenShareModal';
import OefenSidebar from './OefenSidebar';
import OefenSample from './OefenSample';
import OefenInspector, { type OefenRowSection, type OefenScope, type OefenSessieSection } from './OefenInspector';
import ZelfLinkCard from './ZelfLinkCard';
import { rowLabelOf } from './oefenBuild';
import { useOefenBuilder } from './useOefenBuilder';

interface Props {
    // A saved session to edit ("Opslaan" replaces it; a content edit gets a new id, a revert the old one).
    initial?: OefenSessie;
    onClose: () => void;
    // The back button's word: where onClose returns to.
    backLabel?: string;
}

// Oefenmodus as its own workspace: the catalogue left, the session as cards with a live
// kiosk sample in the middle, and the design-A inspector right. All state is useOefenBuilder's.
export default function OefenWorkspace({ initial, onClose, backLabel = 'Werkblad' }: Props) {
    const b = useOefenBuilder(initial);
    const [selected, setSelected] = useState<string | null>(() => b.rows[0]?.key ?? null);
    const [scope, setScope] = useState<OefenScope>('sessie');
    const [rowOpen, setRowOpen] = useState<OefenRowSection | ''>('wat');
    const [sessieOpen, setSessieOpen] = useState<OefenSessieSection | ''>('sessie');
    // Per row: the seed of its sample; "Ander voorbeeld" bumps it.
    const [seeds, setSeeds] = useState<Record<string, number>>({});
    const [shareOf, setShareOf] = useState<OefenSessie | null>(null);
    const [saved, setSaved] = useState(false);

    const select = (key: string) => { setSelected(key); setScope('row'); };
    const resample = (key: string) => setSeeds(s => ({ ...s, [key]: (s[key] ?? 0) + 1 }));
    const add = (leafId: string, constraints?: Record<string, unknown>, label?: string, cardVar?: string) => {
        const key = b.addLeaf(leafId, constraints, label, cardVar);
        if (key) select(key);
    };
    const remove = (key: string) => {
        const i = b.rows.findIndex(r => r.key === key);
        b.removeRow(key);
        if (selected !== key) return;
        // The neighbour takes the selection, so the inspector never shows a row that is gone.
        const next = b.rows[i + 1] ?? b.rows[i - 1];
        setSelected(next?.key ?? null);
        if (!next) setScope('sessie');
    };
    const duplicate = (key: string) => {
        const copy = b.duplicateRow(key);
        if (copy) { setSeeds(s => ({ ...s, [copy]: (s[key] ?? 0) + 1 })); select(copy); }
    };
    const handleSave = () => {
        if (b.save() !== 'saved') return;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    const share = () => setShareOf(b.sessie);

    const count = b.sessie.types.length;

    return (
        // no-print: Ctrl+P with this view open prints the sheet underneath, as Mijn bladen does.
        <div className="no-print" style={S.overlay}>
            <header className="mac-vibrant" style={S.bar}>
                <div style={S.barLeft}>
                    <button type="button" className="ui-hover" style={S.backBtn} onClick={onClose}>
                        <CaretLeft size={16} aria-hidden="true" /> {backLabel}
                    </button>
                    <span style={S.mode}>Oefenmodus</span>
                </div>
                <input style={S.titleInput} value={b.settings.title} maxLength={MAX_TITLE} placeholder="Naamloze oefensessie"
                    aria-label="Naam van de sessie" onChange={e => b.setTitle(e.target.value)} />
                <div style={S.barRight}>
                    <button type="button" className="ui-hover" style={S.btn(b.canShip)} disabled={!b.canShip} onClick={handleSave}>
                        {saved ? <><Check size={15} aria-hidden="true" /> Opgeslagen</> : <><FloppyDisk size={15} aria-hidden="true" /> Opslaan</>}
                    </button>
                    <button type="button" className="ui-hover" style={S.primary(b.canShare)} disabled={!b.canShare} onClick={share}
                        title={b.canShare ? 'Link en QR-code voor de leerlingen' : !b.canShip ? 'Voeg eerst een oefening toe' : 'Een soort levert geen oefeningen op'}>
                        <Share size={15} aria-hidden="true" /> Delen
                    </button>
                </div>
            </header>

            <div style={S.body}>
                <OefenSidebar onAdd={add} isAdded={b.countOf} cardCount={b.countOfCard} full={b.full} />

                <main style={S.viewer} aria-label="Sessie">
                    <BetaStrip module="oefenmodus" />
                    <FirstRunCard module="oefenmodus" />
                    <div style={S.viewerInner}>
                        <ZelfLinkCard />

                        <div style={S.listHead}>
                            <span style={S.count}>
                                {count} {count === 1 ? 'soort' : 'soorten'} in de sessie
                                {b.unsupportedOnly > 0 && ` · ${b.unsupportedOnly} niet ondersteund`}
                                {b.dead.size > 0 && ` · ${b.dead.size} zonder oefeningen`}
                            </span>
                            {b.full && <span style={S.muted} role="status">Maximum {MAX_TYPES} soorten per sessie.</span>}
                        </div>
                        {/* Honest, not blocking: a teacher may keep a half-finished session, but it cannot reach a pupil yet. */}
                        {b.dead.size > 0 && b.canShip && (
                            <p style={S.deadLine} role="note" aria-label="Opslaan zonder delen">
                                <Warning size={14} aria-hidden="true" /> {b.dead.size === 1 ? 'Een soort levert' : `${b.dead.size} soorten leveren`} geen oefeningen op: je kan opslaan, delen kan pas als je dat aanpast.
                            </p>
                        )}

                        {b.rows.length === 0 && (
                            <div style={S.empty}>
                                <ArrowLeft size={22} aria-hidden="true" />
                                <span>Klik links op een oefening om ze aan de sessie toe te voegen.</span>
                            </div>
                        )}

                        {b.rows.map((r, i) => {
                            const constraints = b.constraintsOf(r.key);
                            const label = constraints ? rowLabelOf({ leaf: r.leaf, constraints }) : r.leaf.label;
                            const isDead = b.dead.has(r.key);
                            const supported = !constraints || kioskSupports(r.leaf.typeId, constraints);
                            const pct = b.percentOf(r.key);
                            const isSel = selected === r.key && scope === 'row';
                            return (
                                <section key={r.key} aria-label={label} aria-current={isSel || undefined} onClick={() => select(r.key)}
                                    style={{ ...S.card, ...(isSel ? S.cardSel : null), ...(isDead ? S.cardDead : null) }}>
                                    <OefenSampleSlot leaf={r.leaf} label={label} constraints={constraints} seed={seeds[r.key] ?? 0} />
                                    <div style={S.cardSide}>
                                        <div style={S.cardHead}>
                                            <span style={S.num}>{i + 1}</span>
                                            <span style={{ ...S.dot, background: `var(${r.leaf.accentVar})` }} aria-hidden="true" />
                                            <button type="button" style={S.cardTitle} onClick={(e) => { e.stopPropagation(); select(r.key); }}>
                                                {r.cardLabel ?? label}
                                            </button>
                                        </div>
                                        <span style={S.domain}>{r.cardLabel ? `${label} · ` : ''}{r.leaf.domainLabel}</span>
                                        <div style={S.chips}>
                                            {b.settings.mode === 'willekeurig' && <span style={S.chip}>Kans {pct === null ? '–' : `${pct}%`}</span>}
                                            <span style={S.chip}>{r.limit ? `Limiet ${r.limit}` : 'Geen limiet'}</span>
                                            {isDead && <span style={S.chipDanger}><Warning size={12} aria-hidden="true" /> Geen oefeningen</span>}
                                            {!supported && !isDead && <span style={S.chipDanger}><Warning size={12} aria-hidden="true" /> Niet in de link</span>}
                                        </div>
                                        <div style={S.actions} onClick={(e) => e.stopPropagation()}>
                                            <button type="button" className="ui-hover" style={S.iconBtn(i > 0)} disabled={i === 0} onClick={() => b.moveRow(r.key, -1)}
                                                aria-label="Omhoog" title="Omhoog"><ArrowUp size={14} aria-hidden="true" /></button>
                                            <button type="button" className="ui-hover" style={S.iconBtn(i < b.rows.length - 1)} disabled={i === b.rows.length - 1} onClick={() => b.moveRow(r.key, 1)}
                                                aria-label="Omlaag" title="Omlaag"><ArrowDown size={14} aria-hidden="true" /></button>
                                            <button type="button" className="ui-hover" style={S.iconBtn(!b.full)} disabled={b.full} onClick={() => duplicate(r.key)}
                                                aria-label="Dupliceren" title={b.full ? `Maximum ${MAX_TYPES} soorten per sessie` : 'Dupliceren'}><Copy size={14} aria-hidden="true" /></button>
                                            <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => resample(r.key)}>
                                                <ArrowsClockwise size={14} aria-hidden="true" /> Ander voorbeeld
                                            </button>
                                            <button type="button" className="ui-hover" style={S.removeBtn} onClick={() => remove(r.key)}>
                                                <Trash size={14} aria-hidden="true" /> Verwijderen
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </main>

                <OefenInspector b={b} selectedKey={selected} scope={scope} onScope={setScope}
                    rowOpen={rowOpen} onRowOpen={setRowOpen} sessieOpen={sessieOpen} onSessieOpen={setSessieOpen}
                    onResample={resample} onShare={share} />
            </div>
            {shareOf && <OefenShareModal sessie={shareOf} onClose={() => setShareOf(null)} />}
        </div>
    );
}

// The draft block lands in the store a render after the add: hold the frame's place till then.
function OefenSampleSlot({ constraints, ...rest }: { leaf: Parameters<typeof OefenSample>[0]['leaf']; label: string; constraints: Record<string, unknown> | undefined; seed: number }) {
    return constraints ? <OefenSample constraints={constraints} {...rest} /> : <div style={S.framePlaceholder} />;
}

const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap' };

const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    // SYNC: TopBar S.bar (height --bar-h, hairline, frosted), so the workspace reads as the editor's sibling.
    bar: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(200px, 420px) minmax(0, 1fr)', alignItems: 'center', gap: 'var(--sp-3)', minHeight: 'var(--bar-h)', padding: '0 var(--sp-3)', borderBottom: '1px solid var(--separator)', flexShrink: 0, position: 'relative', zIndex: 50 } as React.CSSProperties,
    barLeft: { display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 } as React.CSSProperties,
    barRight: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--sp-2)' } as React.CSSProperties,
    backBtn: { ...btnBase, padding: '0 var(--sp-3) 0 var(--sp-2)', cursor: 'pointer' } as React.CSSProperties,
    mode: { fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' } as React.CSSProperties,
    // The sheet name's type (TopBar S.titleInput), always a field: the session has no sheet to click on.
    titleInput: { width: '100%', boxSizing: 'border-box', height: 'var(--control-h)', padding: '0 var(--sp-3)', textAlign: 'center', fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-main)', background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', outline: 'none' } as React.CSSProperties,
    btn: (enabled: boolean): React.CSSProperties => ({ ...btnBase, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5 }),
    primary: (enabled: boolean): React.CSSProperties => ({ ...btnBase, background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--accent-on)', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5 }),
    body: { flex: 1, minHeight: 0, display: 'flex' } as React.CSSProperties,
    viewer: { flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    viewerInner: { width: '100%', maxWidth: '860px', margin: '0 auto', boxSizing: 'border-box', padding: '0 var(--sp-5) var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    listHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' } as React.CSSProperties,
    count: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 } as React.CSSProperties,
    muted: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    deadLine: { display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', margin: 0, fontSize: 'var(--text-sm)', color: 'var(--danger)', fontWeight: 600 } as React.CSSProperties,
    empty: { display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-6)', fontSize: 'var(--text-md)', color: 'var(--text-muted)', border: '2px dashed var(--separator)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    card: { display: 'flex', gap: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-1)', cursor: 'pointer' } as React.CSSProperties,
    // THE selected-state rule: accent ring (UI-GUIDE); the soft fill would tint the sample.
    cardSel: { border: '1px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent), var(--shadow-1)' } as React.CSSProperties,
    cardDead: { border: '1px solid var(--danger)' } as React.CSSProperties,
    framePlaceholder: { width: 300, height: 180, flex: 'none', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-base)' } as React.CSSProperties,
    cardSide: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    cardHead: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 } as React.CSSProperties,
    num: { flex: 'none', minWidth: '22px', height: '22px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    dot: { width: '8px', height: '8px', borderRadius: 'var(--radius-pill)', flexShrink: 0 } as React.CSSProperties,
    cardTitle: { minWidth: 0, padding: 0, border: 0, background: 'none', font: 'inherit', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    domain: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    chips: { display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' } as React.CSSProperties,
    chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)', background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    chipDanger: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)' } as React.CSSProperties,
    actions: { marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'default' } as React.CSSProperties,
    iconBtn: (enabled: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.4 }),
    smallBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 var(--sp-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    removeBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 var(--sp-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
};
