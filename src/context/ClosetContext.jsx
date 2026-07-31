import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const ClosetContext = createContext(null);

export function ClosetProvider({ children }) {
  const { user } = useAuth();
  const [closetItems, setClosetItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listenerError, setListenerError] = useState(null);

  useEffect(() => {
    if (!user) {
      setClosetItems([]);
      return;
    }
    setListenerError(null);
    const q = query(
      collection(db, 'users', user.uid, 'closet'),
      orderBy('savedAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClosetItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('[ClosetContext] onSnapshot error:', err);
        setListenerError(err);
      }
    );
    return unsub;
  }, [user]);

  const saveToCloset = useCallback(async (outfit) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'closet'), {
        ...outfit,
        savedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[ClosetContext] saveToCloset failed:', err);
      throw err; // re-throw so callers can react (e.g. show error state)
    } finally {
      setLoading(false);
    }
  }, [user]);

  const removeFromCloset = useCallback(async (outfitId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'closet', outfitId));
  }, [user]);

  const isInCloset = useCallback((outfitId) => {
    return closetItems.some((item) => item.outfitId === outfitId);
  }, [closetItems]);

  return (
    <ClosetContext.Provider value={{ closetItems, loading, listenerError, saveToCloset, removeFromCloset, isInCloset }}>
      {children}
    </ClosetContext.Provider>
  );
}

export const useCloset = () => {
  const ctx = useContext(ClosetContext);
  if (!ctx) throw new Error('useCloset must be inside ClosetProvider');
  return ctx;
};
