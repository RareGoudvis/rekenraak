import { overlayRegionStyle } from '../../services/regionStyle';
import type { FooterSlot, FooterData } from '../../services/math/types';
import type { DocSettings } from '../../store/useWorksheetStore';

// Footer is three slots. The left one always carries the credit and takes no setting;
// the other two are free. Page numbers are only possible at all because the packer knows
// the index and the total — the browser cannot count pages from HTML.
function footerSlotText(footerData: FooterData | undefined, slot: FooterSlot | undefined, pageIndex: number, pageCount: number): string {
  switch (slot) {
    case 'vrije-tekst':  return footerData?.centerText ?? '';
    case 'paginanummer': {
      const fmt = footerData?.pageFormat ?? 'lang';
      if (fmt === 'cijfer') return String(pageIndex + 1);
      if (fmt === 'kort') return `${pageIndex + 1} / ${pageCount}`;
      return `Pagina ${pageIndex + 1} van ${pageCount}`;
    }
    case 'school':     return footerData?.school || '';
    case 'klas':       return footerData?.klas || '';
    case 'leerkracht': return footerData?.leerkracht || '';
    case 'datum':      return new Date().toLocaleDateString('nl-BE');
    default:           return '';
  }
}

export default function SheetFooter({ footer: footerData, docSettings, pageIndex, pageCount }: { footer: FooterData | undefined; docSettings: DocSettings; pageIndex: number; pageCount: number }) {
  // Old worksheets have no slots; derive something sensible from the v2 fields so a
  // saved sheet keeps looking like itself.
  const centerSlot: FooterSlot = footerData?.slotCenter
    ?? (footerData?.showCenterText ? 'vrije-tekst' : 'leeg');
  const rightSlot: FooterSlot = footerData?.slotRight
    ?? (footerData?.showPagina ? 'paginanummer'
      : footerData?.showSchool ? 'school'
      : footerData?.showKlas ? 'klas'
      : footerData?.showLeerkracht ? 'leerkracht' : 'leeg');
  const leftSlot: FooterSlot = footerData?.slotLeft ?? 'leeg';
  const right = rightSlot === 'vrije-tekst' ? (footerData?.rightText ?? '') : footerSlotText(footerData, rightSlot, pageIndex, pageCount);
  const left = leftSlot === 'vrije-tekst' ? (footerData?.leftText ?? '') : footerSlotText(footerData, leftSlot, pageIndex, pageCount);
  // The credit always prints; only its position is the teacher's choice. Whichever
  // position holds it shows the credit instead of that position's own slot.
  const brandSlot = footerData?.brandSlot ?? 'left';
  const credit = <span className="footer-credit">Gemaakt met RekenRaak.be</span>;
  return (
    <div className="print-tfoot-inner" style={overlayRegionStyle({
      borderTopStyle: 'solid',
      borderTopWidth: docSettings.footerStyle === 'kader' ? '1.5px' : '1px',
      borderTopColor: docSettings.footerStyle === 'lijn' ? '#ccc'
        : docSettings.footerStyle === 'kader' ? '#000' : 'transparent',
      ...(docSettings.footerStyle === 'kader'
        ? { borderStyle: 'solid', borderWidth: '1.5px', borderColor: '#000', padding: '8px 12px', borderRadius: '6px' }
        : {}),
    }, docSettings.footerCustom)}>
      <span>{brandSlot === 'left' ? credit : left}</span>
      <span>{brandSlot === 'center' ? credit : footerSlotText(footerData, centerSlot, pageIndex, pageCount)}</span>
      <span>{brandSlot === 'right' ? credit : right}</span>
    </div>
  );
}
