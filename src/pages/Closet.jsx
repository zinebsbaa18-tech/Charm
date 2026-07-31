import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// Navbar handled by Layout
import OutfitCard from '../components/OutfitCard';
import { useCloset } from '../context/ClosetContext';

const FILTERS = ['all', 'casual', 'smart', 'evening'];

export default function Closet() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { closetItems, loading, removeFromCloset } = useCloset();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? closetItems
    : closetItems.filter((i) => i.category === filter);

  return (
    <div className="bg-surface flex flex-col">
      <main className="flex-1 pt-8 pb-32 px-5 md:px-16 max-w-container mx-auto w-full">
        {/* Header */}
        <div className="mb-12 text-center animate-slide-up">
          <h1 className="text-display-xl font-display text-primary mb-3 italic">
            {t('closet.title')}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {t('closet.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
          </div>
        ) : closetItems.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto text-center mt-16 animate-fade-in">
            <div className="w-32 h-32 mx-auto bg-surface-container rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">checkroom</span>
            </div>
            <h2 className="text-headline-md font-body font-semibold text-on-surface mb-2">
              {t('closet.empty')}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-8">
              {t('closet.emptyDesc')}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              {t('closet.uploadNow')}
            </button>
          </div>
        ) : (
          /* Populated Closet */
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 border-b border-outline-variant/30 pb-6">
              <p className="text-label-lg text-on-surface-variant font-semibold">
                {t('closet.count').replace('{{count}}', closetItems.length)}
              </p>
              
              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto hide-scrollbar">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-label-sm font-semibold transition-colors ${
                      filter === f 
                        ? 'bg-on-surface text-surface' 
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {t(`closet.filter.${f}`)}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-body-md text-on-surface-variant">No items found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((item) => (
                  <div key={item.id} className="relative group">
                    <OutfitCard 
                      outfit={{...item, id: item.outfitId}} 
                      onViewDetail={() => navigate(`/detail/${item.outfitId}`, { state: { outfit: item } })}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCloset(item.id); }}
                      className="absolute top-3 end-3 w-10 h-10 bg-surface/90 backdrop-blur-md rounded-full flex items-center justify-center text-error opacity-0 group-hover:opacity-100 transition-all hover:bg-error hover:text-on-error shadow-soft scale-90 hover:scale-100 z-10"
                      title={t('closet.remove')}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
