// The Uitgebreid tree's filters and open state, shared by the editor's sidebar and the Oefenmodus catalogue.

import { useState } from 'react';
import { APP_STRUCTURE, type Domain, type InstructionFn } from '../../config/appstructure';
import { leafAllowedForGrade, type Leerjaar } from '../../config/gradePresets';

// What a leaf click hands on: the sidebar leaf as APP_STRUCTURE declares it.
export interface TreeLeaf {
    id: string;
    label: string;
    typeId: string;
    defaultConstraints?: Record<string, unknown>;
    instruction?: string | InstructionFn;
}

// Walk the domain tree keeping only entries whose label matches the search needle.
// A parent survives when any of its descendants match. Returns the filtered tree.
export function filterTree(domains: Domain[], query: string): Domain[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return domains;
    const result: Domain[] = [];
    for (const dom of domains) {
        const subs = [];
        for (const sub of dom.subdomains) {
            const types = [];
            for (const type of sub.types) {
                if (type.children) {
                    const kids = type.children.filter(l => l.label.toLowerCase().includes(needle));
                    if (kids.length > 0 || type.label.toLowerCase().includes(needle)) {
                        types.push({ ...type, children: kids.length > 0 ? kids : type.children });
                    }
                } else if (type.label.toLowerCase().includes(needle)) {
                    types.push(type);
                }
            }
            if (types.length > 0 || sub.label.toLowerCase().includes(needle)) {
                subs.push({ ...sub, types });
            }
        }
        if (subs.length > 0 || dom.label.toLowerCase().includes(needle)) {
            result.push({ ...dom, subdomains: subs });
        }
    }
    return result;
}

// Soft leerjaar filter: drop leaves above the chosen grade and prune now-empty
// parents. grade == null → unchanged (Alle leerjaren).
export function filterByGrade(domains: Domain[], grade: Leerjaar | null): Domain[] {
    if (grade == null) return domains;
    const result: Domain[] = [];
    for (const dom of domains) {
        const subs = [];
        for (const sub of dom.subdomains) {
            const types = [];
            for (const type of sub.types) {
                if (type.children) {
                    const kids = type.children.filter(l => leafAllowedForGrade(l, grade));
                    if (kids.length > 0) types.push({ ...type, children: kids });
                } else if (leafAllowedForGrade(type, grade)) {
                    types.push(type);
                }
            }
            if (types.length > 0) subs.push({ ...sub, types });
        }
        if (subs.length > 0) result.push({ ...dom, subdomains: subs });
    }
    return result;
}

export interface TreeOpen {
    openSubdomain: string | null;
    openTypes: Set<string>;
    toggleSubdomain: (id: string) => void;
    toggleType: (id: string) => void;
}

// Kept by the caller, so the open subdomain survives a tab switch that unmounts the tree.
export function useTreeOpen(isSearching: boolean): TreeOpen {
    const [openSubdomain, setOpenSubdomain] = useState<string | null>(null);
    // Multiple type-accordions can be open at once — opening a subdomain expands them all.
    const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());

    const toggleSubdomain = (id: string) => {
        if (isSearching) return;  // tree is force-expanded during search
        if (openSubdomain === id) { setOpenSubdomain(null); setOpenTypes(new Set()); return; }
        setOpenSubdomain(id);
        // Auto-expand every accordion type under this subdomain (fewer clicks).
        const sub = APP_STRUCTURE.flatMap(d => d.subdomains).find(s => s.id === id);
        const typeIds = (sub?.types ?? []).filter(t => t.children).map(t => t.id);
        setOpenTypes(new Set(typeIds));
    };

    const toggleType = (id: string) => {
        if (isSearching) return;
        setOpenTypes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    return { openSubdomain, openTypes, toggleSubdomain, toggleType };
}

