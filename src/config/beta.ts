// One switch per beta module: flip a boolean to false and its badge, strip and Help sentence disappear.
export const BETA_MODULES = { oefenmodus: true, bordmodus: true } as const;
export type BetaModule = keyof typeof BETA_MODULES;

// The app's existing feedback channel (same form Help and the menu name); no mailbox exists.
export const FEEDBACK_URL = 'https://forms.gle/jc1LcMXaRG3V3M556';

export const BETA_TEXT = 'Deze module is in bèta: alles werkt, maar we schaven nog bij. Fouten of ideeën? Mail ons.';
