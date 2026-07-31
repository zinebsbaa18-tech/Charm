import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const QUOTES = [
  { text: "Style is a way to say who you are without having to speak.", author: "Rachel Zoe" },
  { text: "Fashion fades, only style remains the same.", author: "Coco Chanel" },
  { text: "Style is knowing who you are, what you want to say, and not giving a damn.", author: "Orson Welles" },
  { text: "Elegance is not about being noticed, it's about being remembered.", author: "Giorgio Armani" },
];

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);

  const scheduleNext = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setQuoteVisible(false);
      timeoutRef.current = setTimeout(() => {
        setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 5500);
  }, []);

  useEffect(() => {
    scheduleNext();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [scheduleNext]);

  const goToQuote = (idx) => {
    if (idx === quoteIdx) return;
    clearInterval(timerRef.current);
    clearTimeout(timeoutRef.current);
    setQuoteVisible(false);
    timeoutRef.current = setTimeout(() => {
      setQuoteIdx(idx);
      setQuoteVisible(true);
      scheduleNext();
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(.*\)\.?/, '') || t('errors.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(.*\)\.?/, '') || t('errors.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex relative">
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left Panel - Animated gradient full-bleed with quote carousel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] animated-auth-gradient p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -start-20 w-80 h-80 bg-primary-fixed/20 rounded-full blur-3xl animated-blob" />
          <div className="absolute bottom-20 end-10 w-64 h-64 bg-on-primary/10 rounded-full blur-3xl animated-blob" />
        </div>
        <div className="relative z-10 flex flex-col justify-between flex-1">
          <div className="brand-logo text-on-primary text-5xl italic auth-text-shadow">Charm</div>
          <div className="min-h-[11rem] auth-text-shadow">
            <div className={`transition-all duration-[400ms] ease-out ${quoteVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <blockquote className="text-display-lg text-on-primary font-display leading-tight mb-6" style={{ fontFamily: '"Bodoni Moda", serif', fontStyle: 'italic' }}>
                &ldquo;{QUOTES[quoteIdx].text}&rdquo;
              </blockquote>
              <p className="text-on-primary/80 text-body-md">&mdash; {QUOTES[quoteIdx].author}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => goToQuote(i)}
                className={`h-1 rounded-full bg-on-primary transition-all duration-300 cursor-pointer ${
                  i === quoteIdx ? 'w-8 opacity-100' : 'w-2 opacity-40 hover:opacity-60'
                }`}
                aria-label={`Go to quote ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 lg:px-16">
        <div className="lg:hidden brand-logo text-primary text-4xl italic mb-8">Charm</div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h1 className="text-display-lg font-body font-semibold text-on-surface mb-2">{t('auth.welcomeBack')}</h1>
            <p className="text-body-lg text-on-surface-variant">{t('auth.tagline')}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-error-container text-on-error-container rounded-2xl text-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="relative">
              <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 start-5 text-on-surface-variant text-[20px]">mail</span>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                className="input-field ps-12"
              />
            </div>
            {/* Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 start-5 text-on-surface-variant text-[20px]">lock</span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                className="input-field ps-12 pe-12"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute top-1/2 -translate-y-1/2 end-5 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-label-lg text-primary hover:underline">{t('auth.forgotPassword')}</Link>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  {t('auth.signIn')}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/50" />
            <span className="text-label-sm text-on-surface-variant">{t('auth.orContinueWith')}</span>
            <div className="flex-1 h-px bg-outline-variant/50" />
          </div>

          {/* Google */}
          <button
            id="login-google"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border-2 border-outline-variant/40 rounded-full py-3.5 text-label-lg font-semibold text-on-surface hover:bg-surface-container transition-all duration-200 active:scale-98"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M47.532 24.552c0-1.636-.132-3.2-.385-4.693H24v8.98h13.228c-.594 3.07-2.336 5.666-4.92 7.396v6.145h7.956c4.652-4.285 7.268-10.6 7.268-17.828z" fill="#4285F4"/>
              <path d="M24 48c6.48 0 11.916-2.148 15.892-5.82l-7.956-6.145c-2.136 1.44-4.876 2.3-7.936 2.3-6.1 0-11.266-4.12-13.107-9.652H2.64v6.344C6.6 42.712 14.74 48 24 48z" fill="#34A853"/>
              <path d="M10.893 28.683A14.54 14.54 0 0 1 9.5 24c0-1.643.28-3.232.784-4.683v-6.344H2.64A23.916 23.916 0 0 0 0 24c0 3.86.924 7.52 2.64 10.727l8.253-6.044z" fill="#FBBC05"/>
              <path d="M24 9.548c3.432 0 6.512 1.18 8.936 3.496l6.696-6.696C35.916 2.564 30.48 0 24 0 14.74 0 6.6 5.288 2.64 13.273l8.253 6.044C12.734 13.668 17.9 9.548 24 9.548z" fill="#EA4335"/>
            </svg>
            {t('auth.continueGoogle')}
          </button>

          <p className="text-center text-label-lg text-on-surface-variant mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" id="goto-register" className="text-primary font-semibold hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
