import { create } from "zustand";
import type { Session, User, Subscription } from "@supabase/supabase-js";
import type { Profile, RegisterInput } from "@nyay/shared";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api-client";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signup: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  refreshProfile: () => Promise<void>;
}

let initPromise: Promise<void> | null = null;
let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: () => {
    // Deduplicate: only run once even if called from App + AuthGuard
    if (initPromise) return initPromise;

    // Clean up previous subscription (handles HMR re-evaluation)
    authSubscription?.unsubscribe();

    initPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const { data: profile } = await api.auth.getProfile({ skipRedirect: true });
            set({ user: session.user, session, profile: profile ?? null, initialized: true });
          } catch {
            // Profile doesn't exist yet (new user) — still authenticated
            set({ user: session.user, session, profile: null, initialized: true });
          }
        } else {
          set({ initialized: true });
        }
      } catch {
        set({ initialized: true });
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          set({ user: session.user, session });
          if (event === "SIGNED_IN" || !get().profile) {
            try {
              const { data: profile } = await api.auth.getProfile({ skipRedirect: true });
              set({ profile: profile ?? null });
            } catch { /* profile not created yet */ }
          }
        } else {
          set({ user: null, session: null, profile: null });
        }
      });
      authSubscription = subscription;
    })();
    return initPromise;
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await api.auth.getProfile();
      set({ user: data.user, session: data.session, profile: profile ?? null });
    } finally {
      set({ loading: false });
    }
  },

  requestOtp: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (email, token) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      try {
        const { data: profile } = await api.auth.getProfile({ skipRedirect: true });
        set({ user: data.user ?? null, session: data.session ?? null, profile: profile ?? null });
      } catch {
        set({ user: data.user ?? null, session: data.session ?? null, profile: null });
      }
    } finally {
      set({ loading: false });
    }
  },

  signup: async (input) => {
    set({ loading: true });
    try {
      const { email, password, ...metadata } = input;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { ...metadata, role: "lawyer" } },
      });
      if (error) throw error;
      set({ user: data.user ?? null, session: data.session ?? null });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
    // Allow re-initialization after logout
    initPromise = null;
    // Clear cached API data to prevent cross-user data leaks
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_API_CACHE" });
  },

  setProfile: (profile) => set({ profile }),

  refreshProfile: async () => {
    const { data: profile } = await api.auth.getProfile();
    set({ profile: profile ?? null });
  },
}));
