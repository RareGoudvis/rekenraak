import { WarningCircle } from '@phosphor-icons/react';

interface Props {
    message?: string | null;
}

// A bad, truncated or newer-version link, or the page opened without one.
export default function ErrorScreen({ message }: Props) {
    return (
        <main className="oefen-center kiosk-error" role="alert">
            <WarningCircle className="kiosk-error-icon" aria-hidden />
            <h1 className="oefen-title">Deze oefenlink werkt niet</h1>
            <p className="oefen-lead">{message || 'Er zit geen oefening in deze link.'}</p>
            <p className="kiosk-start-note">Vraag je juf of meester om de link of QR-code opnieuw te delen.</p>
        </main>
    );
}
