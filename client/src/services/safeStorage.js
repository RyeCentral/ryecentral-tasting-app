/**
 * safeStorage — localStorage/sessionStorage wrappers that never throw.
 *
 * Storage access throws in iOS Safari with "Block All Cookies", in some
 * in-app browsers (Instagram, Facebook, Gmail) and in older private modes.
 * An unguarded call during startup blanks the whole app on those phones, so
 * every storage read/write goes through here. When storage is unavailable we
 * fall back to an in-memory map so the current visit still works.
 */

const memory = { local: new Map(), session: new Map() };

function store(kind) {
  try {
    const s = kind === 'session' ? window.sessionStorage : window.localStorage;
    const probe = '__rc_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function make(kind) {
  let resolved; // undefined = not checked yet, null = unavailable
  const get = () => {
    if (resolved === undefined) resolved = store(kind);
    return resolved;
  };
  return {
    getItem(key) {
      const s = get();
      if (s) {
        try { return s.getItem(key); } catch { /* fall through */ }
      }
      return memory[kind].has(key) ? memory[kind].get(key) : null;
    },
    setItem(key, value) {
      const s = get();
      if (s) {
        try { s.setItem(key, value); return; } catch { /* quota / blocked */ }
      }
      memory[kind].set(key, String(value));
    },
    removeItem(key) {
      const s = get();
      if (s) {
        try { s.removeItem(key); } catch { /* ignore */ }
      }
      memory[kind].delete(key);
    },
  };
}

export const safeLocal = make('local');
export const safeSession = make('session');
