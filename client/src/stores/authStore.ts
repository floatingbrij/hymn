import { create } from 'zustand';
import type { User } from '../types';
import * as api from '../services/api';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  googleSignIn: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('hymn-token'),
  isLoading: false,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('hymn-token');
    if (!token) return;

    try {
      const user = await api.getMe();
      set({ user, token });
    } catch {
      localStorage.removeItem('hymn-token');
      set({ user: null, token: null });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem('hymn-token', token);
      set({ user, token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user } = await api.register(email, username, password);
      localStorage.setItem('hymn-token', token);
      set({ user, token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('hymn-token');
    set({ user: null, token: null });
  },

  googleSignIn: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { token, user } = await api.googleAuth(idToken);
      localStorage.setItem('hymn-token', token);
      set({ user, token, isLoading: false });
      return true;
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        set({ isLoading: false });
        return false;
      }
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
