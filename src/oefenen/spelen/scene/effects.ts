import './scene.css';

// The one-shot motion classes in scene.css: add one to an element (HTML or SVG) to play it once.
export const SPEL_MOTIONS = ['spel-shake', 'spel-bounce', 'spel-wiggle', 'spel-pop'] as const;
export type SpelMotion = typeof SPEL_MOTIONS[number];

/** Play a motion class again on an element that may already have it (a second mistake shakes again). */
export function replay(el: Element | null, motion: SpelMotion): void {
    if (!el) return;
    el.classList.remove(motion);
    // Reading the layout ends the old animation, so the class added next starts a fresh one.
    void (el as HTMLElement).getBoundingClientRect();
    el.classList.add(motion);
}
