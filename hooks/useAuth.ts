import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile, UserProfile } from '../services/firebase';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  isSuspended: boolean;
  error?: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    hasAccess: false,
    isSuspended: false,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            await createUserProfile(user);
            profile = await getUserProfile(user.uid);
          }

          const now = new Date();
          const accessExpiry = profile?.accessExpiresAt?.toDate();
          const isSuspended = profile?.status === 'suspended';
          const hasAccess = !isSuspended && (profile?.role === 'admin' || (accessExpiry && accessExpiry > now));
          const isAdmin = profile?.role === 'admin' || user.email === 'jashimmirza@gmail.com' || user.email === 'rakib560753@gmail.com';

          setState({
            user,
            profile,
            loading: false,
            isAdmin: !!isAdmin,
            hasAccess: !!hasAccess,
            isSuspended,
            error: null
          });
        } catch (error: any) {
          console.error("Auth Hook Error:", error);
          let message = error.message || String(error);
          try {
             const parsed = JSON.parse(message);
             if (parsed.error) message = parsed.error;
          } catch(e) {}

          setState({
            user,
            profile: null,
            loading: false,
            isAdmin: user.email === 'jashimmirza@gmail.com' || user.email === 'rakib560753@gmail.com',
            hasAccess: false,
            isSuspended: false,
            error: "Failed to load profile: " + message
          });
        }
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          isAdmin: false,
          hasAccess: false,
          isSuspended: false,
          error: null
        });
      }
    });

    return unsubscribe;
  }, []);

  return state;
};
