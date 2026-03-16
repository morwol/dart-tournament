// frontend/src/store/toasts.js
import { create } from 'zustand';

let _nextId = 1;

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ type, message }) => {
    const id = _nextId++;
    // Keep at most 2 existing toasts + 1 new = max 3 visible
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, type, message }] }));
    return id; // caller can use this to removeToast(id) for loading toasts
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
