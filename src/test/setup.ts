import '@testing-library/jest-dom/vitest';

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  }
}

if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
    },
    writable: true,
    configurable: true,
  });
}

if (typeof fetch === 'undefined') {
  globalThis.fetch = async () => new Response(null, { status: 500 });
}

if (typeof AbortController === 'undefined') {
  globalThis.AbortController = class {
    signal: AbortSignal;
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        onabort: null,
        dispatchEvent: () => true,
      } as unknown as AbortSignal;
    }
    abort() {
      (this.signal as unknown as { aborted: boolean }).aborted = true;
    }
  };
}

if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = function (
    ms: number,
  ): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}
