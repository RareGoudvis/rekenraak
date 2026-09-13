// The printed opdracht number of every block, keyed by block id.
//
// One function, three call sites (the sheet in App.tsx, the Inspector's subject chip and
// the library thumbnail) — they used to each re-derive the count and had already drifted.
export interface NumberableBlock {
    id: string;
    typeId: string;
    skipNumbering?: boolean;
    showInstruction?: boolean;
}

// layout-* furniture is not an opdracht, and a teacher can leave a block out of the count
// as well: neither increments the counter, so the exercises after them keep their numbers.
export function numberBlocks(blocks: readonly NumberableBlock[]): Record<string, number | null> {
    const numbers: Record<string, number | null> = {};
    let n = 0;
    for (const b of blocks) {
        // skipNumbering only means something while the title row is hidden — belt and
        // braces against it surviving a re-enable of showInstruction (see Inspector.tsx).
        const skip = b.skipNumbering === true && b.showInstruction === false;
        const counted = !b.typeId.startsWith('layout-') && !skip;
        if (counted) n += 1;
        numbers[b.id] = counted ? n : null;
    }
    return numbers;
}
