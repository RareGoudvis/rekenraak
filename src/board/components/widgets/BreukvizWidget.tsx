import FractionShapeSVG from '../../../components/viewer/FractionShapeSVG';
import VerticalFraction from '../../../components/viewer/VerticalFraction';
import { breukvizProps } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Fraction visualisation manipulative: cirkel / pizza / lijn showing n/d colored.
export default function BreukvizWidget({ widget }: { widget: BoardWidget }) {
    const p = breukvizProps(widget);
    const colored = Array.from({ length: p.n }, (_, i) => i);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '14px' }}>
            {p.shape === 'lijn' ? (
                <FractionShapeSVG
                    numerator={p.n} denominator={p.d} shape="rectangle"
                    coloredIndices={colored} gridRows={1} gridCols={p.d}
                    showColored cellSize={Math.floor(250 / p.d)} fixedHeightPx={56} fixedWidthPx={250}
                />
            ) : (
                <div style={{ position: 'relative' }}>
                    {/* Pizza = the same sector circle on a "crust" ring with warm fill. */}
                    {p.shape === 'pizza' && (
                        <div style={{
                            position: 'absolute', inset: '-10px', borderRadius: '50%',
                            background: '#d9974a', border: '2px solid #a86a2b',
                        }} />
                    )}
                    <div style={{ position: 'relative', ...(p.shape === 'pizza' ? { filter: 'sepia(0.5) saturate(1.6) hue-rotate(-18deg)' } : {}) }}>
                        <FractionShapeSVG
                            numerator={p.n} denominator={p.d} shape="circle"
                            coloredIndices={colored} gridRows={1} gridCols={p.d}
                            showColored fixedDiameterPx={190}
                        />
                    </div>
                </div>
            )}
            <VerticalFraction value={{ n: p.n, d: p.d }} fontSize={22} mono />
        </div>
    );
}
