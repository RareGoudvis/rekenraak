import { useEffect } from 'react';
import { X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { useBoardStore } from '../useBoardStore';
import { regenerateBoardBlock } from '../boardBlocks';
import type { BoardWidget } from '../boardTypes';

interface Props {
    widget: BoardWidget;   // selected exercise widget (kind === 'exercise', block set)
}

// Right flyout for the selected exercise widget. Board policy: no opdracht-titel
// and no score controls — only aantal, witruimte, tekstgrootte + the type's REAL
// config plugin, mounted via the draft-block mirror (curriculum-builder pattern:
// updateBlockSettings routes draft ids to draftBlocks, no history/lock).
export default function BoardInspector({ widget }: Props) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const setDraftBlocks = useWorksheetStore((s) => s.setDraftBlocks);
    const clearDraftBlocks = useWorksheetStore((s) => s.clearDraftBlocks);
    // Live draft mirror — the config plugin edits THIS object in the worksheet store.
    const draft = useWorksheetStore((s) => s.draftBlocks.find(b => b.id === widget.block?.id));

    const widgetId = widget.id;
    const blockId = widget.block?.id;

    // Seed the mirror on select; copy every draft edit back into the board widget;
    // tear the mirror down on deselect/unmount.
    useEffect(() => {
        if (!blockId) return;
        const board = useBoardStore.getState();
        const w = board.pages[board.activePageIdx].widgets.find(x => x.id === widgetId);
        if (!w?.block) return;
        useWorksheetStore.getState().setDraftBlocks([w.block]);
        const unsub = useWorksheetStore.subscribe((s) => {
            const d = s.draftBlocks.find(b => b.id === blockId);
            const bs = useBoardStore.getState();
            const cur = bs.pages[bs.activePageIdx].widgets.find(x => x.id === widgetId);
            // Reference check: only copy real edits back (avoids write loops).
            if (d && cur && cur.block !== d) bs.updateWidget(widgetId, { block: d });
        });
        return () => { unsub(); useWorksheetStore.getState().clearDraftBlocks(); };
    }, [widgetId, blockId]);

    const block = draft ?? widget.block;
    if (!block) return null;
    const Config = EXERCISE_UI[block.typeId]?.Config;

    const regenerate = () => {
        const fresh = regenerateBoardBlock(block);
        updateWidget(widgetId, { block: fresh });
        setDraftBlocks([fresh]);
    };

    const patchBlock = (patch: Partial<typeof block>) => {
        // Route through the draft mirror so plugin edits and ours share one path.
        useWorksheetStore.getState().updateBlockSettings(block.id, patch);
    };

    return (
        <div style={S.panel}>
            <div style={S.head}>
                <span style={S.title}>Instellingen</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten"
                    onClick={() => { clearDraftBlocks(); selectWidget(null); }}>
                    <X size={18} />
                </button>
            </div>

            <div style={S.scroll}>
                {/* Slim board-blok section — deliberately NO titel + NO score. */}
                <div style={S.section}>
                    <label style={S.label}>Aantal oefeningen ({block.numberOfExercises})</label>
                    <input type="range" min={1} max={12} step={1} value={block.numberOfExercises}
                        style={S.slider}
                        onChange={(e) => patchBlock({ numberOfExercises: Number(e.target.value) })} />

                    <label style={S.label}>Witruimte ({block.verticalSpacing}px)</label>
                    <input type="range" min={4} max={40} step={2} value={block.verticalSpacing}
                        style={S.slider}
                        onChange={(e) => patchBlock({ verticalSpacing: Number(e.target.value) })} />

                    <label style={S.label}>Tekstgrootte ({Math.round((widget.scale ?? 1) * 100)}%)</label>
                    <input type="range" min={0.6} max={2} step={0.1} value={widget.scale ?? 1}
                        style={S.slider}
                        onChange={(e) => updateWidget(widgetId, { scale: Number(e.target.value) })} />
                </div>

                {/* The type's real config plugin, edits the draft mirror. */}
                {Config && <div style={S.section}><Config block={block} /></div>}
            </div>

            <button type="button" className="ui-hover" style={S.genBtn} onClick={regenerate}>
                <ArrowCounterClockwise size={16} /> Genereer nieuwe oefeningen
            </button>
        </div>
    );
}

const S = {
    panel: {
        position: 'absolute', top: '12px', right: '12px', bottom: '12px', width: '320px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden',
    } as React.CSSProperties,
    head: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { fontSize: '14px', fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)' } as React.CSSProperties,
    closeBtn: {
        width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 0 } as React.CSSProperties,
    section: { marginBottom: '16px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0 4px' } as React.CSSProperties,
    slider: { width: '100%' } as React.CSSProperties,
    genBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        margin: '10px 14px 14px', height: '44px', borderRadius: '10px', flexShrink: 0,
        border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
        color: 'var(--text-main)', fontSize: '13px', cursor: 'pointer', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
};
