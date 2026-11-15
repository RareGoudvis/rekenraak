import { Footprints } from '@phosphor-icons/react';

// The stappenhulp mark: footsteps in the ink colour, sized by the text around it, so it prints as plain line art.
export default function StepsGlyph({ size = '0.85em' }: { size?: string }) {
    return (
        <Footprints
            weight="bold" size={size} color="currentColor" aria-label="Met stappen in de stappenhulp" role="img"
            className="steps-glyph" style={{ verticalAlign: '-0.12em', flexShrink: 0 }}
        />
    );
}
