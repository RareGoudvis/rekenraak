import type { ReactNode } from 'react';

// The one place a test sets the region ink around a block; a later package wires the
// teacher's ink colour onto the same wrapper on the sheet.
export function SheetInk({ color, children }: { color: string; children: ReactNode }) {
    return <div style={{ color }}>{children}</div>;
}
