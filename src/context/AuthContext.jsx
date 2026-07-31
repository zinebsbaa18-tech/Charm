import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    setError('');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, displayName) => {
    setError('');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred;
  };

  const loginWithGoogle = () => {
    setError('');
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
