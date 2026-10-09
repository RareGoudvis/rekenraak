import { klokProps, type KlokProps } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Klok widget on top of klokProps: face style and size, 24-hour ring, minute numbers,
// seconds hand, live time vs a set time, 12- or 24-hour digital time.

export type FaceStyle = 'klassiek' | 'kleur' | 'kinder';
export type FaceSize = 'klein' | 'normaal' | 'groot';
// Face geometry per size; 'normaal' = today's 240.
export const FACE_SIZES: Record<FaceSize, number> = { klein: 180, normaal: 240, groot: 264 };

export interface KlokModel extends KlokProps {
    faceStyle: FaceStyle;
    faceSize: FaceSize;
    ring24: boolean;           // 13-24 on the face
    minuteNumbers: boolean;    // 5, 10, … 60 round the face
    showSeconds: boolean;      // seconds hand (and :ss on the digital clock) — live time only
    live: boolean;             // follow the real time instead of the hands the teacher set
    clock24: boolean;          // digital 13:45 (today) vs 1:45
}

export function klokModel(widget: BoardWidget): KlokModel {
    const p = widget.props ?? {};
    return {
        ...klokProps(widget),
        faceStyle: p.faceStyle === 'kleur' || p.faceStyle === 'kinder' ? p.faceStyle : 'klassiek',
        faceSize: p.faceSize === 'klein' || p.faceSize === 'groot' ? p.faceSize : 'normaal',
        ring24: p.ring24 === true,
        minuteNumbers: p.minuteNumbers === true,
        showSeconds: p.showSeconds === true,
        live: p.live === true,
        clock24: p.clock24 !== false,
    };
}

export function digitalTime(h: number, m: number, s: number | null, clock24: boolean): string {
    const hh = clock24 ? String(h).padStart(2, '0') : String(h % 12 || 12);
    return `${hh}:${String(m).padStart(2, '0')}${s === null ? '' : `:${String(s).padStart(2, '0')}`}`;
}
