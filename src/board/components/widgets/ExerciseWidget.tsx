import { EXERCISE_UI } from '../../../config/exerciseUI';
import { BlockWidthProvider } from '../../../components/viewer/BlockWidthContext';
import { exerciseViewerWidth, EXERCISE_PAD_X } from '../../settings/baseProps';
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
        <div style={{ padding: `12px ${EXERCISE_PAD_X}px` }}>
            <BlockWidthProvider value={exerciseViewerWidth(widget)}>
                <Viewer block={block} showSolutions={!!widget.showAnswer} />
            </BlockWidthProvider>
        </div>
    );
}
