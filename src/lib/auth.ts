import { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        // Check if email matches allowed email
        if (ALLOWED_EMAIL && userEmail !== ALLOWED_EMAIL) {
          await signOut(auth);
          setUser(null);
          setError(`Unauthorized email address: ${currentUser.email}. Only ${ALLOWED_EMAIL} is permitted to access this application.`);
        } else {
          setUser(currentUser);
          setError(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      // Trigger popup immediately on the direct user click gesture (no intervening await)
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase().trim();
      
      if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL) {
        await signOut(auth);
        setUser(null);
        const errMsg = `Unauthorized email address: ${result.user.email}. Access denied.`;
        setError(errMsg);
      } else {
        setUser(result.user);
        setError(null);
      }
    } catch (err: any) {
      // Don't log or show error if user closed or cancelled the popup
      if (err?.code === 'auth/popup-closed-by-user' || 
          err?.code === 'auth/cancelled-popup-request' || 
          err?.message?.includes('popup-closed-by-user')) {
        return;
      }
      console.error('Google Sign In Error:', err);
      let msg = err?.message || 'Failed to sign in with Google';
      if (msg.includes('requests-from-referer') || err?.code === 'auth/unauthorized-domain' || msg.includes('blocked')) {
        msg = `Domain / Referrer Restriction: This domain is not authorized in your Google Cloud / Firebase console. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains and Google Cloud Console > APIs & Services > Credentials > API Key restrictions.`;
      } else if (err?.code === 'auth/configuration-not-found' || msg.includes('configuration-not-found')) {
        msg = `Google Sign-in is not enabled in your Firebase Project. To enable: Go to Firebase Console > Authentication > Sign-in method tab > Click "Google" > Enable it > Select Project Support Email > Click Save.`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn('Sign Out Warning:', err?.message || err);
    } finally {
      setUser(null);
      setError(null);
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
