import type { ArenaKind } from './arenaPlaceholder';

// TEMPORARY: a plain backdrop until ./arenas (r5/arenas) lands.
export default function Arena({ kind }: { kind: ArenaKind; impact: number; side: 'left' | 'right' | null }) {
    return (
        <svg className="tv-arena-stub" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <rect className={`tv-stub-wall is-${kind}`} width="1600" height="560" />
            <rect className="tv-stub-floor" y="560" width="1600" height="140" />
        </svg>
    );
}
