import { create } from 'zustand';

export const useStore = create((set) => ({
  token: localStorage.getItem('token'),
  admin: null,
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, admin: null });
  },
  currentTournament: null,
  setCurrentTournament: (t) => set({ currentTournament: t }),
}));
