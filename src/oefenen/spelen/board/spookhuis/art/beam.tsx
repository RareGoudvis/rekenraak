import { createContext, useContext, useEffect, useRef } from 'react';
import { inBeam, lookAt, type Pt } from '../haunt';

// The flashlight as a tiny store the scene can follow without re-rendering: Spookhuis moves it, a portrait's eyes
// or a skeleton's skull subscribe (useFollow) and get --fx / --fy (-1..1, where the light is) and .is-lit (the light
// is on them) on their own element. The light's place and size reach the dark's CSS as --lx / --ly / --sph-r.
export class BeamStore {
    pos: Pt = { x: 0, y: 0 };
    r = 120;
    root: HTMLElement | null = null;
    private subs = new Set<() => void>();

    attach(root: HTMLElement | null) { this.root = root; }

    move(p: Pt) {
        this.pos = p;
        this.root?.style.setProperty('--lx', `${Math.round(p.x)}px`);
        this.root?.style.setProperty('--ly', `${Math.round(p.y)}px`);
        this.subs.forEach(f => f());
    }

    resize(r: number) {
        this.r = r;
        this.root?.style.setProperty('--sph-r', `${r}px`);
    }

    subscribe(f: () => void) {
        this.subs.add(f);
        return () => { this.subs.delete(f); };
    }
}

export const BeamContext = createContext<BeamStore | null>(null);

/** A ref for a scene part that looks at the light (reach = how far away the look is full). */
export function useFollow<T extends Element>(reach = 140) {
    const store = useContext(BeamContext);
    const ref = useRef<T>(null);
    useEffect(() => {
        if (!store) return;
        const update = () => {
            const el = ref.current, root = store.root;
            if (!el || !root) return;
            const o = root.getBoundingClientRect(), r = el.getBoundingClientRect();
            const c = { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 };
            const d = lookAt(c, store.pos, reach);
            const style = (el as unknown as ElementCSSInlineStyle).style;
            style.setProperty('--fx', d.x.toFixed(3));
            style.setProperty('--fy', d.y.toFixed(3));
            el.classList.toggle('is-lit', inBeam(c, store.pos, store.r + Math.max(r.width, r.height) / 2.5));
        };
        update();
        return store.subscribe(update);
    }, [store, reach]);
    return ref;
}
