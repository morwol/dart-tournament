import { create } from 'zustand';
import { parseJwt, isTokenValid } from '../lib/parseJwt';

const storedToken = localStorage.getItem('token');
const validToken = isTokenValid(storedToken) ? storedToken : null;
if (!validToken && storedToken) localStorage.removeItem('token');

export const useStore = create((set) => ({
  token: validToken,
  role:  parseJwt(validToken)?.role ?? null,
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
