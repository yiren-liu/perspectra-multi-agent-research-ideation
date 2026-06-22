import { create } from "zustand";
import supabase from "./supabaseClient"; // Import the singleton Supabase client
import { SupabaseClient, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  // login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  supabaseClient: SupabaseClient;
  getCurrentUser: () => Promise<User | null>;
  getToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  supabaseClient: supabase, // Inject the singleton client here
  getCurrentUser: async () => {
    // Return existing user if we have it
    if (get().user) {
      return get().user;
    }
    
    // Otherwise fetch from Supabase
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting user:", error);
      return null;
    }
    
    if (data?.user) {
      set({ user: data.user });
      return data.user;
    }
    
    return null;
  },
  getToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session?.access_token || null;
  },
  // login: async (email: string, password: string) => {
  //   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  //   if (error) {
  //     throw new Error(error.message);
  //   }
  //   if (data.session?.access_token) {
  //     const token = data.session.access_token;
  //     set({ token, isAuthenticated: true, user: data.user });
  //     localStorage.setItem("authToken", token);
  //   }
  // },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    set({ user: null });
  },
  register: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  },
}));
