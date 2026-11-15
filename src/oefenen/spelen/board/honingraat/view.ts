import { useEffect, useState } from 'react';
import type { SkinProps } from '../../skins/types';
import { answerFace, cardLines, lineChars, sumFace, type BoardFace, type SpelBoard } from '../board';

// The comb's and the meadow's shared rules: a cell's texts and how the bee follows the session's verdicts.

export const HEX = '50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7';

export const faceText = (face: BoardFace) => (face.kind === 'text' ? face.text : face.label);

// The bee's resting spot before the first find: beside the board's left edge, where it flew in from.
export const BEE_START = { x: -0.3 } as const;

export interface ViewProps extends Pick<SkinProps, 'phase' | 'onBoardPick' | 'reducedMotion' | 'sound'> {
    board: SpelBoard;
    // Picks are taken (not while the scene scrolls or the wasp is here).
    active: boolean;
    // The scene scrolls this board away: its bee has already flown off.
    leaving?: boolean;
}

/** One size for every sum on a board: its widest line decides (--hx-chars). */
export const boardChars = (board: SpelBoard) => Math.max(...board.cells.map(c => lineChars(cardLines(faceText(sumFace(c.question))))));

/** The cell's own texts: its sum, and after a wrong tap what it really is. */
export function cellTexts(board: SpelBoard, i: number, found: string) {
    const c = board.cells[i];
    const sum = faceText(sumFace(c.question));
    // A breuk that does not simplify (4/9) has no other answer to show.
    const own = faceText(answerFace(c.question));
    const showOwn = c.state === 'missed' && own !== sum;
    const label = c.state === 'solved' ? `${sum}, ${found}` : showOwn ? `${sum} is ${own}` : sum;
    return { sum, own, showOwn, label };
}

/**
 * The session's verdict on each pick arrives as the board (its focus moves to the picked cell): the bee turns
 * and flies to a find, or turns to look at a wrong pick; `fresh` is the cell whose crack or wilt plays now.
 */
export function usePicks(board: SpelBoard, at: (i: number) => { x: number; y: number }) {
    const [beeAt, setBeeAt] = useState<number | null>(null);
    const [face, setFace] = useState<1 | -1>(1);
    const [fresh, setFresh] = useState<number | null>(null);
    const [seenFocus, setSeenFocus] = useState<SpelBoard['focus']>(board.focus);
    // State adjusted during render: every pick moves the focus to a new cell (a picked cell closes).
    if (board.focus !== seenFocus) {
        setSeenFocus(board.focus);
        const f = board.focus;
        if (f !== null && board.cells[f].state !== 'open') {
            const from = beeAt !== null ? at(beeAt).x : BEE_START.x;
            const to = at(f).x;
            if (to !== from) setFace(to < from ? -1 : 1);
            if (board.cells[f].state === 'solved') setBeeAt(f);
            else setFresh(f);
        }
    }
    // The worried look lasts as long as the crack or the wilt.
    useEffect(() => {
        if (fresh === null) return;
        const id = window.setTimeout(() => setFresh(null), 1100);
        return () => window.clearTimeout(id);
    }, [fresh]);
    return { beeAt, face, fresh };
}

