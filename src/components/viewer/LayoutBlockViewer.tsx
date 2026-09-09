import type { MathBlock } from '../../services/math/types';
import { useBlockWidth } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Sheet furniture rather than exercises: a section rule, writing lines, a squared grid, a
// memory box, a blank page. They carry no generated data — everything comes from
// constraints — but they ride the same registry/viewer machinery as an exercise type, so
// the packer, the width grid and printing all work for them without a special case.
//
// SYNC: kinds here must match layoutDefaults() in exerciseRegistry.ts and the tiers in
// blockLayout.ts.
export type LayoutKind = 'sectie' | 'schrijflijnen' | 'raster' | 'kader' | 'lege-pagina';

const CM = 37.8;   // 1cm at 96dpi — same constant the meten viewers use

export default function LayoutBlockViewer({ block }: Props) {
    const width = useBlockWidth();
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const kind = (c.kind as LayoutKind) ?? 'sectie';

    if (kind === 'sectie') {
        const title = (c.title as string) ?? '';
        const rule = (c.rule as string) ?? 'lijn';
        return (
            <div style={{ width: '100%', padding: '2px 0' }}>
                {rule === 'lijn' && <div style={{ borderTop: '2px solid #000', width: '100%' }} />}
                {rule === 'stippel' && <div style={{ borderTop: '2px dashed #000', width: '100%' }} />}
                {title && (
                    <div style={{
                        fontFamily: "'Azeret Mono', monospace", fontSize: '14px', fontWeight: 700,
                        color: '#000', marginTop: rule === 'geen' ? 0 : '6px',
                    }}>{title}</div>
                )}
            </div>
        );
    }

    if (kind === 'schrijflijnen') {
        const count = Math.max(1, Number(c.lineCount ?? 6));
        const spacing = Number(c.lineSpacing ?? 10);      // mm between lines
        const style = (c.lineStyle as string) ?? 'enkel';
        const gap = (spacing / 10) * CM;
        return (
            <div style={{ width: '100%' }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} style={{ height: `${gap}px`, position: 'relative' }}>
                        {/* 'schrijf' adds the dotted midline primary schools use for letter height. */}
                        {style === 'schrijf' && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dotted #999' }} />
                        )}
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderBottom: '1px solid #000' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (kind === 'raster') {
        const cellMm = Number(c.cellMm ?? 10);
        const rows = Math.max(1, Number(c.rows ?? 8));
        const cell = (cellMm / 10) * CM;
        // Fit whole cells to the column rather than stretching them: a squared grid whose
        // squares are not square is useless for the thing it is used for.
        const cols = Math.max(1, Math.floor(width / cell));
        return (
            <div style={{
                width: `${cols * cell}px`,
                height: `${rows * cell}px`,
                border: '1px solid #000',
                backgroundImage:
                    'linear-gradient(to right, #bbb 1px, transparent 1px), linear-gradient(to bottom, #bbb 1px, transparent 1px)',
                backgroundSize: `${cell}px ${cell}px`,
            }} />
        );
    }

    if (kind === 'kader') {
        const title = (c.title as string) ?? 'Onthoud';
        const body = (c.body as string) ?? '';
        const emphasis = (c.emphasis as string) ?? 'kader';
        return (
            <div style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                border: emphasis === 'geen' ? 'none' : '2px solid #000',
                borderRadius: emphasis === 'rond' ? '10px' : 0,
                background: emphasis === 'grijs' ? '#f2f2f2' : 'transparent',
                fontFamily: "'Azeret Mono', monospace", color: '#000',
            }}>
                {title && <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: body ? '6px' : 0 }}>{title}</div>}
                {body && <div style={{ fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{body}</div>}
            </div>
        );
    }

    // lege-pagina: deliberately empty. Its height is what makes the packer give it a page.
    return <div style={{ width: '100%' }} aria-hidden="true" />;
}
