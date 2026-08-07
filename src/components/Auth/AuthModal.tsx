import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, Shield, Building, KeyRound, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { User } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signIn, signUp } from '../../services/database';
import { ThemeToggle } from '../Common/ThemeToggle';

interface AuthModalProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
  isLockedMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onLoginSuccess,
  onClose,
  isLockedMode = false,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'unlock'>(isLockedMode ? 'unlock' : 'login');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(currentUser?.name || '');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'unlock') {
      if (password.length < 4) {
        setError('Le mot de passe doit comporter au moins 4 caractères.');
        return;
      }
      if (currentUser) {
        onLoginSuccess(currentUser);
        setSuccessMsg('Session déverrouillée avec succès !');
        setTimeout(() => onClose && onClose(), 500);
      }
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase n\'est pas configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setError('Veuillez remplir tous les champs.');
          return;
        }

        const { user, error: loginError } = await signIn(email, password);
        if (loginError || !user) {
          setError(loginError || 'Connexion échouée.');
          return;
        }

        onLoginSuccess(user);
        setSuccessMsg('Connexion réussie !');
        setTimeout(() => onClose && onClose(), 500);
      } else if (mode === 'signup') {
        if (!email || !password || !name || !companyName) {
          setError('Veuillez compléter tous les champs requis.');
          return;
        }

        if (password.length < 6) {
          setError('Le mot de passe doit comporter au moins 6 caractères.');
          return;
        }

        const { user, error: signupError } = await signUp(email, password, name, companyName);
        if (signupError || !user) {
          setError(signupError || 'Inscription échouée.');
          return;
        }

        onLoginSuccess(user);
        setSuccessMsg('Compte entreprise créé avec succès !');
        setTimeout(() => onClose && onClose(), 500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    mode === 'unlock'
      ? 'Déverrouiller FacturaCFA'
      : mode === 'login'
        ? 'Connexion'
        : 'Créer votre compte';

  const subtitle =
    mode === 'unlock'
      ? 'Entrez votre mot de passe pour accéder à vos documents.'
      : mode === 'login'
        ? 'Accédez à vos devis, factures et fichiers clients'
        : 'Générez des factures en Francs CFA (XOF/XAF) en 1 clic';

  const inputClass =
    'w-full pl-11 pr-4 py-3 bg-white/80 border border-[#0a3d3a]/12 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#147a72]/35 focus:border-[#147a72]/40 text-sm transition-shadow';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans bg-transparent">
      <div className="min-h-full grid lg:grid-cols-2">
        {/* Brand / visual plane */}
        <aside className="relative min-h-[42vh] lg:min-h-full overflow-hidden bg-[var(--color-brand-ink)] text-[var(--color-brand-sand)]">
          <div
            className="absolute inset-0 auth-drift"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(45,212,191,0.28), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 75%, rgba(20,122,114,0.55), transparent 50%), linear-gradient(165deg, #062e2c 0%, #0a3d3a 45%, #0f4f4a 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.12] auth-shimmer"
            style={{
              backgroundImage:
                'linear-gradient(rgba(243,235,224,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(243,235,224,0.35) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 75% 70% at 50% 40%, black, transparent)',
            }}
          />

          {/* Abstract invoice visual — full-bleed plane, not a floating card collage */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 top-[28%] lg:top-[22%] pointer-events-none"
          >
            <div className="absolute right-[-8%] top-[8%] w-[78%] max-w-[520px] h-[70%] rotate-[-6deg] rounded-[2px] bg-[#faf7f2]/10 border border-[#f3ebe0]/15 backdrop-blur-[2px]" />
            <div className="absolute right-[4%] top-[18%] w-[72%] max-w-[480px] h-[62%] rotate-[-2deg] bg-[#faf7f2]/[0.07] border border-[#f3ebe0]/20 p-8 lg:p-10">
              <div className="h-2 w-28 bg-[#2dd4bf]/50 mb-6" />
              <div className="space-y-3 opacity-70">
                <div className="h-1.5 w-full bg-[#f3ebe0]/25" />
                <div className="h-1.5 w-[88%] bg-[#f3ebe0]/20" />
                <div className="h-1.5 w-[72%] bg-[#f3ebe0]/15" />
                <div className="h-1.5 w-[94%] bg-[#f3ebe0]/20 mt-8" />
                <div className="h-1.5 w-[60%] bg-[#f3ebe0]/15" />
              </div>
              <div className="absolute bottom-8 right-8 w-24 h-10 border border-[#2dd4bf]/40 bg-[#2dd4bf]/10" />
            </div>
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
            <div>
              <p className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#faf7f2] auth-fade-up">
                FacturaCFA
              </p>
              <h1 className="mt-5 max-w-md font-display text-2xl sm:text-3xl lg:text-[2.15rem] font-bold leading-tight text-[#f3ebe0] auth-fade-up auth-fade-up-delay-1">
                Devis et factures en Francs CFA, sans friction.
              </h1>
              <p className="mt-4 max-w-sm text-sm sm:text-base text-[#f3ebe0]/75 leading-relaxed auth-fade-up auth-fade-up-delay-2">
                Créez, personnalisez et exportez vos documents professionnels en XOF / XAF.
              </p>
            </div>

            <p className="hidden lg:flex items-center gap-2 text-xs text-[#f3ebe0]/55 mt-16 auth-fade-up auth-fade-up-delay-3">
              <Shield className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span>Données sécurisées et synchronisées via Supabase</span>
            </p>
          </div>
        </aside>

        {/* Auth form panel */}
        <section className="relative flex items-center justify-center px-5 sm:px-8 py-10 lg:py-16 bg-transparent">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
            <ThemeToggle
              className="!border-brand-ink/15 !text-brand-ink dark:!border-white/15 dark:!text-brand-sand hover:!bg-brand-mist dark:hover:!bg-white/10"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 60% 45% at 90% 10%, rgba(20,122,114,0.08), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(10,61,58,0.06), transparent 50%)',
            }}
          />

          <div className="relative w-full max-w-[420px] auth-panel-in rounded-3xl bg-white/75 dark:bg-[#13201e]/80 backdrop-blur-md border border-white/50 dark:border-white/10 p-6 sm:p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-brand-ink)] dark:text-brand-sand tracking-tight">
                {title}
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-sm rounded-2xl flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-teal-50 border border-teal-200/80 text-teal-800 text-sm rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nom du Responsable
                    </label>
                    <div className="relative">
                      <UserIcon className="w-[18px] h-[18px] text-[#147a72]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Jean Dupont"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nom de l'Entreprise / Société
                    </label>
                    <div className="relative">
                      <Building className="w-[18px] h-[18px] text-[#147a72]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ex: MON ENTREPRISE SARL"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'unlock' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Adresse Email Professionnelle
                  </label>
                  <div className="relative">
                    <Mail className="w-[18px] h-[18px] text-[#147a72]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@votre-entreprise.ci"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mot de passe / Code d'accès
                </label>
                <div className="relative">
                  <KeyRound className="w-[18px] h-[18px] text-[#147a72]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3.5 px-4 bg-[var(--color-brand-ink)] hover:bg-[var(--color-brand-deep)] disabled:opacity-60 text-[#faf7f2] font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'unlock'
                        ? 'Déverrouiller la session'
                        : mode === 'login'
                          ? 'Se connecter'
                          : 'Créer mon espace'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-5 border-t border-[#0a3d3a]/10 flex flex-col items-center gap-2 text-xs text-slate-500">
              {mode === 'login' ? (
                <p>
                  Nouveau sur FacturaCFA ?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-[var(--color-brand-mid)] hover:text-[var(--color-brand-ink)] font-semibold cursor-pointer transition-colors"
                  >
                    Créer un compte
                  </button>
                </p>
              ) : mode === 'signup' ? (
                <p>
                  Déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[var(--color-brand-mid)] hover:text-[var(--color-brand-ink)] font-semibold cursor-pointer transition-colors"
                  >
                    Se connecter
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                >
                  Changer de compte
                </button>
              )}

              <div className="flex lg:hidden items-center gap-1.5 text-slate-400 mt-2 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-[#147a72]" />
                <span>Données sécurisées et synchronisées via Supabase</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
