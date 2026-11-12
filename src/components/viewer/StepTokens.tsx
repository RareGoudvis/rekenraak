import type { CSSProperties, ReactNode } from 'react';
import { stepLineText, stepText, type StepLine, type StepToken } from '../../services/math/workedSteps';

type Fmt = (n: number) => string;

// Em-sized, not a --sheet-size-* factor like VerticalFraction: the same breuk sits in the answer key, the
// kiosk panel and the tutor page, so it follows the font of the line it is in; the vertical margin keeps stacked lines apart.
const FRAC: CSSProperties = { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', verticalAlign: 'middle', fontSize: '0.8em', lineHeight: 1.1, margin: '0.25em 0.1em' };
const TELLER: CSSProperties = { borderBottom: '0.1em solid currentColor', padding: '0 0.2em', minWidth: '1.2em', textAlign: 'center' };
const NOEMER: CSSProperties = { padding: '0 0.2em', minWidth: '1.2em', textAlign: 'center' };

const hasFraction = (tokens: StepToken[]) => tokens.some(t => t.t === 'frac');

// A step line's tokens with every breuk stacked; without one it is the plain string, so those lines render as before.
export function StepTokens({ tokens, fmt }: { tokens: StepToken[]; fmt: Fmt }): ReactNode {
    if (!hasFraction(tokens)) return stepText(tokens, fmt);
    const out: ReactNode[] = [];
    let run: StepToken[] = [];
    const flush = () => { if (run.length) out.push(stepText(run, fmt)); run = []; };
    tokens.forEach((t, i) => {
        if (t.t !== 'frac') { run.push(t); return; }
        flush();
        out.push(
            <span key={i} style={FRAC} role="math" aria-label={`${fmt(t.n)} op ${fmt(t.d)}`}>
                <span style={TELLER}>{fmt(t.n)}</span>
                <span style={NOEMER}>{fmt(t.d)}</span>
            </span>,
        );
    });
    flush();
    return <>{out}</>;
}

// One line as the pupil reads it ("= …", or an aside on its own); SYNC: stepLineText.
export function StepLineView({ line, fmt }: { line: StepLine; fmt: Fmt }): ReactNode {
    if (!hasFraction(line.tokens)) return stepLineText(line, fmt);
    return <>{line.aside ? null : '= '}<StepTokens tokens={line.tokens} fmt={fmt} /></>;
}
