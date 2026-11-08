// Adding a card to the sheet: the one place that turns a variant into a block, so the panel and the tests agree.

import type { CardVariant } from '../../config/eenvoudig/cards';
import { resolveCard } from '../../config/eenvoudig/resolveCard';
import { useWorksheetStore } from '../../store/useWorksheetStore';

export function addCardToSheet(v: CardVariant): void {
    const r = resolveCard(v);
    const st = useWorksheetStore.getState();
    st.addBlockFromType(r.typeId, r.label, r.constraints, { exact: true, count: r.count, cardId: v.id, leafId: r.leafId, instruction: r.instruction });
    st.setEenvoudigPanel(null);
}
