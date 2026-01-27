import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
    return { data, error };
  };

  const createProfile = async (userId: string, username: string, fullName?: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username,
        full_name: fullName || null,
        is_private: true // Default to private for user privacy
      })
      .select()
      .single();

    if (data) {
      setProfile(data);
    }
    return { data, error };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setIsGuest(false);
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      }

      // Check if user is in guest mode
      const guestMode = localStorage.getItem("guestMode");
      if (guestMode === "true" && !session) {
        setIsGuest(true);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Store remember me preference for UI state
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("savedEmail", email);
      localStorage.setItem("savedPassword", password);
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("savedEmail");
      localStorage.removeItem("savedPassword");
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    // Auto-login logic (Bypass OTP screen if auto-confirm trigger is active)
    if (data.user && !data.session) {
      // Try to sign in immediately assuming the database trigger confirmed the user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!signInError && signInData.session) {
        // Session active, onAuthStateChange will handle state update
        setSession(signInData.session);
        setUser(signInData.user);
      }
    }

    // Create profile for new user
    if (data.user) {
      await createProfile(data.user.id, username, email.split("@")[0]);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setIsGuest(false);
    localStorage.removeItem("guestMode");
    sessionStorage.removeItem("tempSession");
    // Do NOT remove rememberMe or savedEmail
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem("guestMode", "true");
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    // Validate username if provided
    if (updates.username) {
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(updates.username)) {
        throw new Error("اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية، أرقام، نقطة، أو شرطة سفلية");
      }
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    let data, error;

    if (existingProfile) {
      // Update existing profile
      const result = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    } else {
      // Create new profile - username is required
      if (!updates.username) {
        throw new Error("اسم المستخدم مطلوب");
      }
      const result = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: updates.username,
          full_name: updates.full_name || null,
          avatar_url: updates.avatar_url || null,
          is_private: updates.is_private ?? true
        })
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (data) setProfile(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isGuest,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        continueAsGuest,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
