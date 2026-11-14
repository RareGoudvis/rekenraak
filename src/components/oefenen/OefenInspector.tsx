import type { ReactNode } from 'react';
import { ArrowsClockwise, QrCode, Warning } from '@phosphor-icons/react';
import { EXERCISE_UI } from '../../config/exerciseUI';
import type { MathBlock } from '../../services/math/types';
import { attemptsOf } from '../../services/oefenen/types';
import { plannedTotal } from '../../services/oefenen/scheduler';
import { MAX_TITLE } from '../../services/oefenen/session';
import { kioskSupports } from '../../services/oefenen/kiosk';
import { InspectorSection, InspectorStyles } from '../configurator/InspectorAccordion';
import { F } from '../configurator/plugins/shared/fieldStyles';
import Switch from '../ui/Switch';
import ZelfLinkCard from './ZelfLinkCard';
import { LIMIT_MAX, TIMER_STEPS, exactFormDefaultOf, rowLabelOf, rowSettingOf } from './oefenBuild';
import type { OefenBuilder } from './useOefenBuilder';

export type OefenScope = 'row' | 'sessie';
export type OefenRowSection = 'wat' | 'hoeveel' | 'antwoord';
export type OefenSessieSection = 'sessie' | 'tijd' | 'feedback' | 'hulp' | 'delen';

type SummaryFn = { summary?: (block: MathBlock) => string };

const EXACT_WORD = { true: 'Enkel de gevraagde vorm', false: 'Gelijkwaardig goedrekenen' } as const;

// Joins the parts that apply and capitalises the first, the worksheet Inspector's summary rule.
const summaryOf = (parts: Array<string | null | false | undefined>) => {
    const s = parts.filter(Boolean).join(' · ');
    return s.charAt(0).toUpperCase() + s.slice(1);
};

interface Props {
    b: OefenBuilder;
    selectedKey: string | null;
    scope: OefenScope;
    onScope: (scope: OefenScope) => void;
    rowOpen: OefenRowSection | '';
    onRowOpen: (s: OefenRowSection | '') => void;
    sessieOpen: OefenSessieSection | '';
    onSessieOpen: (s: OefenSessieSection | '') => void;
    onResample: (key: string) => void;
    onShare: () => void;
}

