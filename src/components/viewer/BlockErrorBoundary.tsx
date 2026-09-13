import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    resetKey?: unknown;      // when this changes (Object.is), a failed boundary tries again
    fallback?: ReactNode;    // defaults to the on-sheet "kon niet tekenen" message
    label?: string;          // typeId or similar, for the console log
}

interface State {
    failed: boolean;
}

// Shared crash guard for anything that renders a viewer on the sheet (App.tsx block dispatch,
// SheetThumbnail, ExercisePreview). One bad exercise/generator combo must not blank the page —
// it falls back to a small message and keeps the surrounding chrome (title row, badge, numbering).
export class BlockErrorBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[rekenraak] viewer crashed:', this.props.label, error, info.componentStack);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.state.failed && !Object.is(prevProps.resetKey, this.props.resetKey)) {
            this.setState({ failed: false });
        }
    }

    render() {
        if (this.state.failed) {
            return this.props.fallback !== undefined ? this.props.fallback : <DefaultFallback />;
        }
        return this.props.children;
    }
}

// .no-print: this message must never end up on paper — a teacher who ignores it and prints
// anyway gets a blank spot, not a red banner in front of the class. minWidth:0 + wrapping text
// so it never pins the block's intrinsic-width probe (PageSheet.probeIntrinsicWidth) wide.
function DefaultFallback() {
    return (
        <div
            className="no-print"
            style={{
                minWidth: 0,
                fontSize: 'calc(var(--sheet-size-text) * 0.7)',
                color: 'var(--danger)',
                fontFamily: 'var(--font-sheet-text)',
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
            }}
        >
            Kon dit blok niet tekenen — klik Genereer.
        </div>
    );
}
