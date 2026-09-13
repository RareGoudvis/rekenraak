// The printed opdracht number of every block, keyed by block id.
//
// One function, three call sites (the sheet in App.tsx, the Inspector's subject chip and
// the library thumbnail) — they used to each re-derive the count and had already drifted.
export interface NumberableBlock {
    id: string;
    typeId: string;
    skipNumbering?: boolean;
}

// layout-* furniture is not an opdracht, and a teacher can leave a block out of the count
// as well: neither increments the counter, so the exercises after them keep their numbers.
export function numberBlocks(blocks: readonly NumberableBlock[]): Record<string, number | null> {
    const numbers: Record<string, number | null> = {};
    let n = 0;
    for (const b of blocks) {
        const counted = !b.typeId.startsWith('layout-') && b.skipNumbering !== true;
        if (counted) n += 1;
        numbers[b.id] = counted ? n : null;
    }
    return numbers;
}
