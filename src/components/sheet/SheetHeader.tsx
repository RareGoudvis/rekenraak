import { styles } from '../../styles/appStyles';
import { overlayRegionStyle, borderSides } from '../../services/regionStyle';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField, type HeaderData, type DocSettings } from '../../store/useWorksheetStore';

// Name-field row (Naam/Klas/Nr/Datum). Reused by the page-1 body header and the
// optional repeating print header (.print-repeat-fields). Null if no field is enabled.
function renderFields(headerData: HeaderData | undefined, align: 'left' | 'right' = 'left') {
  const order: HeaderField[] = headerData?.fieldOrder ?? DEFAULT_FIELD_ORDER;
  const widths = headerData?.fieldWidths ?? DEFAULT_FIELD_WIDTHS;
  const LABELS: Record<HeaderField, string> = { naam: 'Naam:', klas: 'Klas:', nummer: 'Nr:', datum: 'Datum:' };
  const visibleFields = order.filter(f => headerData?.[f]);
  if (visibleFields.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', rowGap: '8px', width: '100%', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {visibleFields.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'flex-end', width: `${widths[f] ?? DEFAULT_FIELD_WIDTHS[f]}px` }}>
          <span style={styles.sheetHeaderLabel}>{LABELS[f]}</span>
          <div style={styles.sheetHeaderLine}></div>
        </div>
      ))}
    </div>
  );
}

// Pages after the first: only the name fields, and only when the teacher asked to repeat them.
export function SheetRepeatFields({ header: headerData }: { header: HeaderData | undefined }) {
  return <div className="print-repeat-fields">{renderFields(headerData)}</div>;
}

// Page-1 header: title, name fields and score box, rendered per page by PageSheet.
export default function SheetHeader({ header: headerData, docSettings, totalScore }: { header: HeaderData | undefined; docSettings: DocSettings; totalScore: number }) {
  return (
    /* ── HEADER ── (enum base style + optional style-builder overlay; custom wins) */
    <div style={overlayRegionStyle({
      // Vertical padding belongs to the BOX, not to the header: with headerStyle
      // 'geen' (the default) there is no border and no rule, so 12px above and below
      // was 24px of paper reserved for a frame nobody asked for. It comes back for
      // 'onderstreept' / 'kader', which do need air inside their line.
      display: 'flex', flexDirection: 'column', width: '100%',
      padding: docSettings.headerStyle === 'geen' ? '0 12px' : '12px',
      boxSizing: 'border-box',
      // The title's size lives HERE, on the region container, because that is what
      // the Blad tab's "Tekengrootte" slider writes to (overlayRegionStyle sets
      // fontSize on this box). An <h1> with its own fontSize simply won out and the
      // slider did nothing. The name fields, the score box and the badge keep their
      // own sizes — only the title inherits. A flanking title is a size smaller than
      // a centred one, which is the one thing the old per-h1 sizes were saying.
      fontSize: (docSettings.titlePosition === 'left' || docSettings.titlePosition === 'right') ? '22px' : '24px',
      // 'onderstreept' = one line under the whole header (separates it from the body);
      // 'kader' = full box. Per-side longhands only (borderSides): mixing them with the
      // borderWidth/borderColor shorthands made React warn on every style switch.
      borderRadius: docSettings.headerStyle === 'onderstreept' ? 0 : '6px',
      ...(() => {
        const side = docSettings.headerStyle === 'kader' ? { width: '1.5px', color: '#000' } : { width: '1px', color: 'transparent' };
        const bottom = docSettings.headerStyle === 'geen' ? side : { width: '1.5px', color: '#000' };
        return borderSides({ Top: side, Right: side, Bottom: bottom, Left: side });
      })(),
    }, docSettings.headerCustom)}>
      {(() => {
        const showScore = docSettings.showScores && totalScore > 0;
        const hasTitle = !!headerData?.titel;
        const gap = docSettings.titleFieldsGap ?? 16;
        // Wrapped so print CSS can hide this page-1 copy when repeatHeader moves the strip to .print-thead.
        // Fields align opposite the title: title-left → fields flush right, title-right → fields left.
        const fieldsRowAligned = (align: 'left' | 'right') => {
          const f = renderFields(headerData, align);
          return f ? <div className="print-body-fields">{f}</div> : null;
        };
        const titleScore = (align: 'left' | 'right') => (hasTitle || showScore) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', justifyContent: (hasTitle && showScore) ? 'space-between' : (!showScore) ? 'center' : 'flex-end', flexShrink: 0, gridColumn: align === 'right' ? '2' : '1', gridRow: '1' }}>
            {hasTitle && <h1 style={{ margin: 0, fontSize: 'inherit', fontFamily: 'var(--font-sheet-text)', fontWeight: 700, textAlign: align }}>{headerData!.titel}</h1>}
            {showScore && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
          </div>
        ) : null;
        if (docSettings.titlePosition === 'right') {
          const fr = fieldsRowAligned('left');
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: `${gap}px`, rowGap: '8px' }}>
              {fr && <div style={{ gridColumn: '1', gridRow: '1', display: 'flex', alignItems: 'flex-end' }}>{fr}</div>}
              {titleScore('right')}
            </div>
          );
        }
        if (docSettings.titlePosition === 'left') {
          // Fields hug the sheet's right edge as a block with a straight LEFT edge
          // (left-aligned rows inside a right-pushed fit-content wrapper) — plain
          // renderFields('right') right-justified each wrapped row raggedly.
          const fr = renderFields(headerData, 'left');
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: `${gap}px`, rowGap: '8px' }}>
              {titleScore('left')}
              {fr && (
                <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <div className="print-body-fields" style={{ width: 'fit-content', maxWidth: '100%' }}>{fr}</div>
                </div>
              )}
            </div>
          );
        }
        // center — the title ALWAYS sits on its own line under the fields, the way a
        // real worksheet reads; flanking the title with half the fields looked odd.
        const centerFields = fieldsRowAligned('left');
        return (
          <>
            {/* Name fields + Score share the top row so the Score box sits at the
                Naam/Klas height (not floating below); the centered title drops beneath. */}
            {(centerFields || showScore) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: `${gap}px` }}>
                <div style={{ minWidth: 0 }}>{centerFields}</div>
                {showScore && <div style={{ ...styles.scoreBox, flexShrink: 0 }}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
              </div>
            )}
            {/* The 8px only separates the title from the fields/score row above it;
                with every field off there is nothing to separate it from and the gap
                is paper margin pretending to be layout. */}
            {hasTitle && <h1 style={{ margin: (centerFields || showScore) ? '8px 0 0' : 0, fontSize: 'inherit', fontFamily: 'var(--font-sheet-text)', fontWeight: 700, textAlign: 'center' }}>{headerData!.titel}</h1>}
          </>
        );
      })()}
    </div>
  );
}
