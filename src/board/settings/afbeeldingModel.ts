import type { BoardWidget } from '../boardTypes';
import { bool, custom, num, oneOf, readProps, text, type ModelOf } from './propSchema';

// Defaults reproduce the pre-settings image card: full width, natural height, 8px corners.
// Frame colour = the baseline accentkleur (props.accent), else black.
export const AFBEELDING_SCHEMA = {
    src: custom<string>('', (v) => (typeof v === 'string' ? v : undefined)),   // dataURL (content)
    fit: oneOf('natuurlijk', ['natuurlijk', 'passend', 'vullend', 'uitrekken'] as const),
    ratio: oneOf('4:3', ['4:3', '1:1', '16:9', '3:4'] as const),   // frame shape when fit ≠ natuurlijk
    radius: num(8, 0, 60, true),
    borderWidth: num(0, 0, 16, true),
    caption: text('', 200),
    captionPos: oneOf('onder', ['onder', 'boven', 'over'] as const),
    captionSize: num(18, 10, 48, true),
    opacity: num(1, 0.1, 1),
    flipH: bool(false),
    flipV: bool(false),
    rotate: oneOf(0, [0, 90, 180, 270] as const),
};
export type AfbeeldingModel = ModelOf<typeof AFBEELDING_SCHEMA>;
export const AFBEELDING_CONTENT_KEYS = ['src'] as const;

export const afbeeldingProps = (w: BoardWidget): AfbeeldingModel => readProps(AFBEELDING_SCHEMA, w.props);

export const RATIO: Record<AfbeeldingModel['ratio'], number> = { '4:3': 4 / 3, '1:1': 1, '16:9': 16 / 9, '3:4': 3 / 4 };

// The untouched default: render exactly the old <img> so existing boards don't move a pixel.
export const isPlainImage = (m: AfbeeldingModel) =>
    m.fit === 'natuurlijk' && m.rotate === 0 && !m.flipH && !m.flipV && m.borderWidth === 0 && m.opacity === 1;
