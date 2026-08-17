import { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const ALLOWED_EMAIL = (import.meta.env.VITE_ALLOWED_EMAIL || 'mkjain000@gmail.com').toLowerCase().trim();

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  allowedEmail: string;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Explicitly enforce local persistence in browser/PWA
        await setPersistence(auth, browserLocalPersistence);

        // Process any pending redirect authentication result first
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isMounted) {
          const email = (redirectResult.user.email || '').toLowerCase().trim();
          if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL) {
            await signOut(auth);
            setUser(null);
            setError(`Unauthorized email address: ${redirectResult.user.email}. Access denied.`);
            if (typeof window !== 'undefined') {
              alert(`Unauthorized email address: ${redirectResult.user.email}\nOnly ${ALLOWED_EMAIL} is allowed to log in.`);
            }
            setLoading(false);
            return;
          } else {
            setUser(redirectResult.user);
            setError(null);
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Redirect / Persistence error:', err);
          let msg = err?.message || 'Authentication error';
          if (msg.includes('requests-from-referer') || err?.code === 'auth/unauthorized-domain' || msg.includes('blocked')) {
            msg = `Domain / Referrer Restriction: This domain is not authorized in your Google Cloud / Firebase console. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.`;
          } else if (err?.code === 'auth/configuration-not-found' || msg.includes('configuration-not-found')) {
            msg = `Google Sign-in is not enabled in your Firebase Project. Go to Firebase Console > Authentication > Sign-in method > Enable Google.`;
          }
          setError(msg);
        }
      }

      // Attach listener to track user session state changes
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;

        if (currentUser) {
          const userEmail = (currentUser.email || '').toLowerCase().trim();
          if (ALLOWED_EMAIL && userEmail !== ALLOWED_EMAIL) {
            await signOut(auth);
            if (isMounted) {
              setUser(null);
              setError(`Unauthorized email address: ${currentUser.email}. Only ${ALLOWED_EMAIL} is permitted to access this application.`);
              if (typeof window !== 'undefined') {
                alert(`Unauthorized email address: ${currentUser.email}\nOnly ${ALLOWED_EMAIL} is allowed to log in.`);
              }
            }
          } else {
            if (isMounted) {
              setUser(currentUser);
              setError(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
        if (isMounted) {
          setLoading(false);
        }
      });

      return unsubscribe;
    }

    let unsubscribeFn: (() => void) | undefined;
    initAuth().then((unsub) => {
      unsubscribeFn = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Ensure persistence is set before initiating redirect
      await setPersistence(auth, browserLocalPersistence);
      
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      let msg = err?.message || 'Failed to initiate Google sign in';
      if (msg.includes('requests-from-referer') || err?.code === 'auth/unauthorized-domain' || msg.includes('blocked')) {
        msg = `Domain / Referrer Restriction: This domain is not authorized in your Google Cloud / Firebase console. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (err?.code === 'auth/configuration-not-found' || msg.includes('configuration-not-found')) {
        msg = `Google Sign-in is not enabled in your Firebase Project. Go to Firebase Console > Authentication > Sign-in method > Enable Google.`;
      }
      setError(msg);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    allowedEmail: ALLOWED_EMAIL
  };
}
