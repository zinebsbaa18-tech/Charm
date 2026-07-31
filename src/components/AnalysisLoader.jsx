import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STEPS_KEYS = ['analysis.step1', 'analysis.step2', 'analysis.step3', 'analysis.step4'];

export default function AnalysisLoader({ onComplete }) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = 2800;
    const interval = 700;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min((elapsed / total) * 100, 100));
      setStepIndex((prev) => Math.min(prev + 1, STEPS_KEYS.length - 1));
      if (elapsed >= total) {
        clearInterval(timer);
        setTimeout(() => onComplete && onComplete(), 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-surface z-50 flex flex-col items-center justify-center gap-8 animate-fade-in">
      {/* Spinner Ring */}
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full border-4 border-surface-container" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary-container transition-all duration-700"
          style={{ transform: `rotate(${progress * 3.6}deg)` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            style
          </span>
        </div>
      </div>

      {/* Brand */}
      <div className="text-center">
        <p className="brand-logo text-primary text-4xl italic mb-2">Charm</p>
        <p className="text-body-md text-on-surface-variant">{t('analysis.loading')}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-64">
        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-container to-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-label-xs text-on-surface-variant text-center mt-3 min-h-[20px] transition-all duration-300">
          {t(STEPS_KEYS[stepIndex])}
        </p>
      </div>

      {/* Floating dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-container animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
