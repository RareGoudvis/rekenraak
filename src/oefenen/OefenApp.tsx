import { useEffect, useState } from 'react';

// Root of the pupil kiosk (oefenen.html). Routed by the URL hash: #oefen=<payload>.
export default function OefenApp() {
    const [hash, setHash] = useState(() => window.location.hash);
    useEffect(() => {
        const onHash = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    return (
        <div className="oefen-app">
            <main className="oefen-center">
                <h1 className="oefen-title">RekenRaak – Oefenmodus</h1>
                {!hash.startsWith('#oefen=') && <p className="oefen-lead">Open de link die je juf of meester deelde.</p>}
            </main>
        </div>
    );
}
