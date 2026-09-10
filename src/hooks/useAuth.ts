import { useEffect } from 'react';
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialised: boolean;
}

const useAuthStore = create<AuthState>(() => ({
  user: null,
  session: null,
  loading: true,
  initialised: false,
}));

let subscribed = false;

function init() {
  if (subscribed) return;
  subscribed = true;
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.setState({ user: session?.user ?? null, session, loading: false, initialised: true });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ user: session?.user ?? null, session, loading: false, initialised: true });
  });
}

export const useAuth = () => {
  const { user, session, loading } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  const signUp = async (email: string, password: string, acceptMarketing: boolean) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { accept_marketing: acceptMarketing } },
    });

  const signIn = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => supabase.auth.signOut();

  const resendConfirmation = async (email: string) => supabase.auth.resend({ type: 'signup', email });

  const resetPassword = async (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });

  return { user, session, loading, signUp, signIn, signOut, resendConfirmation, resetPassword };
};

export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
