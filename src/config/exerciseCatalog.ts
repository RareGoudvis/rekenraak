import { APP_STRUCTURE, type InstructionFn } from './appstructure';
import { REGISTRY } from './exerciseRegistry';

// ── Flat, addable catalog of every IMPLEMENTED exercise type ──────────────────
// Walks APP_STRUCTURE, drops placeholders / types with no generator, and groups
// leaves that share a typeId into one row with selectable variants (e.g. the
// 3 number-type leaves of hr-std-optellen, the 5 subType leaves of breuken).
// Pure data — consumed by the Mass-add modal and reusable elsewhere.

export interface CatalogVariant {
    key: string;                              // leaf.id — stable, unique
    label: string;                            // variant display label
    constraints: Record<string, unknown>;     // leaf.defaultConstraints (the override)
    instruction?: string | InstructionFn;     // leaf.instruction — the block's default opdracht-titel
}

export interface CatalogItem {
    typeId: string;
    label: string;        // family/row label, disambiguated
    context: string;      // subdomain tag (e.g. "Cijferen", "Geld")
    domainId: string;     // top-level domain id (for the filter bar)
    domainLabel: string;
    accentVar: string;    // domain accent CSS var
    variants: CatalogVariant[];   // ≥1; >1 → render a variant toggle
}

interface RawLeaf {
    typeId: string;
    leafId: string;
    leafLabel: string;
    constraints: Record<string, unknown>;
    instruction?: string | InstructionFn;
    parentLabel: string | null;   // accordion parent label, null for direct leaves
    subdomainLabel: string;
    domainId: string;
    domainLabel: string;
    accentVar: string;
}

// Implemented = has a real typeId, isn't a placeholder, and exists in the registry.
function implemented(typeId: string | undefined, placeholder?: boolean): typeId is string {
    return !!typeId && !placeholder && typeId !== '__placeholder__' && !!REGISTRY[typeId];
}

function collectLeaves(): RawLeaf[] {
    const leaves: RawLeaf[] = [];
    for (const domain of APP_STRUCTURE) {
        for (const sub of domain.subdomains) {
            for (const type of sub.types) {
                if (type.children) {
                    for (const leaf of type.children) {
                        if (!implemented(leaf.typeId, leaf.placeholder)) continue;
                        leaves.push({
                            typeId: leaf.typeId, leafId: leaf.id, leafLabel: leaf.label,
                            constraints: leaf.defaultConstraints ?? {},
                            instruction: leaf.instruction,
                            parentLabel: type.label, subdomainLabel: sub.label,
                            domainId: domain.id, domainLabel: domain.label, accentVar: domain.accentVar,
                        });
                    }
                } else if (implemented(type.typeId, type.placeholder)) {
                    leaves.push({
                        typeId: type.typeId, leafId: type.id, leafLabel: type.label,
                        constraints: type.defaultConstraints ?? {},
                        instruction: type.instruction,
                        parentLabel: null, subdomainLabel: sub.label,
                        domainId: domain.id, domainLabel: domain.label, accentVar: domain.accentVar,
                    });
                }
            }
        }
    }
    return leaves;
}

// Group leaves by typeId (first-seen order preserved). Disambiguate the row label:
// multi-variant rows use the family/parent label; single-variant rows prefix the
// parent (e.g. "Optellen — Natuurlijke getallen") so the 8 cijferen rows stay distinct.
export function buildCatalog(): CatalogItem[] {
    const byType = new Map<string, RawLeaf[]>();
    for (const leaf of collectLeaves()) {
        const arr = byType.get(leaf.typeId);
        if (arr) arr.push(leaf);
        else byType.set(leaf.typeId, [leaf]);
    }

    const items: CatalogItem[] = [];
    for (const [typeId, group] of byType) {
        const first = group[0];
        const multi = group.length > 1;
        // A typeId spanning >1 parent accordion (e.g. klok under Analoge/Digitale klok)
        // would otherwise show duplicate variant labels ("Lezen"/"Lezen") — prefix the parent.
        const multiParent = new Set(group.map(l => l.parentLabel ?? '')).size > 1;
        const label = multiParent
            ? first.subdomainLabel
            : multi
                ? (first.parentLabel ?? first.subdomainLabel)
                : (first.parentLabel ? `${first.parentLabel} — ${first.leafLabel}` : first.leafLabel);
        items.push({
            typeId,
            label,
            context: first.subdomainLabel,
            domainId: first.domainId,
            domainLabel: first.domainLabel,
            accentVar: first.accentVar,
            variants: group.map(l => ({
                key: l.leafId,
                label: multiParent && l.parentLabel ? `${l.parentLabel} · ${l.leafLabel}` : l.leafLabel,
                constraints: l.constraints,
                instruction: l.instruction,
            })),
        });
    }
    return items;
}

// Distinct domains (in catalog/APP_STRUCTURE order) that actually have ≥1 item,
// so the filter bar never shows a dead chip for an all-placeholder domain.
export function catalogDomains(items: CatalogItem[]): Array<{ id: string; label: string; accentVar: string }> {
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string; accentVar: string }> = [];
    for (const it of items) {
        if (seen.has(it.domainId)) continue;
        seen.add(it.domainId);
        out.push({ id: it.domainId, label: it.domainLabel, accentVar: it.accentVar });
    }
    return out;
}
