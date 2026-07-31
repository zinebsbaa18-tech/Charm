import { useState } from 'react';
import { useCloset } from '../context/ClosetContext';

const CATEGORY_LABELS = {
  top: 'Top',
  shoes: 'Shoes',
  accessory: 'Accessory',
  outerwear: 'Outerwear',
};

const itemToId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function ComplementCard({ item, category, reason, imageUrl, allImages }) {
  const allImgs = allImages || [];
  const [imgSrc, setImgSrc] = useState(imageUrl || '');
  const [fallbackIdx, setFallbackIdx] = useState(-1);
  const { saveToCloset, isInCloset } = useCloset();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const complementId = itemToId(item);
  const saved = isInCloset(complementId);

  const handleImgError = () => {
    const nextIdx = fallbackIdx + 1;
    if (nextIdx < allImgs.length) {
      console.log('[ComplementCard] Image error, trying fallback', nextIdx, ':', allImgs[nextIdx]?.slice(0, 80));
      setFallbackIdx(nextIdx);
      setImgSrc(allImgs[nextIdx]);
    } else {
      console.log('[ComplementCard] All images failed, showing placeholder for:', item);
      setImgSrc(`https://picsum.photos/seed/${itemToId(item)}/600/800`);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (saved || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveToCloset({
        outfitId: complementId,
        outfitName: item,
        category: category || 'accessory',
        imageUrl: imgSrc || '',
        garmentTags: [item],
        searchQuery: item,
      });
    } catch (err) {
      console.error('[ComplementCard] save failed:', err);
      setSaveError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleShop = () => {
    const query = encodeURIComponent(item);
    window.open(`https://www.google.com/search?tbm=shop&q=${query}`, '_blank', 'noopener');
  };

  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <div className="complement-card bg-surface-container-lowest rounded-2xl overflow-hidden med-shadow border border-outline-variant/20">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface-container">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-label-sm">
            No image
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-2 start-2">
          <span className="bg-surface/80 backdrop-blur-sm text-on-surface text-label-xs px-2 py-0.5 rounded-full">
            {categoryLabel}
          </span>
        </div>
        {/* Save heart */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`absolute top-2 end-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
            saved ? 'bg-primary/20 text-primary' : 'bg-surface/80 text-on-surface-variant hover:bg-primary/10 hover:text-primary'
          }`}
          title={saved ? 'Saved' : 'Save to closet'}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          >
            {saving ? 'hourglass_empty' : 'favorite'}
          </span>
        </button>
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-label-md font-semibold text-on-surface truncate">{item}</p>
        {reason && (
          <p className="text-label-xs text-on-surface-variant mt-1 leading-tight">{reason}</p>
        )}
        {saveError && (
          <p className="text-label-xs text-error mt-1">{saveError}</p>
        )}
        <button
          onClick={handleShop}
          className="mt-2 w-full bg-surface-container text-on-surface-variant text-label-sm py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px] align-middle me-1">search</span>
          Shop
        </button>
      </div>
    </div>
  );
}
