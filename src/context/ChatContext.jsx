import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, getDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listenerError, setListenerError] = useState(null);

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    setListenerError(null);
    const q = query(
      collection(db, 'users', user.uid, 'chats'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        console.log('[ChatContext] onSnapshot received', docs.length, 'chats');
        setChats(docs);
      },
      (err) => {
        console.error('[ChatContext] onSnapshot error:', err.code, err.message);
        setListenerError(err);
      }
    );
    return unsub;
  }, [user]);

  const saveChat = useCallback(async ({ title, messages }) => {
    if (!user) throw new Error('Not authenticated');
    console.log('[ChatContext] saveChat starting, user:', user.uid);
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'chats'), {
        title,
        messages,
        createdAt: serverTimestamp(),
      });
      console.log('[ChatContext] saveChat success, docId:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('[ChatContext] saveChat failed:', err.code, err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateChat = useCallback(async (chatId, { title, messages }) => {
    if (!user || !chatId) return;
    await updateDoc(doc(db, 'users', user.uid, 'chats', chatId), {
      title,
      messages,
    });
  }, [user]);

  const getChat = useCallback(async (chatId) => {
    if (!user || !chatId) return null;
    const docSnap = await getDoc(doc(db, 'users', user.uid, 'chats', chatId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }, [user]);

  const deleteChat = useCallback(async (chatId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'chats', chatId));
  }, [user]);

  return (
    <ChatContext.Provider value={{ chats, loading, listenerError, saveChat, updateChat, getChat, deleteChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChats = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChats must be inside ChatProvider');
  return ctx;
};
