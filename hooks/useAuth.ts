import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile, UserProfile } from '../services/firebase';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    hasAccess: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          await createUserProfile(user);
          profile = await getUserProfile(user.uid);
        }

        const now = new Date();
        const accessExpiry = profile?.accessExpiresAt?.toDate();
        const hasAccess = profile?.role === 'admin' || (accessExpiry && accessExpiry > now);
        const isAdmin = profile?.role === 'admin' || user.email === 'jashimmirza@gmail.com';

        setState({
          user,
          profile,
          loading: false,
          isAdmin: !!isAdmin,
          hasAccess: !!hasAccess
        });
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          isAdmin: false,
          hasAccess: false
        });
      }
    });

    return unsubscribe;
  }, []);

  return state;
};
