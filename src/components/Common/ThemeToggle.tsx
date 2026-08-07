import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${
        compact ? 'p-2' : 'p-2 sm:px-3 sm:py-1.5'
      } border-white/10 text-brand-sand/70 hover:text-brand-paper hover:bg-white/8 ${className}`}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {isDark ? <Sun className="w-4 h-4 text-brand-glow" /> : <Moon className="w-4 h-4" />}
      {!compact && (
        <span className="hidden sm:inline">{isDark ? 'Clair' : 'Sombre'}</span>
      )}
    </button>
  );
};
