import { useMemo } from 'react';
import { Sparkle, ArrowsClockwise, Wrench } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import ModalShell from '../ui/ModalShell';
import ExercisePreview from '../shared/ExercisePreview';
import { RELEASE_NOTES, KIND_ORDER, type ReleaseKind, type ReleaseNote, type ReleaseExample } from '../../config/releaseNotes';
import { seedLeafConstraints } from '../../config/baseSettings';
import { flattenLeaves } from '../../config/appstructure';

const KIND_LABEL: Record<ReleaseKind, { label: string; icon: Icon }> = {
    nieuw: { label: 'Nieuw', icon: Sparkle },
    gewijzigd: { label: 'Gewijzigd', icon: ArrowsClockwise },
    opgelost: { label: 'Opgelost', icon: Wrench },
};

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// 'YYYY-MM' → "november 2026", 'YYYY-MM-DD' → "30 november 2026".
function formatDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const month = MONTHS[(m ?? 1) - 1] ?? '';
    return d ? `${d} ${month} ${y}` : `${month} ${y}`;
}

// "Wat is er nieuw": every release-notes entry, newest first, its items grouped by kind; an
// exercise item shows a live preview of its sidebar leaf (throwaway block, no store writes).
export default function ReleaseNotesModal({ onClose }: { onClose: () => void }) {
    return (
        <ModalShell onClose={onClose} ariaLabel="Wat is er nieuw" variant="sheet" maxWidth={680}>
            <div style={S.scroll}>
                <h2 style={S.title}>Wat is er nieuw</h2>
                {RELEASE_NOTES.map((note, i) => <NoteSection key={note.version} note={note} divider={i > 0} />)}
            </div>
        </ModalShell>
    );
}

function NoteSection({ note, divider }: { note: ReleaseNote; divider: boolean }) {
    return (
        <section style={divider ? { ...S.section, ...S.sectionDivider } : S.section} aria-label={`Versie ${note.version}`}>
            <p style={S.meta}>Versie {note.version} · {formatDate(note.date)}</p>
            <p style={S.summary}>{note.summary}</p>
            {KIND_ORDER.map((kind) => {
                const items = note.items.filter(it => it.kind === kind);
                if (items.length === 0) return null;
                const { label, icon: KindIcon } = KIND_LABEL[kind];
                return (
                    <div key={kind} style={S.group}>
                        <h3 style={S.groupTitle}>
                            <KindIcon size={16} weight="bold" aria-hidden="true" />
                            {label}
                        </h3>
                        <ul style={S.list}>
                            {items.map((it) => (
                                <li key={it.text} style={S.item}>
                                    <span>{it.text}</span>
                                    {it.example && <ExampleCard example={it.example} />}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}

function ExampleCard({ example }: { example: ReleaseExample }) {
    const { leafId, grade, constraints: extra, count, height, before, after } = example;
    const seeded = useMemo(() => seedLeafConstraints(leafId, grade ?? null, extra), [leafId, grade, extra]);
    const where = useMemo(() => {
        const leaf = flattenLeaves().find(l => l.id === leafId);
        // The last two path steps are what the sidebar shows ("Gemengd › Natuurlijke getallen").
        return leaf ? leaf.path.split(' › ').slice(-2).join(' › ') : '';
    }, [leafId]);
    if (!seeded) return null;
    return (
        <div style={S.example}>
            <div style={S.exampleHead}>
                <span style={S.exampleWhere}>
                    Voorbeeld: {where}{grade ? ` · leerjaar ${grade}` : ''}
                </span>
                {(before || after) && (
                    <span style={S.beforeAfter}>
                        {before && <><span style={S.beforeLabel}>Eerst:</span> {before}</>}
                        {before && after && <span aria-hidden="true"> → </span>}
                        {after && <><strong>Nu:</strong> {after}</>}
                    </span>
                )}
            </div>
            <ExercisePreview typeId={seeded.typeId} constraints={seeded.constraints} count={count ?? 1} height={height ?? 130} />
        </div>
    );
}

const S = {
    scroll: {
        padding: 'var(--sp-6) clamp(var(--sp-4), 5vw, var(--sp-8))', overflowY: 'auto',
        fontFamily: 'var(--font-ui)', color: 'var(--text-main)',
    },
    // Right padding keeps the title clear of ModalShell's absolute close button.
    title: { margin: '0 var(--sp-10) var(--sp-1) 0', fontSize: 'var(--text-xl)', fontWeight: 700 },
    section: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' },
    sectionDivider: { marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-6)', borderTop: '1px solid var(--separator)' },
    meta: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' },
    summary: { margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.5 },
    group: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' },
    groupTitle: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', margin: 0,
        fontSize: 'var(--text-md)', fontWeight: 600,
    },
    list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' },
    item: {
        display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
        paddingLeft: 'var(--sp-6)', fontSize: 'var(--text-base)', lineHeight: 1.5,
    },
    example: {
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
    },
    exampleHead: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 'var(--sp-3)', rowGap: 'var(--sp-1)',
        padding: 'var(--sp-2) var(--sp-3)', background: 'var(--bg-surface-2)',
        borderBottom: '1px solid var(--separator)', fontSize: 'var(--text-sm)', lineHeight: 1.4,
    },
    exampleWhere: { color: 'var(--text-muted)' },
    beforeAfter: { color: 'var(--text-main)' },
    beforeLabel: { color: 'var(--text-muted)' },
} satisfies Record<string, React.CSSProperties>;
