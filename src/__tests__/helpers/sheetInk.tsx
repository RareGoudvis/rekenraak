import type { ReactNode } from 'react';
import { ScaledBlock } from '../../components/viewer/ScaledBlock';
import { FULL_BLOCK_WIDTH_PX } from '../../components/viewer/BlockWidthContext';

// The one place a test sets the region ink around a block: the sheet's own path, the
// ScaledBlock wrapper carrying docSettings.oefeningenCustom.
export function SheetInk({ color, children }: { color: string; children: ReactNode }) {
    return <ScaledBlock scale={1} availableWidthPx={FULL_BLOCK_WIDTH_PX} customStyle={{ color }}>{children}</ScaledBlock>;
}
