import { useEffect, useState } from 'react';
import { loadEenvoudigData, type EenvoudigData } from '../../config/eenvoudig/cards';

// The card table loads on first use (it is ~270 kB); null until it has.
export function useEenvoudigData(): EenvoudigData | null {
    const [data, setData] = useState<EenvoudigData | null>(null);
    useEffect(() => {
        let alive = true;
        void loadEenvoudigData().then(d => { if (alive) setData(d); });
        return () => { alive = false; };
    }, []);
    return data;
}
