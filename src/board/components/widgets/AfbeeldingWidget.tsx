import type { BoardWidget } from '../../boardTypes';

// Uploaded image (dataURL in props.src — serializes with the board file).
export default function AfbeeldingWidget({ widget }: { widget: BoardWidget }) {
    const src = String(widget.props?.src ?? '');
    if (!src) return <div style={{ padding: '16px', background: '#fff', borderRadius: '8px' }}>Geen afbeelding</div>;
    return <img src={src} alt="" style={{ width: '100%', display: 'block', borderRadius: '8px' }} draggable={false} />;
}
