import { Warning } from '@phosphor-icons/react';
import { useOefenStore } from '../useOefenStore';

// The run could not be saved on this device: say so while practising, before a reload loses it.
export default function StorageBanner() {
    const failed = useOefenStore(s => s.storageFailed);
    if (!failed) return null;
    return (
        <p className="kiosk-storage-banner" role="alert">
            <Warning aria-hidden weight="bold" />Dit toestel kan je resultaten niet bewaren.
        </p>
    );
}
