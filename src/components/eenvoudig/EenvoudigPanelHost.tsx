import { useCallback } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { OP_NAME } from './comboModel';
import ComboBuilder from './ComboBuilder';
import TopicPanel from './TopicPanel';
import EenvoudigDrawer from './EenvoudigDrawer';
import { useAsideRight, useDrawerDismiss } from './drawerHooks';
import { useEenvoudigData } from './useEenvoudigData';

export default function EenvoudigPanelHost() {
    const panel = useWorksheetStore(s => s.eenvoudigPanel);
    const setPanel = useWorksheetStore(s => s.setEenvoudigPanel);
    const data = useEenvoudigData();
    const left = useAsideRight();
    const close = useCallback(() => setPanel(null), [setPanel]);
    useDrawerDismiss(panel !== null, close);

    if (!panel) return null;
    const title = panel.kind === 'combo'
        ? (panel.editBlockId ? 'Combinatie aanpassen' : panel.only ? `Zelf samenstellen: ${OP_NAME[panel.only]}` : 'Combinatie maken')
        : panel.topicId.replace(' · ', ': ');
    const key = panel.kind === 'combo' ? `combo|${panel.only ?? ''}|${panel.editBlockId ?? ''}` : panel.topicId;

    return (
        <EenvoudigDrawer left={left} title={title} wide={panel.kind === 'combo'} onClose={close}>
            {panel.kind === 'combo'
                ? <ComboBuilder key={key} only={panel.only} editBlockId={panel.editBlockId} />
                : data ? <TopicPanel key={key} topicId={panel.topicId} data={data} /> : <p className="ez-wait">Laden...</p>}
        </EenvoudigDrawer>
    );
}
