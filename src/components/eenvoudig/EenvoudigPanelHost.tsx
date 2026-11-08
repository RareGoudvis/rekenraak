import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { OP_NAME } from './comboModel';
import ComboBuilder from './ComboBuilder';
import TopicPanel from './TopicPanel';
import { useEenvoudigData } from './useEenvoudigData';

// The panel is an overlay beside the left sidebar: it follows the sidebar's own right edge (the sidebar narrows at small widths).
function useAsideRight(): number {
    const [right, setRight] = useState(286);
    useEffect(() => {
        const aside = document.querySelector('aside.app-panel-left');
        if (!aside) return;
        const measure = () => setRight(Math.round(aside.getBoundingClientRect().right));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(aside);
        window.addEventListener('resize', measure);
        return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);
    return right;
}

export default function EenvoudigPanelHost() {
    const panel = useWorksheetStore(s => s.eenvoudigPanel);
    const setPanel = useWorksheetStore(s => s.setEenvoudigPanel);
    const data = useEenvoudigData();
    const left = useAsideRight();
    const open = panel !== null;

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            // The sidebar keeps the panel open (its rows toggle it themselves); a click anywhere else dismisses it.
            if (!(e.target as Element | null)?.closest?.('.ez-drawer, aside.app-panel-left')) setPanel(null);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open, setPanel]);

    if (!panel) return null;
    const title = panel.kind === 'combo'
        ? (panel.editBlockId ? 'Combinatie aanpassen' : panel.only ? `Zelf samenstellen: ${OP_NAME[panel.only]}` : 'Combinatie maken')
        : panel.topicId.replace(' · ', ': ');
    const key = panel.kind === 'combo' ? `combo|${panel.only ?? ''}|${panel.editBlockId ?? ''}` : panel.topicId;

    return createPortal(
        <div className={`ez-drawer no-print${panel.kind === 'combo' ? ' ez-wide' : ''}`} style={{ left }} role="dialog" aria-label={title}>
            <div className="ez-head"><h2>{title}</h2></div>
            <button className="ez-x" type="button" aria-label="Sluiten" onClick={() => setPanel(null)}>{'×'}</button>
            <div className="ez-body">
                {panel.kind === 'combo'
                    ? <ComboBuilder key={key} only={panel.only} editBlockId={panel.editBlockId} />
                    : data ? <TopicPanel key={key} topicId={panel.topicId} data={data} /> : <p className="ez-wait">Laden...</p>}
            </div>
        </div>,
        document.body,
    );
}
