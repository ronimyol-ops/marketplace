import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppPermission = Database['public']['Enums']['app_permission'];

// Some permissions are essentially aliases of older/shorter permissions.
// For example, the uploaded admin HTML uses "Review items" while the app
// historically used "review_ads".
const PERMISSION_GROUPS: Partial<Record<AppPermission, AppPermission[]>> = {
  review_ads: ['review_ads', 'review_items'],
  manage_users: ['manage_users', 'manage_site_users', 'search_site_users'],
  search_ads: [
    'search_ads',
    'search_archived_ads',
    'search_pending_ads',
    'search_enqueued_ads',
    'search_published_rejected_ads',
  ],
  search_emails: ['search_emails'],
  manage_reports: ['manage_reports', 'manage_blacklists'],
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  permissions: AppPermission[];
  hasPermission: (permission: AppPermission) => boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Avoid blocking the auth change callback.
        setTimeout(() => {
          checkAdminAndPermissions(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setPermissions([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminAndPermissions(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminAndPermissions = async (userId: string) => {
    // Check admin role (only active roles count)
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle();

    if (roleError) {
      // If something goes wrong, fail closed.
      setIsAdmin(false);
      setPermissions([]);
      return;
    }

    const isAdminUser = !!adminRole;
    setIsAdmin(isAdminUser);

    if (!isAdminUser) {
      setPermissions([]);
      return;
    }

    // Fetch permissions (legacy admins might have none; UI falls back to "allow all")
    const { data: permsData } = await supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', userId);

    setPermissions((permsData ?? []).map(p => p.permission as AppPermission));
  };

  const hasPermission = useMemo(() => {
    return (permission: AppPermission) => {
      if (!isAdmin) return false;
      // Backwards compatibility: if permissions haven't been set up yet, allow.
      if (!permissions || permissions.length === 0) return true;
      const group = PERMISSION_GROUPS[permission] ?? [permission];
      return group.some((p) => permissions.includes(p));
    };
  }, [isAdmin, permissions]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, permissions, hasPermission, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
