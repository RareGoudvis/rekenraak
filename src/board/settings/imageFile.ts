// A picked image file as a dataURL, optionally scaled down so small faces (dice) don't bloat the
// board file and autosave. No canvas (jsdom, very old browsers) = the original dataURL.
export function readImageFile(file: File, maxPx?: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
            const url = String(reader.result);
            if (!maxPx) { resolve(url); return; }
            const img = new Image();
            img.onerror = () => resolve(url);
            img.onload = () => {
                const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
                if (k >= 1) { resolve(url); return; }
                const c = document.createElement('canvas');
                c.width = Math.round(img.naturalWidth * k);
                c.height = Math.round(img.naturalHeight * k);
                const ctx = c.getContext('2d');
                if (!ctx) { resolve(url); return; }
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/png'));
            };
            img.src = url;
        };
        reader.readAsDataURL(file);
    });
}
