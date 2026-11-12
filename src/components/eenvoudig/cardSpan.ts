// What a one-exercise preview can use inside a single-width card: 216px card minus padding and borders, then the frame's own padding.
export const SINGLE_BOX = { w: 172, h: 80 };
// Below this fitted scale the sheet's 13pt text is under ~8pt on screen: a thin, unreadable strip.
export const MIN_READABLE_SCALE = 0.6;

// Double width only helps ink that is limited by the width (not the height) and is shrunk below readable;
// compact sums (scale ~0.8) and tall figures (height-limited) keep their normal card.
export function cardSpanFor(inkW: number, inkH: number): 1 | 2 {
    if (!(inkW > 0) || !(inkH > 0)) return 1;
    const byWidth = SINGLE_BOX.w / inkW;
    const byHeight = SINGLE_BOX.h / inkH;
    return byWidth < byHeight && byWidth < MIN_READABLE_SCALE ? 2 : 1;
}

// Decisions outlive the card component, so closing and reopening a panel shows the final layout at once.
const decided = new Map<string, 1 | 2>();
export const rememberedSpan = (id: string): 1 | 2 => decided.get(id) ?? 1;
export const rememberSpan = (id: string, span: 1 | 2) => { decided.set(id, span); };
