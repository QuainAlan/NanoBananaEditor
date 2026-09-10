import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function resolve(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return media?.matches ? 'dark' : 'light';
  return pref;
}

function apply(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0a0a0e' : '#f7f6f2');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolved: resolve('system'),
      setPreference: (preference) => {
        const resolved = resolve(preference);
        apply(resolved);
        set({ preference, resolved });
      },
      toggle: () => {
        const next = get().resolved === 'dark' ? 'light' : 'dark';
        get().setPreference(next);
      },
    }),
    {
      name: 'nb-theme',
      partialize: (s) => ({ preference: s.preference }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const resolved = resolve(state.preference);
        apply(resolved);
        useThemeStore.setState({ resolved });
      },
    }
  )
);

// Apply immediately on module load so there is no flash of the wrong theme.
apply(resolve(useThemeStore.getState().preference));

media?.addEventListener('change', () => {
  const { preference } = useThemeStore.getState();
  if (preference === 'system') useThemeStore.getState().setPreference('system');
});
