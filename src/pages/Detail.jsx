import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCloset } from '../context/ClosetContext';

export default function Detail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { saveToCloset, isInCloset } = useCloset();
  const [saving,          setSaving]          = useState(false);

  const { id } = useParams();
  const stateOutfit = location.state?.outfit;
  const outfit = stateOutfit?.id === id ? stateOutfit : null;

  const [saved, setSaved] = useState(() => (outfit ? isInCloset(outfit.id) : false));

  if (!outfit) {
    navigate(-1);
    return null;
  }

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await saveToCloset({
        outfitId:    outfit.id,
        outfitName:  outfit.name ?? outfit.outfitName,
        category:    outfit.category,
        imageUrl:    outfit.imageUrl ?? outfit.products?.[0]?.imageUrl ?? '',
        garmentTags: outfit.tags ?? [],
        searchQuery: outfit.searchQuery ?? '',
      });
      setSaved(true);
    } catch (err) {
      console.error('[Detail] save failed:', err);
      alert(err?.code === 'permission-denied'
        ? 'Save failed: Firestore rules are blocking writes. Go to Firebase Console → Firestore → Rules and allow authenticated users to write to their closet.'
        : `Save failed: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface flex flex-col">
      <main className="flex-1 pt-8 pb-32 px-5 md:px-16 max-w-container mx-auto w-full animate-fade-in">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 text-label-lg font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {t('detail.back')}
        </button>

        <div className="flex flex-col lg:flex-row gap-12 items-start">

          {/* Left — Image */}
          <div className="w-full lg:w-1/2">
            <div className="rounded-[2.5rem] overflow-hidden shadow-mediterranean relative animate-slide-up border border-outline-variant/20">
              <img
                src={outfit.imageUrl ?? outfit.garmentImage}
                alt={outfit.name ?? outfit.outfitName}
                className="w-full h-[60vh] lg:h-[75vh] object-cover"
              />
            </div>
          </div>

          {/* Right — Info */}
          <div className="w-full lg:w-1/2 flex flex-col gap-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>

            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-primary-container text-on-primary-container text-label-sm px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider">
                  {t(`results.filter.${outfit.category}`)}
                </span>
              </div>
              <h1 className="text-display-lg font-display text-on-surface mb-2">
                {outfit.name ?? outfit.outfitName}
              </h1>
              <p className="text-body-lg text-on-surface-variant">
                {t('detail.occasion')}: {outfit.occasion ?? 'Everyday Wear'}
              </p>
            </div>

            {/* Styling notes */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-card border border-outline-variant/30">
              <h2 className="text-headline-sm font-body font-semibold text-on-surface mb-4">
                {t('detail.stylingNotes')}
              </h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {outfit.stylingNotes ?? 'This ensemble perfectly balances comfort and sophistication. Accessorize minimally with gold or silver accents and complete the look with structured footwear.'}
              </p>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {(outfit.tags ?? outfit.garmentTags ?? []).map((tag) => (
                  <span key={tag} className="bg-surface-container text-on-surface-variant px-4 py-2 rounded-full text-label-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saved || saving}
              className={`w-full md:w-auto py-4 px-8 rounded-full font-body font-semibold text-label-lg flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 shadow-soft ${
                saved
                  ? 'bg-surface-container-high text-on-surface-variant cursor-default border border-outline-variant/40'
                  : 'bg-mustard text-on-surface hover:brightness-105'
              }`}
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
              ) : (
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {saved ? 'check_circle' : 'favorite'}
                </span>
              )}
              {saved ? t('detail.saved') : t('detail.saveToCloset')}
            </button>
          </div>
        </div>



      </main>
    </div>
  );
}