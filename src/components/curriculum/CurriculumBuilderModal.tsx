import { useEffect, useMemo, useState } from 'react';
import { X, Check, Eye, EyeOff } from 'lucide-react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { buildCatalog, catalogDomains, type CatalogItem } from '../../config/exerciseCatalog';
import { REGISTRY } from '../../config/exerciseRegistry';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { encodeShareLink } from '../../services/persistence';
import type { MathBlock } from '../../services/math/types';
import ExercisePreview from '../shared/ExercisePreview';
import ModalPortal from '../ui/ModalPortal';

interface Props {
    onClose: () => void;
}

function makeDraftBlock(typeId: string, variantConstraints: Record<string, unknown>): MathBlock {
    const def = REGISTRY[typeId];
    const defaults = def.defaultConstraints(typeId);
    return {
        id: `draft-${typeId}`,
        typeId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: def.defaultCount,
        totalPoints: 0,
        verticalSpacing: 14,
        constraints: { ...defaults, ...variantConstraints },
        exercises: [],
    };
}

// Authoring UI: pick which exercise types a curriculum allows, fine-tune each via
// the REAL config plugin (mounted against an off-sheet draft block), preview one
// example, then emit a locked share link.
export default function CurriculumBuilderModal({ onClose }: Props) {
    const catalog = useMemo(() => buildCatalog(), []);
    const domains = useMemo(() => catalogDomains(catalog), [catalog]);

    const draftBlocks = useWorksheetStore((s) => s.draftBlocks);
    const setDraftBlocks = useWorksheetStore((s) => s.setDraftBlocks);
    const clearDraftBlocks = useWorksheetStore((s) => s.clearDraftBlocks);

    const [variantByType, setVariantByType] = useState<Record<string, string>>({});
    const [included, setIncluded] = useState<Record<string, boolean>>({});
    const [focused, setFocused] = useState<string>(catalog[0]?.typeId ?? '');
    const [flash, setFlash] = useState(false);

    // Seed one draft per type on open; tear down on close.
    useEffect(() => {
        setDraftBlocks(catalog.map(it => makeDraftBlock(it.typeId, it.variants[0].constraints)));
        return () => clearDraftBlocks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const draftFor = (typeId: string) => draftBlocks.find(b => b.id === `draft-${typeId}`);
    const chosenVariant = (item: CatalogItem) =>
        item.variants.find(v => v.key === variantByType[item.typeId]) ?? item.variants[0];

    const selectVariant = (item: CatalogItem, key: string) => {
        const variant = item.variants.find(v => v.key === key) ?? item.variants[0];
        setVariantByType(s => ({ ...s, [item.typeId]: key }));
        // Reset the draft's constraints to the variant defaults (drops prior fine-tuning).
        const fresh = makeDraftBlock(item.typeId, variant.constraints);
        setDraftBlocks(useWorksheetStore.getState().draftBlocks.map(b => b.id === fresh.id ? fresh : b));
    };

    const toggleIncluded = (typeId: string) => setIncluded(s => ({ ...s, [typeId]: !s[typeId] }));
    const setDomainIncluded = (domainId: string, value: boolean) =>
        setIncluded(s => {
            const next = { ...s };
            for (const it of catalog) if (it.domainId === domainId) next[it.typeId] = value;
            return next;
        });
    const setAllIncluded = (value: boolean) =>
        setIncluded(() => Object.fromEntries(catalog.map(it => [it.typeId, value])));

    const includedItems = catalog.filter(it => included[it.typeId]);

    const handleShareLink = async () => {
        const st = useWorksheetStore.getState();
        const allowedTypes = includedItems.map(item => {
            const draft = draftFor(item.typeId);
            const variant = chosenVariant(item);
            return {
                typeId: item.typeId,
                label: item.variants.length > 1 ? variant.label : item.label,
                lockedConstraints: draft ? draft.constraints : {},
            };
        });
        const link = encodeShareLink(
            { blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings, baseSettings: st.baseSettings },
            { template: true, curriculum: { locked: true, allowedTypes } },
        );
        if (!link) { window.alert('Curriculum te groot voor een deelbare link.'); return; }
        try {
            await navigator.clipboard.writeText(link);
            setFlash(true);
            setTimeout(() => setFlash(false), 2000);
        } catch {
            window.prompt('Kopieer deze curriculum-link:', link);
        }
    };

    const focusedItem = catalog.find(it => it.typeId === focused);
    const focusedDraft = focusedItem ? draftFor(focusedItem.typeId) : undefined;
    const Config = focusedItem ? EXERCISE_UI[focusedItem.typeId]?.Config : undefined;

    return (
        <ModalPortal>
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <h2 style={S.title}>Curriculum samenstellen</h2>
                        <p style={S.subtitle}>Kies welke oefeningen ouders mogen toevoegen en stel per oefening de moeilijkheidsgraad in. Deel daarna de vergrendelde link.</p>
                    </div>
                    <button style={S.closeBtn} onClick={onClose} title="Sluiten" aria-label="Sluiten"><X size={20} /></button>
                </div>

                <div style={S.bulkBar}>
                    <button style={S.bulkBtn} onClick={() => setAllIncluded(true)}><Eye size={13} /> Alles tonen</button>
                    <button style={S.bulkBtn} onClick={() => setAllIncluded(false)}><EyeOff size={13} /> Alles verbergen</button>
                </div>

                <div style={S.bodyRow}>
                    {/* LEFT — type list grouped by domain */}
                    <div style={S.list}>
                        {domains.map(dom => {
                            const rows = catalog.filter(it => it.domainId === dom.id);
                            return (
                                <div key={dom.id} style={S.domGroup}>
                                    <div style={S.domHead}>
                                        <span style={{ color: `var(${dom.accentVar})` }}>{dom.label}</span>
                                        <span style={S.domBulk}>
                                            <button style={S.domBulkBtn} onClick={() => setDomainIncluded(dom.id, true)} title="Toon alles">alle</button>
                                            <button style={S.domBulkBtn} onClick={() => setDomainIncluded(dom.id, false)} title="Verberg alles">geen</button>
                                        </span>
                                    </div>
                                    {(() => {
                                        // Sub-header per subdomain (item.context) so e.g. Geld's
                                        // Herkennen/Bedrag tekenen/Wissel/Teruggeven read as one group.
                                        let prevCtx: string | null = null;
                                        const els: React.ReactNode[] = [];
                                        for (const item of rows) {
                                            if (item.context !== prevCtx) {
                                                prevCtx = item.context;
                                                els.push(<div key={`sub-${item.context}`} style={S.subHead}>{item.context}</div>);
                                            }
                                            const isFocused = item.typeId === focused;
                                            const isOn = !!included[item.typeId];
                                            const variant = chosenVariant(item);
                                            els.push(
                                                <div key={item.typeId} style={S.row(isFocused)} onClick={() => setFocused(item.typeId)}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleIncluded(item.typeId); }}
                                                        style={S.eyeBtn(isOn, dom.accentVar)}
                                                        title={isOn ? 'Verbergen' : 'Tonen'}
                                                    >
                                                        {isOn ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={S.rowLabel(isOn)}>{item.label}</div>
                                                        {item.variants.length > 1 && <div style={S.rowVariant}>{variant.label}</div>}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return els;
                                    })()}
                                </div>
                            );
                        })}
                    </div>

                    {/* RIGHT — mini-inspector + example for the focused type */}
                    <div style={S.detail}>
                        {focusedItem && focusedDraft ? (
                            <>
                                <div style={S.detailHead}>
                                    <div style={S.detailTitle}>{focusedItem.label}</div>
                                    <div style={S.detailContext}>{focusedItem.context}</div>
                                </div>

                                {focusedItem.variants.length > 1 && (
                                    <div style={S.variantRow}>
                                        {focusedItem.variants.map(v => (
                                            <button key={v.key} onClick={() => selectVariant(focusedItem, v.key)} style={S.variantBtn(v.key === chosenVariant(focusedItem).key)}>
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div style={S.previewWrap}>
                                    <ExercisePreview typeId={focusedItem.typeId} constraints={focusedDraft.constraints} height={140} />
                                </div>

                                <div style={S.configWrap}>
                                    {Config ? <Config block={focusedDraft} /> : <p style={S.muted}>Geen instellingen voor dit type.</p>}
                                </div>
                            </>
                        ) : (
                            <p style={S.muted}>Kies links een oefening om in te stellen.</p>
                        )}
                    </div>
                </div>

                <div style={S.footer}>
                    <span style={S.footerCount}>{includedItems.length} oefeningen in curriculum</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.cancelBtn} onClick={onClose}>Sluiten</button>
                        <button style={S.shareBtn(includedItems.length > 0)} onClick={handleShareLink} disabled={includedItems.length === 0}>
                            {flash ? <><Check size={15} /> Gekopieerd</> : 'Deel curriculum-link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } as React.CSSProperties,
    modal: { width: '100%', maxWidth: '1280px', height: '100%', maxHeight: '90vh', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    title: { margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '760px' } as React.CSSProperties,
    closeBtn: { flexShrink: 0, width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    bulkBar: { display: 'flex', gap: '8px', padding: '10px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    bulkBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '12px', borderRadius: '14px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-muted)', fontWeight: 600 } as React.CSSProperties,
    bodyRow: { flex: 1, display: 'flex', minHeight: 0 } as React.CSSProperties,
    list: { width: '360px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border-color)', padding: '12px' } as React.CSSProperties,
    subHead: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: 'var(--text-muted)', padding: '6px 6px 2px 6px', opacity: 0.8 } as React.CSSProperties,
    domGroup: { marginBottom: '12px' } as React.CSSProperties,
    domHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, padding: '4px 6px' } as React.CSSProperties,
    domBulk: { display: 'flex', gap: '4px' } as React.CSSProperties,
    domBulkBtn: { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-muted)' } as React.CSSProperties,
    row: (focused: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', background: focused ? 'var(--bg-input)' : 'transparent' }),
    eyeBtn: (on: boolean, accentVar: string): React.CSSProperties => ({ flexShrink: 0, width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? `var(${accentVar})` : 'var(--border-color)'}`, background: on ? `var(${accentVar})` : 'var(--bg-input)', color: on ? '#fff' : 'var(--text-muted)' }),
    rowLabel: (on: boolean): React.CSSProperties => ({ fontSize: '12px', fontWeight: on ? 700 : 500, color: on ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
    rowVariant: { fontSize: '10px', color: 'var(--text-muted)' } as React.CSSProperties,
    detail: { flex: 1, overflowY: 'auto', padding: '16px 20px' } as React.CSSProperties,
    detailHead: { marginBottom: '12px' } as React.CSSProperties,
    detailTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    detailContext: { fontSize: '12px', color: 'var(--text-muted)' } as React.CSSProperties,
    variantRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' } as React.CSSProperties,
    variantBtn: (active: boolean): React.CSSProperties => ({ padding: '4px 10px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)', background: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }),
    previewWrap: { background: '#fff', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '16px' } as React.CSSProperties,
    configWrap: { borderTop: '1px solid var(--border-color)', paddingTop: '14px' } as React.CSSProperties,
    muted: { fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    footerCount: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 } as React.CSSProperties,
    cancelBtn: { padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' } as React.CSSProperties,
    shareBtn: (enabled: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '6px', cursor: enabled ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 700, border: 'none', background: 'var(--accent-purple)', color: '#fff', opacity: enabled ? 1 : 0.5 }),
};
