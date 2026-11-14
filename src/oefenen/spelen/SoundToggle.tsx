import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { setSoundOn, useSoundOn } from './sound';

// The speaker in the game bar: off by default, kept per device.
export default function SoundToggle() {
    const on = useSoundOn();
    return (
        <button type="button" className="kiosk-btn spel-sound-btn" aria-pressed={on} aria-label={on ? 'Geluid aan' : 'Geluid uit'}
            // After a tap or click the focus leaves, so the next Enter answers the sum instead of toggling again.
            onClick={e => { setSoundOn(!on); if (e.detail > 0) e.currentTarget.blur(); }}>
            {on ? <SpeakerHigh weight="fill" aria-hidden /> : <SpeakerSlash aria-hidden />}
        </button>
    );
}
