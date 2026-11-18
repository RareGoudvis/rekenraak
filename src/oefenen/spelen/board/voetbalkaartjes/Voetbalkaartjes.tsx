import { useEffect, useState } from 'react';
import type { SkinEndingProps, SkinProps } from '../../skins/types';
import { PairsEnding, PairsGame } from '../hartjes/Hartjes';
import { PAIR_HIT_MS } from '../hartjes/hearts';
import { NO_BOARDS, ZIJ_GOALS, followBoards, wijGoals } from './score';
import './voetbalkaartjes.css';

// Voetbalkaartjes: Hartjes koppelen's memory with footballs on a pitch (the same board and component, board/hartjes/),
// and a small scoreboard above the cards: every pair found is a goal for Wij, Zij never scores. A found pair kicks a
// ball into a net (the pair moment); the score ticks up as the ball goes in. A ball going flat is the mistake picture.

function Scoreboard({ wij }: { wij: number }) {
    // The newest goal counts once the ball is in the net; a lower number (never in a round) shows at once.
    const [shown, setShown] = useState(wij);
    useEffect(() => {
        if (wij === shown) return;
        const t = window.setTimeout(() => setShown(wij), wij > shown ? PAIR_HIT_MS : 0);
        return () => window.clearTimeout(t);
    }, [wij, shown]);
    return (
        <div className="vk-board" role="img" aria-label={`Wij ${shown}, Zij ${ZIJ_GOALS}`}>
            <span className="vk-team is-wij">Wij</span>
            <span className="vk-nums">
                <span key={shown} className={`vk-num${shown > 0 ? ' is-goal' : ''}`}>{shown}</span>
                <span className="vk-dash">–</span>
                <span className="vk-num">{ZIJ_GOALS}</span>
            </span>
            <span className="vk-team is-zij">Zij</span>
        </div>
    );
}

export default function Voetbalkaartjes(props: SkinProps) {
    const [seen, setSeen] = useState(NO_BOARDS);
    // A new board: the last one's pairs are goals already (adjusted during render, the next board is never missed).
    const now = followBoards(seen, props.board);
    if (now !== seen) setSeen(now);
    return <PairsGame {...props} look="voetballen" top={<Scoreboard wij={wijGoals(now, props.board)} />} />;
}

/** Onmogelijk's fail picture: a dizzy ball beside the goal it never found. */
export const VoetbalkaartjesEnding = ({ outcome }: SkinEndingProps) => <PairsEnding outcome={outcome} look="voetballen" />;
