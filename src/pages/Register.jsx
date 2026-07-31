import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Register() {
  const { t } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
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

  const fields = [
    { id: 'register-name', field: 'name', type: 'text', icon: 'person', placeholder: t('auth.fullName') },
    { id: 'register-email', field: 'email', type: 'email', icon: 'mail', placeholder: t('auth.email') },
    { id: 'register-password', field: 'password', type: showPass ? 'text' : 'password', icon: 'lock', placeholder: t('auth.password') },
    { id: 'register-confirm', field: 'confirm', type: showPass ? 'text' : 'password', icon: 'lock_reset', placeholder: t('auth.confirmPassword') },
  ];

  const FEATURES = [
    { icon: 'photo_camera', title: 'Upload Any Garment' },
    { icon: 'auto_awesome', title: 'AI Outfit Analysis' },
    { icon: 'checkroom', title: 'Personal Closet' },
    { icon: 'language', title: 'English & Français' },
  ];

  return (
    <div className="min-h-screen bg-surface flex relative">
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left Panel - Animated gradient full-bleed with feature highlights */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] animated-auth-gradient p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -end-20 w-80 h-80 bg-primary-fixed/20 rounded-full blur-3xl animated-blob" />
          <div className="absolute bottom-20 -start-10 w-64 h-64 bg-on-primary/10 rounded-full blur-3xl animated-blob" />
        </div>
        <div className="relative z-10">
          <div className="brand-logo text-on-primary text-5xl italic auth-text-shadow">Charm</div>
        </div>
        <div className="relative z-10 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div key={f.icon} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]">{f.icon}</span>
              </div>
              <p className="text-label-lg font-semibold text-on-primary auth-text-shadow">{f.title}</p>
            </div>
          ))}
        </div>
        <div className="relative z-10 flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-1 rounded-full bg-on-primary ${i === 0 ? 'w-8' : 'w-2 opacity-40'}`} />
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 lg:px-16 overflow-y-auto">
        <div className="lg:hidden brand-logo text-primary text-4xl italic mb-8">Charm</div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h1 className="text-display-lg font-body font-semibold text-on-surface mb-2">{t('auth.createAccount')}</h1>
            <p className="text-body-lg text-on-surface-variant">{t('auth.tagline')}</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-error-container text-on-error-container rounded-2xl text-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map((f) => (
              <div key={f.field} className="relative">
                <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 start-5 text-on-surface-variant text-[20px]">{f.icon}</span>
                <input
                  id={f.id}
                  type={f.type}
                  required
                  value={form[f.field]}
                  onChange={update(f.field)}
                  placeholder={f.placeholder}
                  className="input-field ps-12 pe-12"
                />
                {(f.field === 'password' || f.field === 'confirm') && (
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute top-1/2 -translate-y-1/2 end-5 text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                )}
              </div>
            ))}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  {t('auth.register')}
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/50" />
            <span className="text-label-sm text-on-surface-variant">{t('auth.orContinueWith')}</span>
            <div className="flex-1 h-px bg-outline-variant/50" />
          </div>

          <button
            id="register-google"
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
            {t('auth.haveAccount')}{' '}
            <Link to="/login" id="goto-login" className="text-primary font-semibold hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
