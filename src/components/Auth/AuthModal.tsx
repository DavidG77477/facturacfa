import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, Shield, Building, KeyRound, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { User } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signIn, signUp } from '../../services/database';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'unlock'
              ? 'Déverrouiller FacturaCFA'
              : mode === 'login'
              ? 'Connexion Sécurisée'
              : 'Créer votre compte Entreprise'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'unlock'
              ? 'Entrez votre mot de passe pour accéder à vos documents.'
              : mode === 'login'
              ? 'Accédez à vos devis, factures et fichiers clients'
              : 'Générez des factures en Francs CFA (XOF/XAF) en 1 clic'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nom du Responsable
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Nom de l'Entreprise / Société
                </label>
                <div className="relative">
                  <Building className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: MON ENTREPRISE SARL"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {mode !== 'unlock' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Adresse Email Professionnelle
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@votre-entreprise.ci"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Mot de passe / Code d'accès
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
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
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              Nouveau sur FacturaCFA ?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
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
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
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

          <div className="flex items-center gap-1.5 text-slate-400 mt-2 text-[11px]">
            <Shield className="w-3.5 h-3.5" />
            <span>Données sécurisées et synchronisées via Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
