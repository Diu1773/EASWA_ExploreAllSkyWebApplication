import { create } from 'zustand';
import { fetchCurrentUser, logout as apiLogout, type AuthUser } from '../api/client';
import { clearAllLearnerWork } from '../utils/inquiryDraft';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkSession: async () => {
    set({ loading: true });
    const user = await fetchCurrentUser();
    set({ user, loading: false });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null });

    // Signing out is a handover on a shared classroom PC, so the learner's work
    // goes with the session — it used to survive, leaving the next person with
    // the previous one's self-check answers and fitted curve. Nothing deliberate
    // is lost: /my records stay, and a backend draft can be resumed after login.
    clearAllLearnerWork();

    // Hard navigation, not a route change: the notes, self-checks and fit live
    // in several React trees' state, and only a fresh document guarantees none
    // of them survives the sign-out.
    window.location.replace('/');
  },
}));
