import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useChats } from '../context/ChatContext';
import LanguageSwitcher from './LanguageSwitcher';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { chats, listenerError, deleteChat } = useChats();
  const location = useLocation();

  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const isActive = (path) => location.pathname === path || (path === '/chat' && location.pathname === '/');

  const handleDelete = useCallback(async (chatId) => {
    setDeleteError('');
    try {
      await deleteChat(chatId);
      // If the deleted chat is currently open, navigate to new chat
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/chat/new', { replace: true });
      }
    } catch (err) {
      console.error('[Sidebar] Delete failed:', err);
      setDeleteError(err?.message || 'Failed to delete chat');
    } finally {
      setConfirmingDelete(null);
    }
  }, [deleteChat, location.pathname, navigate]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 z-50 flex flex-col w-[280px] bg-surface-container-low border-outline-variant/30 overflow-y-auto transition-transform duration-300 left-0 border-r
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Profile Section */}
        <div className="p-8 pb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xl">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.displayName?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-body-lg text-on-surface font-semibold truncate">
              {user?.displayName || 'User'}
            </h3>
            <span className="font-label-sm text-on-surface-variant text-[11px] uppercase tracking-wider opacity-60 truncate block">
              Premium Member
            </span>
          </div>
          <button className="lg:hidden ms-auto text-on-surface-variant" onClick={onClose}>
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Primary Nav */}
        <nav className="px-4 flex flex-col gap-2 mb-8">
          <Link
            to="/chat"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-body-md transition-all ${
              isActive('/chat') 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
            <span>New Chat</span>
          </Link>
          <Link
            to="/closet"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-body-md transition-all ${
              isActive('/closet') 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">checkroom</span>
            <span>{t('nav.closet')}</span>
          </Link>
        </nav>

        {/* Chat History */}
        <div className="flex-1 px-4 mb-8">
          <h4 className="font-label-sm text-on-surface-variant mb-3 px-4 opacity-70 uppercase tracking-wider">
            Recent Chats
          </h4>
          <div className="space-y-1">
            {listenerError ? (
              <p className="px-4 py-3 text-label-sm text-error">Firestore error: {listenerError.message || listenerError.code || 'Unknown error'}</p>
            ) : chats.length === 0 ? (
              <p className="px-4 py-3 text-label-sm text-on-surface-variant/60">No chats yet</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="group relative flex items-center rounded-2xl overflow-hidden"
                >
                  {confirmingDelete === chat.id ? (
                    // ── Delete confirmation inline ──
                    <div className="flex items-center justify-between w-full px-4 py-3 bg-error/5 border border-error/20 rounded-2xl">
                      <span className="text-label-sm text-error font-semibold">Delete this chat?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                          className="w-7 h-7 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors text-[16px]"
                          title="Confirm delete"
                        >
                          <span className="material-symbols-outlined text-lg">check</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmingDelete(null); setDeleteError(''); }}
                          className="w-7 h-7 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-surface-variant/80 transition-colors text-[16px]"
                          title="Cancel"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Chat item ──
                    <>
                      <button
                        onClick={() => { navigate(`/chat/${chat.id}`); onClose(); }}
                        className="flex-1 flex items-center gap-3 px-4 py-3 text-start hover:bg-surface-variant/50 transition-all"
                      >
                        <div className="w-9 h-9 rounded-xl bg-surface-variant flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary/60 text-[18px]">apparel</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-on-surface truncate">{chat.title}</p>
                          <p className="text-[12px] text-on-surface-variant truncate">{formatTime(chat.createdAt)}</p>
                        </div>
                      </button>
                      {/* Delete button — visible on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmingDelete(chat.id); setDeleteError(''); }}
                        className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          {deleteError && (
            <p className="mt-2 px-4 py-2 text-label-xs text-error bg-error/5 rounded-xl">{deleteError}</p>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-outline-variant/30 mt-auto flex flex-col gap-2">
          <div className="px-2">
            <LanguageSwitcher />
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-5 py-3 w-full rounded-full text-error hover:bg-error/10 transition-colors text-label-lg font-semibold"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
