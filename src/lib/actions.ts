/**
 * Tiny registry so keyboard shortcuts and other components can trigger the
 * composer's generate action without prop drilling.
 */
type Handler = () => void;

const handlers: Record<string, Handler | undefined> = {};

export function registerAction(name: 'generate' | 'download' | 'openPurchase' | 'openSettings', fn: Handler) {
  handlers[name] = fn;
  return () => {
    if (handlers[name] === fn) handlers[name] = undefined;
  };
}

export function triggerAction(name: 'generate' | 'download' | 'openPurchase' | 'openSettings') {
  handlers[name]?.();
}
