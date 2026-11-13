// Two short strokes at (x, y), pointing along a curve's last direction (from its control point (cx, cy)).
export function arrowHead(cx: number, cy: number, x: number, y: number, size = 9): string {
    const a = Math.atan2(y - cy, x - cx);
    const p = (da: number) => `${x - size * Math.cos(a + da)},${y - size * Math.sin(a + da)}`;
    return `M${p(0.5)} L${x},${y} L${p(-0.5)}`;
}
