import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCloset } from '../context/ClosetContext';

const CATEGORY_STYLES = {
  casual: 'chip-casual',
  smart: 'chip-smart',
  evening: 'chip-evening',
};

const CATEGORY_ICONS = {
  casual: 'weekend',
  smart: 'work',
  evening: 'nightlife',
};

export default function OutfitCard({ outfit, onViewDetail }) {
  const { t } = useTranslation();
  const { saveToCloset, isInCloset } = useCloset();
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(() => isInCloset(outfit.id));
  const [saveError, setSaveError] = useState('');
  const allImages = outfit.allImages || [];
  const initialSrc = outfit.imageUrl ?? outfit.garmentImage ?? '';
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [fallbackIdx, setFallbackIdx] = useState(-1);

  const handleSave = async (e) => {
    e.stopPropagation();
    if (saved || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveToCloset({
        outfitId:    outfit.id,
        outfitName:  outfit.name,
        category:    outfit.category,
        imageUrl:    outfit.imageUrl ?? outfit.garmentImage ?? '',
        garmentTags: outfit.tags ?? [],
        searchQuery: outfit.searchQuery ?? '',
      });
      setSaved(true);
    } catch (err) {
      console.error('[OutfitCard] save failed:', err);
      setSaveError(err?.code === 'permission-denied'
        ? 'Check Firestore rules'
        : err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImgError = () => {
    const nextIdx = fallbackIdx + 1;
    if (nextIdx < allImages.length) {
      console.log('[OutfitCard] Image error, trying fallback', nextIdx, ':', allImages[nextIdx]?.slice(0, 80));
      setFallbackIdx(nextIdx);
      setImgSrc(allImages[nextIdx]);
    } else {
      console.log('[OutfitCard] All images failed, showing placeholder for:', outfit.name);
      setImgSrc(`https://picsum.photos/seed/${outfit.id || outfit.name}/600/800`);
    }
  };

  return (
    <div
      id={`outfit-card-${outfit.id}`}
      className="outfit-card relative bg-surface-container-lowest rounded-3xl overflow-hidden med-shadow border border-outline-variant/20 cursor-pointer"
      onClick={() => onViewDetail && onViewDetail(outfit)}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container">
        <img
          src={imgSrc}
          alt={outfit.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleImgError}
        />
        {/* Overlay */}
        <div className="card-overlay absolute inset-0 bg-gradient-to-t from-on-surface/60 via-on-surface/10 to-transparent flex flex-col justify-end p-4">
          <button
            id={`view-detail-${outfit.id}`}
            className="w-full bg-surface/90 backdrop-blur-sm text-on-surface text-label-lg font-semibold py-2.5 rounded-full text-center transition-transform active:scale-95"
            onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(outfit); }}
          >
            {t('results.viewDetail')}
          </button>
        </div>
        {/* Category Chip */}
        <div className="absolute top-3 start-3">
          <span className={CATEGORY_STYLES[outfit.category] || 'chip-casual'}>
            <span className="material-symbols-outlined text-[14px] align-middle me-1">{CATEGORY_ICONS[outfit.category] || 'style'}</span>
            {t(`results.filter.${outfit.category}`)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-headline-sm font-body font-semibold text-on-surface truncate">{outfit.name}</h3>
            <p className="text-label-xs text-on-surface-variant mt-0.5">{outfit.occasion}</p>
          </div>
          {/* Save Heart */}
          <button
            id={`save-outfit-${outfit.id}`}
            onClick={handleSave}
            disabled={saving}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${saved ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'}`}
            title={saved ? t('results.saved') : t('results.saveToCloset')}
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>
              {saving ? 'hourglass_empty' : 'favorite'}
            </span>
          </button>
        </div>

        {/* Save error */}
        {saveError && (
          <p className="text-label-xs text-error mt-1">{saveError}</p>
        )}

        {/* Complementary item tags */}
        {outfit.tags && outfit.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {outfit.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-surface-container text-on-surface-variant text-label-xs px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Shop button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const query = encodeURIComponent(outfit.searchQuery || outfit.name || outfit.tags?.[0] || '');
            window.open(`https://www.google.com/search?tbm=shop&q=${query}`, '_blank', 'noopener');
          }}
          className="mt-2 w-full bg-surface-container text-on-surface-variant text-label-sm py-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px] align-middle me-1">search</span>
          Shop
        </button>
      </div>
    </div>
  );
}