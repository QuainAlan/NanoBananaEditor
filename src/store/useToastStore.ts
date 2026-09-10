import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? (toast.kind === 'error' ? 8000 : 4500);
    if (duration > 0) setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (title: string, description?: string) => useToastStore.getState().push({ kind: 'info', title, description }),
  success: (title: string, description?: string) => useToastStore.getState().push({ kind: 'success', title, description }),
  error: (title: string, description?: string) => useToastStore.getState().push({ kind: 'error', title, description }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ kind: 'warning', title, description }),
  custom: (t: Omit<Toast, 'id'>) => useToastStore.getState().push(t),
};