// The workspace's right panel, the worksheet Inspector's design A: a scope switch
// (Oefening N | Hele sessie), a pinned row for the selected oefening, and accordion
// sections with a one-line summary each, one open at a time per scope.
export default function OefenInspector({ b, selectedKey, scope, onScope, rowOpen, onRowOpen, sessieOpen, onSessieOpen, onResample, onShare }: Props) {
    const index = selectedKey ? b.rows.findIndex(r => r.key === selectedKey) : -1;
    const row = index >= 0 ? b.rows[index] : undefined;
    const shown: OefenScope = scope === 'row' && row ? 'row' : 'sessie';
    const s = b.settings;

    // ── Oefening N ──
    let rowPinned: ReactNode = null;
    const rowSections: Array<{ id: OefenRowSection; title: string; summary: string; body: ReactNode }> = [];
    if (row) {
        const draft = b.draftOf(row.key);
        const constraints = draft?.constraints as Record<string, unknown> | undefined;
        const ui = EXERCISE_UI[row.leaf.typeId] as (typeof EXERCISE_UI)[string] & SummaryFn | undefined;
        const Config = ui?.Config;
        const supported = !constraints || kioskSupports(row.leaf.typeId, constraints);
        const isDead = b.dead.has(row.key);
        const pct = b.percentOf(row.key);
        const formDefault = constraints ? exactFormDefaultOf({ leaf: row.leaf, constraints }) : undefined;
        const rowSetting = constraints ? rowSettingOf({ leaf: row.leaf, constraints }) : undefined;
        const label = constraints ? rowLabelOf({ leaf: row.leaf, constraints }) : row.leaf.label;
        const random = s.mode === 'willekeurig';

        rowPinned = (
            <div style={S.pinned}>
                <div style={S.pinnedRow}>
                    <div style={S.kansCol}>
                        <label style={S.pinnedLabel} htmlFor={`w-${row.key}`}>
                            {random ? `Kans: ${pct === null ? '–' : `${pct}%`}` : 'Kans: om de beurt'}
                        </label>
                        <input
                            id={`w-${row.key}`} type="range" min={1} max={100} value={row.weight}
                            // The % is this row's share of all rows, so one row is always 100 %: say so instead of a dead slider.
                            disabled={!random || b.percents.length < 2}
                            style={S.range} onChange={e => b.patchRow(row.key, { weight: Number(e.target.value) })}
                        />
                    </div>
                    <button type="button" className="ui-hover" style={S.btn} onClick={() => onResample(row.key)}>
                        <ArrowsClockwise size={15} aria-hidden="true" /> Ander voorbeeld
                    </button>
                </div>
                {!random && <p style={S.hint}>Bij Afwisselen komt elke soort om de beurt. Kansen verdelen: Willekeurig bij Hele sessie.</p>}
                {random && b.percents.length < 2 && <p style={S.hint}>Voeg een tweede soort toe om de kansen te verdelen.</p>}
            </div>
        );

        rowSections.push({
            id: 'wat', title: 'Wat oefenen ze',
            summary: (draft && ui?.summary?.(draft)) || label,
            body: (<>
                {isDead && <p style={S.deadNote} role="alert"><Warning size={14} aria-hidden="true" /> Deze instellingen leveren geen oefeningen op.</p>}
                {!supported && !isDead && (
                    <p style={S.unsupported} role="status">
                        <Warning size={14} aria-hidden="true" /> Deze instelling kan nog niet in de oefenmodus. Deze soort komt niet in de link tot je een andere instelling kiest.
                    </p>
                )}
                {draft && Config ? <Config block={draft} /> : <p style={S.muted}>Geen instellingen voor deze soort.</p>}
            </>),
        });

        rowSections.push({
            id: 'hoeveel', title: 'Hoeveel',
            summary: row.limit ? `${row.limit} per sessie` : 'Onbeperkt',
            body: (<>
                <label style={F.label} htmlFor={`n-${row.key}`}>Aantal: {row.limit ?? 'onbeperkt'}</label>
                <input
                    // ∞ sits past 50 at the right end: a "0 = unlimited" left end read as "none" to teachers.
                    id={`n-${row.key}`} type="range" min={1} max={LIMIT_MAX + 1} step={1} value={row.limit ?? LIMIT_MAX + 1}
                    style={S.range} onChange={e => { const v = Number(e.target.value); b.patchRow(row.key, { limit: v > LIMIT_MAX ? undefined : v }); }}
                />
                <p style={S.hint}>Helemaal rechts: onbeperkt. De sessie stopt dan met de timer of als de leerling stopt.</p>
            </>),
        });

        if (formDefault !== undefined || rowSetting) rowSections.push({
            id: 'antwoord', title: 'Antwoord',
            summary: summaryOf([
                rowSetting && rowSetting.options.find(o => o.value === rowSetting.value)?.label,
                formDefault !== undefined && EXACT_WORD[String(row.exactForm ?? formDefault) as 'true' | 'false'],
            ]),
            body: (<>
                {formDefault !== undefined && (
                    <div className="seg-group" role="group" aria-label="Antwoord" style={S.formGroup}>
                        {([false, true] as const).map(exact => (
                            // Picking the default stores nothing, so the row follows the leaf default in the link.
                            <button key={String(exact)} className="seg-btn" style={S.formBtn} aria-pressed={(row.exactForm ?? formDefault) === exact}
                                onClick={() => b.patchRow(row.key, { exactForm: exact === formDefault ? undefined : exact })}>
                                {EXACT_WORD[String(exact) as 'true' | 'false']}
                            </button>
                        ))}
                    </div>
                )}
                {rowSetting && (<>
                    {formDefault !== undefined && <span style={{ ...F.label, marginTop: 'var(--sp-3)' }}>{rowSetting.label}</span>}
                    <div className="seg-group" role="group" aria-label={rowSetting.label} style={S.formGroup}>
                        {rowSetting.options.map(o => (
                            <button key={o.value} className="seg-btn" style={S.formBtn} aria-pressed={rowSetting.value === o.value}
                                onClick={() => b.setRowConstraint(row.key, rowSetting.key, o.value)}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </>)}
            </>),
        });
    }
    // A remembered section this row does not have (no Antwoord) falls back to Wat oefenen ze.
    const rowShown = rowOpen === '' ? '' : rowSections.some(x => x.id === rowOpen) ? rowOpen : 'wat';

    // ── Hele sessie ──
    const total = plannedTotal(b.sessie);
    const kansen = attemptsOf({ attempts: s.attempts, testMode: s.testMode });
    const stepsOn = s.showSteps && !s.testMode;
    const mabOn = s.showMab && stepsOn;
    const sessieSections: Array<{ id: OefenSessieSection; title: string; summary: string; body: ReactNode }> = [
        {
            id: 'sessie', title: 'Sessie',
            summary: summaryOf([s.title.trim() || 'zonder titel', s.mode, s.mode === 'willekeurig' && s.allowRepeatType && 'herhaling mag']),
            body: (<>
                <label style={F.label} htmlFor="oefen-title">Titel</label>
                <input id="oefen-title" style={F.input} value={s.title} maxLength={MAX_TITLE} placeholder="Bv. Tafels en procenten" onChange={e => b.setTitle(e.target.value)} />
                <span style={{ ...F.label, marginTop: 'var(--sp-3)' }}>Volgorde</span>
                <div className="seg-group" role="group" aria-label="Volgorde">
                    <button className="seg-btn" aria-pressed={s.mode === 'afwisselen'} onClick={() => b.setMode('afwisselen')}>Afwisselen</button>
                    <button className="seg-btn" aria-pressed={s.mode === 'willekeurig'} onClick={() => b.setMode('willekeurig')}>Willekeurig</button>
                </div>
                <p style={S.hint}>{s.mode === 'afwisselen' ? 'Elke soort om de beurt.' : 'Elke keer een soort volgens de kansen per oefening.'}</p>
                {s.mode === 'willekeurig' && (
                    <SwitchRow label="Zelfde soort na elkaar toestaan" checked={s.allowRepeatType} onChange={b.setAllowRepeatType} />
                )}
            </>),
        },
        {
            id: 'tijd', title: 'Tijd en aantal',
            summary: summaryOf([s.timerMin ? `timer ${s.timerMin} min` : 'geen timer', b.sessie.types.length > 0 && (total === null ? 'onbeperkt' : `${total} ${total === 1 ? 'oefening' : 'oefeningen'}`)]),
            body: (<>
                <span style={F.label}>Tijd</span>
                <div className="seg-group" role="group" aria-label="Tijd">
                    {TIMER_STEPS.map(m => (
                        <button key={m ?? 'uit'} className="seg-btn" aria-pressed={s.timerMin === m} onClick={() => b.setTimerMin(m)}>
                            {m === undefined ? 'Uit' : `${m} min`}
                        </button>
                    ))}
                </div>
                <span style={{ ...F.label, marginTop: 'var(--sp-3)' }}>Totaal</span>
                <p style={S.value}>
                    {b.sessie.types.length === 0 ? 'Nog geen oefeningen.'
                        : total === null ? 'Onbeperkt: een soort heeft geen limiet.' : `${total} ${total === 1 ? 'oefening' : 'oefeningen'} (de som van de limieten).`}
                </p>
                {b.endless && <p style={S.note} role="note">Zonder limiet en zonder timer stopt de sessie pas als de leerling zelf op Stoppen tikt.</p>}
            </>),
        },
        {
            id: 'feedback', title: 'Feedback',
            summary: summaryOf([s.testMode ? 'testmodus' : 'juist/fout meteen', `${kansen} ${kansen === 1 ? 'kans' : 'kansen'}`, (s.statsLocked || s.testMode) ? 'resultaten op het einde' : 'resultaten altijd']),
            body: (<>
                <SwitchRow label="Testmodus (geen juist/fout tijdens het oefenen)" checked={s.testMode} onChange={b.setTestMode} />
                <div style={F.switchRow}>
                    <span style={S.switchText}>
                        Kansen per oefening
                        {s.testMode && <span style={S.switchNote}>In testmodus 1 kans: zonder juist/fout weet een leerling niet dat het opnieuw moet.</span>}
                    </span>
                    <div className="seg-group" role="group" aria-label="Kansen per oefening" style={S.smallSeg}>
                        {([1, 2] as const).map(n => (
                            <button key={n} className="seg-btn" disabled={s.testMode} aria-pressed={kansen === n} onClick={() => b.setAttempts(n)}>{n}</button>
                        ))}
                    </div>
                </div>
                {/* The kiosk hides a test's results until the end anyway; the teacher's own choice returns when testmodus goes off. */}
                <SwitchRow label="Statistieken pas op het einde" checked={s.statsLocked || s.testMode} onChange={b.setStatsLocked} disabled={s.testMode}
                    note={s.testMode ? 'In testmodus zie je de resultaten pas op het einde.' : undefined} />
            </>),
        },
        {
            id: 'hulp', title: 'Hulp',
            summary: !b.stepsPossible ? 'Geen stappen bij deze oefeningen'
                : summaryOf([stepsOn ? 'stappen na een fout' : 'geen stappen', b.mabPossible && (mabOn ? 'MAB' : 'zonder MAB')]),
            body: (<>
                {!b.stepsPossible && <p style={S.muted}>Geen van deze oefeningen heeft stappen. Kies bv. optellen of aftrekken om stappen te tonen na een fout.</p>}
                {b.stepsPossible && (
                    <SwitchRow label="Stappen tonen na een fout" checked={stepsOn} onChange={b.setShowSteps} disabled={s.testMode}
                        note={s.testMode ? 'In testmodus is er geen juist/fout, dus ook geen stappen.' : undefined} />
                )}
                {b.mabPossible && (
                    <SwitchRow label="Hulp met MAB" checked={mabOn} onChange={b.setShowMab} disabled={s.testMode || !s.showSteps}
                        note="MAB-blokjes boven de stappen, voor sommen tot 1000. Niet op een smartphone." />
                )}
            </>),
        },
        {
            id: 'delen', title: 'Delen',
            summary: !b.canShip ? 'Voeg eerst een oefening toe' : b.canShare ? 'Klaar: link en QR-code' : 'Nog niet: een soort levert geen oefeningen op',
            body: (<>
                <p style={S.value}>Leerlingen scannen de QR-code of openen de link en oefenen op hun eigen toestel; de resultaten blijven op dat toestel.</p>
                <button type="button" className="ui-hover" style={{ ...S.btn, alignSelf: 'flex-start', opacity: b.canShare ? 1 : 0.5, cursor: b.canShare ? 'pointer' : 'not-allowed' }}
                    disabled={!b.canShare} onClick={onShare}>
                    <QrCode size={15} aria-hidden="true" /> Link en QR-code
                </button>
                <ZelfLinkCard />
            </>),
        },
    ];
    const sessieShown = sessieOpen;

    return (
        <aside className="app-panel-right" aria-label="Instellingen" style={S.root}>
            <InspectorStyles />
            <div className="panel-head">
                <div className="seg-group" role="group" aria-label="Wat pas je aan">
                    <button className="seg-btn" aria-pressed={shown === 'row'} disabled={!row}
                        title={row ? undefined : 'Kies eerst een oefening in het midden'} onClick={() => onScope('row')}>
                        {row ? `Oefening ${index + 1}` : 'Oefening'}
                    </button>
                    <button className="seg-btn" aria-pressed={shown === 'sessie'} onClick={() => onScope('sessie')}>Hele sessie</button>
                </div>
            </div>
            {shown === 'row' && rowPinned}
            <div style={S.scroll}>
                {shown === 'row'
                    ? rowSections.map(x => (
                        <InspectorSection key={x.id} title={x.title} summary={x.summary} open={rowShown === x.id} onToggle={() => onRowOpen(rowShown === x.id ? '' : x.id)}>
                            {x.body}
                        </InspectorSection>
                    ))
                    : sessieSections.map(x => (
                        <InspectorSection key={x.id} title={x.title} summary={x.summary} open={sessieShown === x.id} onToggle={() => onSessieOpen(sessieShown === x.id ? '' : x.id)}>
                            {x.body}
                        </InspectorSection>
                    ))}
            </div>
        </aside>
    );
}

function SwitchRow({ label, checked, onChange, disabled, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
    return (
        <div style={F.switchRow}>
            <span style={S.switchText}>
                {label}
                {note && <span style={S.switchNote}>{note}</span>}
            </span>
            <Switch checked={checked} onChange={onChange} aria-label={label} disabled={disabled} />
        </div>
    );
}

const S = {
    // SYNC: Inspector.tsx S.sidebar, so both right panels are one width.
    root: { width: '366px', minWidth: '366px', backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--separator)', height: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    pinned: { flex: 'none', padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--separator)', background: 'var(--bg-surface)' } as React.CSSProperties,
    pinnedRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--sp-3)' } as React.CSSProperties,
    kansCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    pinnedLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' } as React.CSSProperties,
    scroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-3) var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    range: { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' } as React.CSSProperties,
    btn: { display: 'inline-flex', alignItems: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 } as React.CSSProperties,
    hint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 'var(--sp-1) 0 0', lineHeight: 1.4 } as React.CSSProperties,
    note: { margin: 'var(--sp-2) 0 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' } as React.CSSProperties,
    value: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-main)', lineHeight: 1.4 } as React.CSSProperties,
    muted: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    switchText: { fontSize: 'var(--text-sm)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    switchNote: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    smallSeg: { flex: 'none', width: 'auto' } as React.CSSProperties,
    deadNote: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: '0 0 var(--sp-3)', color: 'var(--danger)', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
    unsupported: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: '0 0 var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-xs)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    // Two long labels in a 330 px column: stack them instead of squeezing one line.
    formGroup: { flexDirection: 'column', alignItems: 'stretch' } as React.CSSProperties,
    // .seg-btn's flex: 1 would collapse its height to 0-basis in a column.
    formBtn: { flex: 'none' } as React.CSSProperties,
};
