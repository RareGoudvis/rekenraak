import { useMemo } from 'react';
import OefenCatalogue from './OefenCatalogue';
import { listOefenLeaves } from './oefenBuild';

interface Props {
    // A click adds a row: the leaf, optionally an Eenvoudig card's variant constraints and its label.
    onAdd: (leafId: string, constraints?: Record<string, unknown>, label?: string) => void;
    // How often the leaf is already in the session (the count badge).
    isAdded?: (leafId: string) => number;
}

// Placeholder: the Oefenmodus catalogue column until the Eenvoudig / Uitgebreid sidebar lands.
export default function OefenSidebar({ onAdd, isAdded }: Props) {
    const leaves = useMemo(() => listOefenLeaves(), []);
    return (
        <aside className="mac-vibrant app-panel-left" aria-label="Oefeningen" style={S.aside}>
            <OefenCatalogue leaves={leaves} countOf={id => isAdded?.(id) ?? 0} onAdd={leaf => onAdd(leaf.id)} />
        </aside>
    );
}

const S = {
    aside: { width: '286px', minWidth: '286px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } as React.CSSProperties,
};
