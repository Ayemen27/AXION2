
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { translateError } from '@/lib/errors';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  dbRole: 'admin' | 'manager' | 'user' | null;
  dbApproved: boolean | null;
  profileChecked: boolean;
  login: (email: string, password: string) => Promise<void | { needsVerification: true }>;
  logout: () => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtpAndRegister: (email: string, token: string, password: string, firstName: string, lastName: string) => Promise<{ pendingApproval: boolean }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const meta = supabaseUser.user_metadata || {};
  const email = supabaseUser.email!;
  const fullName = meta.full_name || meta.username || email.split('@')[0];
  const parts = fullName.trim().split(' ');
  return {
    id:         supabaseUser.id,
    email,
    first_name: meta.first_name || parts[0] || '',
    last_name:  meta.last_name  || parts.slice(1).join(' ') || '',
    full_name:  fullName,
    phone:      meta.phone ?? undefined,
    role:       (meta.role as User['role']) || 'user',
    is_active:  true,
    created_at: supabaseUser.created_at,
    last_login: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]             = useState<User | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [dbRole, setDbRole]         = useState<'admin' | 'manager' | 'user' | null>(null);
  const [dbApproved, setDbApproved] = useState<boolean | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  // Use refs to avoid stale closure issues in onAuthStateChange
  const fetchingRef      = useRef(false);
  const sessionInitedRef = useRef(false); // tracks if getSession already ran fetchProfile

  const fetchProfile = async (userId: string, retries = 4): Promise<{ role: string; is_approved: boolean } | null> => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;
    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role, is_approved, is_active, full_name, phone')
          .eq('id', userId)
          .single();

        if (!error && data) {
          const role     = (data.role as 'admin' | 'manager' | 'user') ?? 'user';
          const approved = data.is_approved ?? true;
          setDbRole(role);
          setDbApproved(approved);
          setUser(prev => prev ? {
            ...prev,
            role:      (data.role as User['role']) ?? prev.role,
            full_name: data.full_name || prev.full_name,
            phone:     data.phone    || prev.phone,
          } : prev);
          setProfileChecked(true);
          console.log('[Auth] fetchProfile OK — role:', role, 'attempt:', attempt);
          return { role, is_approved: approved };
        }

        if (attempt < retries) {
          // Profile may not exist yet (DB trigger still running) — retry
          console.log('[Auth] fetchProfile retry', attempt + 1, error?.message);
          await new Promise(r => setTimeout(r, 600));
        }
      }

      console.warn('[Auth] fetchProfile: retries exhausted, defaulting to user');
      setDbRole('user');
      setDbApproved(true);
      setProfileChecked(true);
      return null;
    } catch (e) {
      console.error('[Auth] fetchProfile exception:', e);
      setDbRole('user');
      setDbApproved(true);
      setProfileChecked(true);
      return null;
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // ── 1. Primary init: existing session on page load ──────────────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        await fetchProfile(session.user.id);
      } else {
        setProfileChecked(true);
      }
      sessionInitedRef.current = true;
      setIsLoading(false);
    });

    // ── 2. Secondary: new auth events only ──────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[Auth] event:', event, '| sessionInited:', sessionInitedRef.current);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(mapSupabaseUser(session.user));

          // Skip if getSession already handled this user (page-load flow)
          // Only refetch if this is a brand-new sign-in (sessionInitedRef not yet true)
          // OR if no profile has been fetched yet (fetchingRef not running)
          if (!sessionInitedRef.current && !fetchingRef.current) {
            await fetchProfile(session.user.id);
          }
          setIsLoading(false);

        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setDbRole(null);
          setDbApproved(null);
          setProfileChecked(false);
          sessionInitedRef.current = false;
          fetchingRef.current = false;
          setIsLoading(false);

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(mapSupabaseUser(session.user));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void | { needsVerification: true } | { pendingApproval: true }> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsLoading(false);
      if (error.message.includes('Email not confirmed')) {
        localStorage.setItem('axion_pending_email', email);
        return { needsVerification: true };
      } else if (error.message.includes('not authorized') || error.message.includes('disabled')) {
        throw new Error('حسابك معطل. تواصل مع المسؤول.');
      }
      throw new Error(translateError(error));
    }

    if (data.user) {
      setUser(mapSupabaseUser(data.user));

      // Force fresh profile fetch (reset guard first)
      fetchingRef.current = false;
      sessionInitedRef.current = true;
      const profile = await fetchProfile(data.user.id);

      // Pending approval — keep user signed IN, signal caller to redirect
      if (profile?.is_approved === false) {
        setIsLoading(false);
        return { pendingApproval: true };
      }

      // Verify is_active
      const { data: fullProfile } = await supabase
        .from('user_profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .single();

      if (fullProfile?.is_active === false) {
        await supabase.auth.signOut();
        setUser(null); setDbRole(null); setIsLoading(false);
        throw new Error('حسابك معطل. تواصل مع المسؤول.');
      }
      
      // Success - loading state will be handled by LoginPage navigation
      // Don't call setIsLoading(false) here to prevent UI flicker
    } else {
      // No user returned (should not happen, but defensive)
      setIsLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbRole(null);
    setDbApproved(null);
    setProfileChecked(false);
    sessionInitedRef.current = false;
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  };

  // ── Verify OTP + Register ──────────────────────────────────────────────────
  const verifyOtpAndRegister = async (
    email: string,
    token: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ pendingApproval: boolean }> => {
    setIsLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (verifyError) {
      setIsLoading(false);
      throw new Error(translateError(verifyError));
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const { data, error: updateError } = await supabase.auth.updateUser({
      password,
      data: { first_name: firstName, last_name: lastName, full_name: fullName, username: fullName },
    });
    if (updateError) {
      setIsLoading(false);
      throw new Error(updateError.message);
    }
    if (data.user) setUser(mapSupabaseUser(data.user));

    // Wait for DB trigger to create user_profiles row
    await new Promise(r => setTimeout(r, 1000));

    // Fetch profile to check approval status — keep user SIGNED IN
    fetchingRef.current = false;
    const profile = await fetchProfile(data.user!.id);

    setIsLoading(false);
    // Return pending status — caller handles navigation, NO signOut here
    return { pendingApproval: profile?.is_approved === false };
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user && dbApproved !== false,
      isLoading,
      dbRole,
      dbApproved,
      profileChecked,
      login,
      logout,
      sendOtp,
      verifyOtpAndRegister,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const useIsAdmin   = () => useAuth().dbRole === 'admin';
export const useIsManager = () => { const { dbRole } = useAuth(); return dbRole === 'admin' || dbRole === 'manager'; };
