import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface SavePopupProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export const SavePopup: React.FC<SavePopupProps> = ({
  type,
  message,
  onClose,
  autoCloseMs = 2500,
}) => {
  useEffect(() => {
    if (autoCloseMs <= 0) return;
    const id = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(id);
  }, [autoCloseMs, onClose, message, type]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/50 backdrop-blur-sm p-4">
      <div
        role="alertdialog"
        aria-live="polite"
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-8 text-center animate-[fadeIn_0.2s_ease-out]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${
            isSuccess ? 'bg-brand-mist text-brand-mid' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-9 h-9" />
          ) : (
            <XCircle className="w-9 h-9" />
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          {isSuccess ? 'Enregistré !' : 'Erreur'}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className={`mt-6 w-full py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors ${
            isSuccess ? 'bg-brand-ink hover:bg-brand-deep' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
