import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App.tsx';
import { useWorksheetStore, type AddBlockOpts } from './store/useWorksheetStore';
import { REGISTRY } from './config/exerciseRegistry';
import { flattenLeaves } from './config/appstructure';
import { measuredSnapshot } from './hooks/useMeasuredHeights';
import './index.css'; // Laadt de CSS-fundering en het thema

// App-wide Phosphor defaults so raw-rendered icons (sidebar theme toggle, modal X,
// panel carets) share one size/weight without per-site props. IconButton overrides
// weight per interaction state.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>,
);

// Dev-only handle for driving the sheet from outside React: the width-matrix harness
// (scripts/width-matrix.mjs) builds one block at a time and reads back what it rendered,
// and Playwright checks drag-and-drop by asserting the resulting block order. Guarded by
// import.meta.env.DEV so it is tree-shaken out of the production bundle.
if (import.meta.env.DEV) {
  // Deterministic PRNG (mulberry32) so a script can seed Math.random and get identical
  // generator output across two separate page loads — the font-baseline harness diffs
  // a `before/` and `after/` capture and must rule out "the numbers just changed" before
  // it can trust a pixel/height delta means the font sweep did something.
  const nativeRandom = Math.random.bind(Math);
  const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  (window as unknown as Record<string, unknown>).__rekenraak = {
    typeIds: Object.keys(REGISTRY),
    // Every addable sidebar leaf, flattened — the font-baseline harness walks this
    // instead of re-deriving it, so it always matches what a teacher can click.
    leaves: flattenLeaves(),
    addBlockFromType: (typeId: string, label?: string, overrideConstraints?: Record<string, unknown>, opts?: AddBlockOpts) =>
      useWorksheetStore.getState().addBlockFromType(typeId, label ?? typeId, overrideConstraints, opts),
    updateBlockSettings: (id: string, updates: Record<string, unknown>) =>
      useWorksheetStore.getState().updateBlockSettings(id, updates),
    setIgnoreMinWidth: (on: boolean) => useWorksheetStore.getState().setIgnoreMinWidth(on),
    clearBlocks: () => useWorksheetStore.getState().clearBlocks(),
    getState: () => useWorksheetStore.getState(),
    // The height/width maps the packer actually reads — scripts/height-audit.mjs diffs
    // them against the rendered rects, which is the only way to see the packer and the
    // paper disagree.
    measured: () => measuredSnapshot(),
    // DEV only, never shipped: replaces Math.random in place. seed(undefined) restores
    // the native RNG.
    seed: (n?: number) => { Math.random = n === undefined ? nativeRandom : mulberry32(n); },
  };
}
