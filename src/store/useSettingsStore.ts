import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  /** User-supplied Gemini API key. Lives only in this browser. */
  byokKey: string;
  setByokKey: (key: string) => void;
  downloadFormat: 'png' | 'jpeg' | 'webp';
  setDownloadFormat: (f: 'png' | 'jpeg' | 'webp') => void;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      byokKey: '',
      setByokKey: (byokKey) => set({ byokKey: byokKey.trim() }),
      downloadFormat: 'png',
      setDownloadFormat: (downloadFormat) => set({ downloadFormat }),
      hasSeenWelcome: false,
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
    }),
    { name: 'nb-settings' }
  )
);
