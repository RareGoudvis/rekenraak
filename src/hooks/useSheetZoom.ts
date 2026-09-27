import { useEffect, useState, type RefObject } from 'react';

// Sheet zoom-to-fit. The panels no longer collapse, so on a narrow laptop the sheet is
// what gives way: it scales down to whatever width is left instead of hiding a panel.
// Floored at 55% — below that the preview stops being readable and shrinking further
// would trade one unusable state for another.
export function useSheetZoom(scrollRef: RefObject<HTMLDivElement | null>): number {
  const [sheetZoom, setSheetZoom] = useState(1);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // The page is a real A4 at 96dpi now; the old 920px card is gone, and measuring
    // against it made the sheet shrink long before it needed to.
    const SHEET_PX = 794;
    const SIDE_PAD = 96;       // .print-scroll horizontal padding
    const fit = () => {
      const avail = el.clientWidth - SIDE_PAD;
      setSheetZoom(Math.max(0.55, Math.min(1, avail / SHEET_PX)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef]);
  return sheetZoom;
}
