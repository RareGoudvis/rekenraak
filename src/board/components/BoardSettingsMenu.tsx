import { Trash } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import BackgroundPicker from './BackgroundPicker';

// The rail's Bordinstellingen: only what has no other home (owner: pages, saving and full screen
// already sit in the top-right pill). Left: the achtergrond tiles. Right: raster, bord wissen.
export default function BoardSettingsMenu({ onDone }: { onDone: () => void }) {
    const gridSnap = useBoardStore((s) => s.gridSnap);
    const setGridSnap = useBoardStore((s) => s.setGridSnap);
    const gridSize = useBoardStore((s) => s.gridSize);
    const setGridSize = useBoardStore((s) => s.setGridSize);

    const handleClearBoard = () => {
        if (!window.confirm('Het hele bord wissen (alle pagina’s)?')) return;
        useBoardStore.getState().resetBoard();
        onDone();
    };

    return (
        <div style={S.root}>
            <div style={S.col}>
                <BackgroundPicker />
            </div>
            <div style={{ ...S.col, ...S.rightCol }}>
                <div style={S.section}>Raster uitlijnen</div>
                <button type="button" className="ui-hover" aria-pressed={gridSnap} style={{ ...S.item, ...(gridSnap ? S.itemOn : {}) }}
                    onClick={() => setGridSnap(!gridSnap)}>
                    {gridSnap ? 'Uitlijnen: aan' : 'Uitlijnen: uit'}
                </button>
                <div style={S.row}>
                    {[20, 40, 80].map(px => (
                        <button key={px} type="button" className="ui-hover" aria-pressed={gridSize === px && gridSnap}
                            style={{ ...S.item, flex: 1, justifyContent: 'center', ...(gridSize === px && gridSnap ? S.itemOn : {}) }}
                            onClick={() => { setGridSize(px); setGridSnap(true); }}>
                            {px} px
                        </button>
                    ))}
                </div>

                <div style={S.divider} />
                <button type="button" className="ui-hover" style={{ ...S.item, color: 'var(--danger)' }} onClick={handleClearBoard}>
                    <Trash size={18} /> Bord wissen
                </button>
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', gap: '12px', alignItems: 'flex-start' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    rightCol: { width: '220px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: '2px' } as React.CSSProperties,
    section: {
        padding: '10px 6px 4px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', userSelect: 'none',
    } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '40px', padding: '0 10px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2).
    itemOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    divider: { height: '1px', background: 'var(--border-color)', margin: '6px 4px' } as React.CSSProperties,
};
