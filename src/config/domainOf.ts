import { APP_STRUCTURE } from './appstructure';
import { PRINT_FILLS } from './printPalette';

// One pale fill per top-level domain (mimics the colour-coded Flemish methodes). Values are the
// existing PRINT_FILLS swatches so the inspector shows the same colours. Furniture never gets one.
const [, GREY, BLUE, RED, GREEN, YELLOW] = PRINT_FILLS;
export const DOMAIN_FILL: Record<string, string> = {
    getallenkennis: BLUE,
    bewerkingen: RED,
    meetkunde: GREEN,
    'meten-metend-rekenen': YELLOW,
    vraagstukken: GREY,
};

const byLeaf = new Map<string, string>();
const byType = new Map<string, string>();
for (const d of APP_STRUCTURE) {
    for (const sub of d.subdomains) {
        for (const t of sub.types) {
            byLeaf.set(t.id, d.id);
            if (t.typeId && !byType.has(t.typeId)) byType.set(t.typeId, d.id);
            for (const l of t.children ?? []) {
                byLeaf.set(l.id, d.id);
                if (!byType.has(l.typeId)) byType.set(l.typeId, d.id);
            }
        }
    }
}

// leafId first; old sheets / mass-add have none, so fall back to the first leaf with that typeId.
export function domainIdOf(leafId: string | undefined, typeId: string): string | undefined {
    return (leafId && byLeaf.get(leafId)) || byType.get(typeId);
}

export function domainFillOf(leafId: string | undefined, typeId: string): string | undefined {
    const d = domainIdOf(leafId, typeId);
    return d ? DOMAIN_FILL[d] : undefined;
}
