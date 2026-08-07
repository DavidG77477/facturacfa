import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemTitle?: string;
  itemSubtitle?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isPermanent?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemTitle,
  itemSubtitle,
  message,
  confirmText = 'Oui, Supprimer',
  cancelText = 'Annuler',
  isPermanent = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="glass-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden space-y-0 transform transition-all">
        {/* Header Bar */}
        <div className={`p-5 flex items-start gap-4 border-b ${isPermanent ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            isPermanent ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-200'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className={`font-black text-base ${isPermanent ? 'text-rose-900' : 'text-slate-900'}`}>
              {title || (isPermanent ? 'Suppression Définitive' : 'Confirmer la suppression')}
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {isPermanent ? 'Attention, cette action est irréversible.' : 'Confirmation requise avant suppression.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {itemTitle && (
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
              <div className="text-xs font-black text-slate-800">{itemTitle}</div>
              {itemSubtitle && <div className="text-[11px] text-slate-500 mt-0.5">{itemSubtitle}</div>}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {message || (
              isPermanent
                ? 'Êtes-vous absolument sûr de vouloir supprimer définitivement cet élément ? Il ne pourra plus être récupéré.'
                : 'Êtes-vous sûr de vouloir supprimer cet élément ? Il sera placé dans la Corbeille où vous pourrez le restaurer ultérieurement.'
            )}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              isPermanent
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
