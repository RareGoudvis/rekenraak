import { EXERCISE_UI } from '../../../config/exerciseUI';
import type { BoardWidget } from '../../boardTypes';

// A Rekenraak exercise block as a board widget: mounts the registry Viewer
// unchanged. White "paper" card regardless of board color — viewers assume a
// paper background (black text, print palette).
export default function ExerciseWidget({ widget }: { widget: BoardWidget }) {
    const block = widget.block;
    const Viewer = block ? EXERCISE_UI[block.typeId]?.Viewer : undefined;
    if (!block || !Viewer) {
        return <div style={{ padding: '16px', background: '#fff', borderRadius: '8px' }}>Onbekend oefeningtype</div>;
    }
    return (
        <div style={{
            background: '#ffffff', borderRadius: '8px', padding: '14px 16px',
            border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}>
            <Viewer block={block} showSolutions={!!widget.showAnswer} />
        </div>
    );
}
