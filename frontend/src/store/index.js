import { create } from 'zustand';
import { parseJwt } from '../lib/parseJwt';

export const useStore = create((set) => ({
  token: localStorage.getItem('token'),
  role:  parseJwt(localStorage.getItem('token'))?.role ?? null,
  admin: null,

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, role: parseJwt(token)?.role ?? null });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, role: null, admin: null });
  },

  currentTournament: null,
  setCurrentTournament: (t) => set({ currentTournament: t }),
}));
