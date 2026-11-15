import { MusicNotes, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { setSoundOn, useSoundOn } from './sound';
import { NEXT_LEVEL, levelOf, setMusicOn, useMusicOn, type SoundLevel } from './music';

// The speaker in the game bar, one button with three steps: Uit → Geluid → Geluid + muziek → Uit.
// Off by default, kept per device. One button keeps the phone bar as it was; music never plays without sound.
const LABEL: Record<SoundLevel, string> = { uit: 'Geluid uit', geluid: 'Geluid aan', muziek: 'Geluid en muziek aan' };

export default function SoundToggle() {
    const level = levelOf(useSoundOn(), useMusicOn());
    const go = () => {
        const next = NEXT_LEVEL[level];
        // Music first: switching sound on must not start the music a step early.
        setMusicOn(next === 'muziek');
        setSoundOn(next !== 'uit');
    };
    return (
        <button type="button" className={`kiosk-btn spel-sound-btn is-${level}`} aria-pressed={level !== 'uit'} aria-label={LABEL[level]} title={LABEL[level]}
            // After a tap or click the focus leaves, so the next Enter answers the sum instead of toggling again.
            onClick={e => { go(); if (e.detail > 0) e.currentTarget.blur(); }}>
            {level === 'uit' ? <SpeakerSlash aria-hidden /> : <SpeakerHigh weight="fill" aria-hidden />}
            {level === 'muziek' && <MusicNotes className="spel-sound-note" weight="fill" aria-hidden />}
        </button>
    );
}
