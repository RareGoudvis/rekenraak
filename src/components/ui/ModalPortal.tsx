import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Render overlays at <body> so a `backdrop-filter`/transform ancestor (e.g. the
// .mac-vibrant TopBar/Sidebar) can't become their containing block and trap a
// position:fixed modal inside the bar's box instead of the viewport.
export default function ModalPortal({ children }: { children: ReactNode }) {
    return createPortal(children, document.body);
}
