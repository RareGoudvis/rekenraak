import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; label?: string; }
interface State { error: string | null; }

// One faulty widget or stroke must never white-screen the whole board mid-lesson.
// Shows the error text (so the teacher can report it) + a reset for just this part.
export default class BoardErrorBoundary extends Component<Props, State> {
    state: State = { error: null };
    static getDerivedStateFromError(e: unknown) {
        return { error: e instanceof Error ? e.message : String(e) };
    }
    render() {
        if (this.state.error !== null) {
            return (
                <div style={{
                    padding: '14px 16px', borderRadius: '10px', background: '#fef2f2',
                    border: '1px solid #fca5a5', color: '#991b1b',
                    fontFamily: "'Azeret Mono', monospace", fontSize: '12px', maxWidth: '420px',
                }}>
                    <strong>{this.props.label ?? 'Onderdeel'} crashte:</strong>
                    <div style={{ margin: '6px 0', wordBreak: 'break-word' }}>{this.state.error}</div>
                    <button type="button" onClick={() => this.setState({ error: null })} style={{
                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #991b1b',
                        background: 'transparent', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        Opnieuw proberen
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
