import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App.tsx';
import { useWorksheetStore } from './store/useWorksheetStore';
import { REGISTRY } from './config/exerciseRegistry';
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
  (window as unknown as Record<string, unknown>).__rekenraak = {
    typeIds: Object.keys(REGISTRY),
    addBlockFromType: (typeId: string, label?: string) =>
      useWorksheetStore.getState().addBlockFromType(typeId, label ?? typeId),
    updateBlockSettings: (id: string, updates: Record<string, unknown>) =>
      useWorksheetStore.getState().updateBlockSettings(id, updates),
    setIgnoreMinWidth: (on: boolean) => useWorksheetStore.getState().setIgnoreMinWidth(on),
    clearBlocks: () => useWorksheetStore.getState().clearBlocks(),
    getState: () => useWorksheetStore.getState(),
  };
}
