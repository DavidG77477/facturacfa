import React, { useEffect, useState } from 'react';
import {
  Building,
  Save,
  FileText,
  CheckCircle2,
  MapPin,
  CreditCard,
  Image as ImageIcon,
  Upload,
  Trash2,
  Link,
  Stamp,
  PenTool,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { BusinessProfile } from '../../types';
import { deleteBusinessAsset, uploadBusinessAsset, BusinessAssetKind } from '../../services/assetStorage';

interface CompanySettingsProps {
  userId: string;
  businessProfile: BusinessProfile;
  onSave: (updatedProfile: BusinessProfile) => Promise<void> | void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  userId,
  businessProfile,
  onSave,
}) => {
  const [profile, setProfile] = useState<BusinessProfile>(businessProfile);
  const [savedMsg, setSavedMsg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState<BusinessAssetKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(businessProfile);
  }, [businessProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(profile);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (kind: BusinessAssetKind, file: File) => {
    setError(null);
    setUploading(kind);
    try {
      const url = await uploadBusinessAsset(userId, kind, file);
      const next: BusinessProfile = {
        ...profile,
        ...(kind === 'logo'
          ? { logoUrl: url }
          : kind === 'stamp'
            ? { stampUrl: url }
            : { signatureUrl: url }),
      };
      setProfile(next);
      await onSave(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du téléversement.');
    } finally {
      setUploading(null);
    }
  };

  const removeAsset = async (kind: BusinessAssetKind) => {
    setError(null);
    setUploading(kind);
    try {
      const current =
        kind === 'logo' ? profile.logoUrl : kind === 'stamp' ? profile.stampUrl : profile.signatureUrl;
      await deleteBusinessAsset(userId, kind, current);
      const next: BusinessProfile = {
        ...profile,
        ...(kind === 'logo'
          ? { logoUrl: '' }
          : kind === 'stamp'
            ? { stampUrl: '' }
            : { signatureUrl: '' }),
      };
      setProfile(next);
      await onSave(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file) void uploadAsset('logo', file);
  };

  const handleStampUpload = (file: File) => {
    if (file) void uploadAsset('stamp', file);
  };

  const handleSignatureUpload = (file: File) => {
    if (file) void uploadAsset('signature', file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-mid" />
            <span>Profil de votre Entreprise</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Logo, cachet et signature sont stockés dans Supabase Storage. Le profil est enregistré en base.
          </p>
        </div>

        {savedMsg && (
          <div className="px-3 py-1.5 bg-brand-mist border border-brand-mid/25 text-brand-ink text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profil mis à jour !</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LOGO DE L'ENTREPRISE SECTION */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-mid" />
              <span>Logo de l'Entreprise (En-tête PDF)</span>
              {uploading === 'logo' && <Loader2 className="w-4 h-4 text-brand-mid animate-spin" />}
            </h3>
            {profile.logoUrl && (
              <button
                type="button"
                disabled={uploading === 'logo'}
                onClick={() => void removeAsset('logo')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer le logo</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Logo Preview box */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Aperçu en-tête document PDF
              </span>
              <div className="w-full h-28 bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-center shadow-xs overflow-hidden relative group">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt="Logo Entreprise"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="inline-block px-3 py-1.5 bg-brand-ink text-white font-black text-sm rounded-lg tracking-wider mb-1">
                      {profile.companyName || 'VOTRE LOGO'}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Aucun logo téléchargé</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Format recommandé : PNG transparent ou SVG.
              </p>
            </div>

            {/* Upload Zone & Controls */}
            <div className="md:col-span-7 space-y-3">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-brand-mist/50'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}
              >
                <Upload className="w-7 h-7 text-brand-mid mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-800">
                  Glissez-déposez votre fichier image ici
                </p>
                <p className="text-[11px] text-slate-500 mb-3">ou parcourez votre ordinateur (PNG, JPG, SVG)</p>
                
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-ink hover:bg-brand-deep text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choisir une image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Toggle URL input */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-slate-600 hover:text-brand-ink font-medium flex items-center gap-1.5 cursor-pointer underline underline-offset-2"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{showUrlInput ? 'Masquer l\'adresse URL' : 'Utiliser une adresse URL d\'image'}</span>
                </button>
              </div>

              {showUrlInput && (
                <div className="pt-1">
                  <input
                    type="url"
                    value={profile.logoUrl || ''}
                    onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                    placeholder="https://votre-site.com/images/logo.png"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-mid"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* CACHET OFFICIEL ET SIGNATURE SECTION */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                <span>Cachet Officiel & Signature Numérique</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enregistrez le tampon de votre entreprise et votre signature. Vous pourrez les apposer et les déplacer par glisser-déposer sur vos devis et factures.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cachet Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-indigo-600" />
                    <span>Cachet / Tampon d'entreprise</span>
                  </span>
                  {profile.stampUrl && (
                    <button
                      type="button"
                      disabled={uploading === 'stamp'}
                      onClick={() => void removeAsset('stamp')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>

                {/* Stamp Preview */}
                <div className="w-full h-36 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center shadow-2xs relative overflow-hidden mb-3">
                  {profile.stampUrl ? (
                    <img
                      src={profile.stampUrl}
                      alt="Cachet Officiel"
                      className="max-h-28 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1">
                      <Stamp className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Aucun cachet enregistré</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer un tampon / cachet (PNG/SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleStampUpload(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Signature Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-brand-mid" />
                    <span>Signature Numérique</span>
                  </span>
                  {profile.signatureUrl && (
                    <button
                      type="button"
                      disabled={uploading === 'signature'}
                      onClick={() => void removeAsset('signature')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>

                {/* Signature Preview */}
                <div className="w-full h-36 bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center shadow-2xs relative overflow-hidden mb-3">
                  {profile.signatureUrl ? (
                    <img
                      src={profile.signatureUrl}
                      alt="Signature Numérique"
                      className="max-h-28 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-1">
                      <PenTool className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Aucune signature enregistrée</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-ink hover:bg-brand-deep text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer votre signature (PNG/SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSignatureUpload(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Identity & Fiscal IDs */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-mid" />
            <span>Identité & Numéros Fiscaux</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Raison Sociale / Nom de la Société *
              </label>
              <input
                type="text"
                required
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Utilisée uniquement dans l’application (menu, compte). Elle n’apparaît pas sur vos devis et factures — le logo suffit.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Slogan / Spécialité
              </label>
              <input
                type="text"
                value={profile.tagline || ''}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="Services Informatiques & Génie Logiciel"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Numéro NIF (Identification Fiscale)
              </label>
              <input
                type="text"
                value={profile.nif}
                onChange={(e) => setProfile({ ...profile, nif: e.target.value })}
                placeholder="001928374-A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Numéro RCCM (Registre du Commerce)
              </label>
              <input
                type="text"
                value={profile.rccm}
                onChange={(e) => setProfile({ ...profile, rccm: e.target.value })}
                placeholder="CI-ABJ-2023-B-14820"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Taux de TVA par défaut (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={profile.defaultTaxRate ?? 18}
                  onChange={(e) => setProfile({ ...profile, defaultTaxRate: Number(e.target.value) })}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[18, 20, 0, 5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setProfile({ ...profile, defaultTaxRate: preset })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        profile.defaultTaxRate === preset
                          ? 'bg-brand-ink text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Taux appliqué automatiquement lors de la création de nouveaux devis et factures.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Délai de Paiement par défaut (Jours)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={profile.defaultPaymentTermsDays ?? 30}
                onChange={(e) => setProfile({ ...profile, defaultPaymentTermsDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Utilisé pour calculer automatiquement la date d'échéance.
              </p>
            </div>
          </div>
        </div>

        {/* Address & Contact Details */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-mid" />
            <span>Adresse & Coordonnées</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Adresse du Siège Social
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Pays
              </label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Téléphone
              </label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Professionnel
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>
        </div>

        {/* Banking & Mobile Money Payment RIB */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-mid" />
            <span>Coordonnées Bancaires & Mobile Money</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Nom de la Banque
              </label>
              <input
                type="text"
                value={profile.bankDetails.bankName}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    bankDetails: { ...profile.bankDetails, bankName: e.target.value },
                  })
                }
                placeholder="Coris Bank / NSIA / BNI / Ecobank"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                IBAN / Clé RIB
              </label>
              <input
                type="text"
                value={profile.bankDetails.ibanRib}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    bankDetails: { ...profile.bankDetails, ibanRib: e.target.value },
                  })
                }
                placeholder="CI093 01001 012345678901 24"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Comptes Mobile Money (Orange Money / Wave / MTN)
            </label>
            <input
              type="text"
              value={profile.bankDetails.mobileMoney || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  bankDetails: { ...profile.bankDetails, mobileMoney: e.target.value },
                })
              }
              placeholder="Orange Money / Wave : +225 07 00 00 00 00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
        </div>

        {/* Legal Footer */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-mid" />
            <span>Pied de page Légal</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Mentions obligatoires en bas de page PDF
            </label>
            <textarea
              rows={2}
              value={profile.legalFooter || ''}
              onChange={(e) => setProfile({ ...profile, legalFooter: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CloudUpload className="w-3.5 h-3.5 text-brand-mid" />
            <span>PNG / JPG envoyés et liés automatiquement via Supabase Storage.</span>
          </p>
          <button
            type="submit"
            disabled={saving || !!uploading}
            className="px-6 py-3 bg-brand-ink hover:bg-brand-deep disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};
