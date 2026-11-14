import type { ReactNode } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { Domain } from '../../config/appstructure';
import { S } from './sidebarStyles';
import type { TreeLeaf, TreeOpen } from './sidebarTreeModel';

// Count the addable leaves under a subdomain, so a header can say how deep it is
// without the teacher scrolling to find out. Placeholders don't count — they can't
// be added.
function countLeaves(sub: Domain['subdomains'][number]): number {
    let n = 0;
    for (const type of sub.types) {
        if (type.children) n += type.children.filter(l => !l.placeholder).length;
        else if (!type.placeholder) n += 1;
    }
    return n;
}

interface Props {
    tree: Domain[];
    search: string;
    open: TreeOpen;
    onLeaf: (leaf: TreeLeaf) => void;
    // Hover handlers per leaf (the editor's preview card).
    hoverOf?: (leaf: TreeLeaf) => Record<string, unknown>;
    // Extra content after a leaf's label (the Oefenmodus count badge).
    leafEnd?: (leafId: string) => ReactNode;
    // The leaf's tooltip; the editor's says it adds one exercise to the sheet.
    leafTitle?: (label: string) => string;
}

const sheetTitle = (label: string) => `${label} toevoegen (één oefening)`;

// The Uitgebreid tree: domain bands, subdomain rows with a count, type accordions and leaves.
export default function SidebarTree({ tree, search, open, onLeaf, hoverOf, leafEnd, leafTitle = sheetTitle }: Props) {
    const { openSubdomain, openTypes, toggleSubdomain, toggleType } = open;
    const isSearching = search.trim().length > 0;
    return (<>
                {tree.length === 0 && isSearching && (
                    <div style={S.noResults}>Geen oefening gevonden voor "{search}".</div>
                )}
                {tree.map((domain) => {
                    const accent = `var(${domain.accentVar})`;
                    // --accent-<domain> has a --domain-<domain>-line/-soft sibling per theme.css;
                    // the domain half of the name is identical, so derive rather than re-map.
                    const domainName = domain.accentVar.replace('--accent-', '');
                    const line = `var(--domain-${domainName}-line)`;
                    const soft = `var(--domain-${domainName}-soft)`;

                    return (
                        <div key={domain.id} style={S.domainWrap}>
                            {/* Domain section header: a full-width accent-tinted band with a
                               dot + the domain name in the domain's accent color. */}
                            <div style={S.sectionHeader(soft, line)}>
                                <span>{domain.label}</span>
                            </div>
                            <div style={S.domainContent(line)}>
                                    {domain.subdomains.map((subdomain) => {
                                        const subOpen = isSearching || openSubdomain === subdomain.id;

                                        return (
                                            <div key={subdomain.id}>
                                                {/* Subdomain header */}
                                                <button
                                                    className="sidebar-row"
                                                    style={S.subdomainBtn(subOpen, accent, subdomain.placeholder)}
                                                    onClick={() => toggleSubdomain(subdomain.id)}
                                                >
                                                    <span style={S.navText}>{subdomain.label}</span>
                                                    <span style={S.countBadge}>{countLeaves(subdomain)}</span>
                                                    <span style={S.chevron(subOpen)}>›</span>
                                                </button>

                                                {/* Subdomain content */}
                                                {subOpen && (
                                                    <div style={S.subdomainContent}>
                                                        {subdomain.types.map((type) => {
                                                            // Placeholder leaf (no children, placeholder flag)
                                                            if (!type.children && type.placeholder) {
                                                                return (
                                                                    <div key={type.id} style={S.placeholderLeaf}>
                                                                        <span style={S.placeholderBadge}>·</span>
                                                                        <span>{type.label}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Leaf type (no children, not placeholder)
                                                            if (!type.children) {
                                                                const leaf: TreeLeaf = { id: type.id, label: type.label, typeId: type.typeId!, defaultConstraints: type.defaultConstraints, instruction: type.instruction };
                                                                return (
                                                                    <button
                                                                        key={type.id}
                                                                        className="sidebar-leaf"
                                                                        style={S.leafBtn}
                                                                        title={leafTitle(type.label)}
                                                                        onClick={() => onLeaf(leaf)}
                                                                        {...hoverOf?.(leaf)}
                                                                    >
                                                                        <span style={S.addBadge}><Plus size={13} weight="bold" /></span>
                                                                        <span>{type.label}</span>
                                                                        {leafEnd?.(type.id)}
                                                                    </button>
                                                                );
                                                            }

                                                            // Accordion type (has children)
                                                            const typeOpen = isSearching || openTypes.has(type.id);
                                                            const isPhAcc = !!type.placeholder;
                                                            return (
                                                                <div key={type.id}>
                                                                    <button
                                                                        className={isPhAcc ? undefined : 'sidebar-row'}
                                                                        style={isPhAcc ? S.placeholderTypeBtn(typeOpen, accent) : S.typeBtn(typeOpen, accent)}
                                                                        onClick={() => toggleType(type.id)}
                                                                    >
                                                                        <span style={S.navText}>{type.label}</span>
                                                                        <span style={S.chevron(typeOpen)}>›</span>
                                                                    </button>

                                                                    {typeOpen && (
                                                                        <div style={S.typeContent}>
                                                                            {type.children.map((leaf) => (
                                                                                leaf.placeholder ? (
                                                                                    <div key={leaf.id} style={S.placeholderLeaf}>
                                                                                        <span style={S.placeholderBadge}>·</span>
                                                                                        <span>{leaf.label}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        key={leaf.id}
                                                                                        className="sidebar-leaf"
                                                                                        style={S.leafBtn}
                                                                                        title={leafTitle(leaf.label)}
                                                                                        onClick={() => onLeaf(leaf)}
                                                                                        {...hoverOf?.(leaf)}
                                                                                    >
                                                                                        <span style={S.addBadge}><Plus size={13} weight="bold" /></span>
                                                                                        <span>{leaf.label}</span>
                                                                                        {leafEnd?.(leaf.id)}
                                                                                    </button>
                                                                                )
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                        </div>
                    );
                })}
    </>);
}
