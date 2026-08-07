/** Traduit les messages d'erreur courants (Supabase / navigateur) en français. */
export function toFrenchError(message: string | null | undefined, fallback = 'Une erreur est survenue.'): string {
  if (!message?.trim()) return fallback;
  const raw = message.trim();
  const lower = raw.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Votre e-mail n’est pas encore confirmé.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Un compte existe déjà avec cet e-mail.';
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Le mot de passe est trop court.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Adresse e-mail invalide.';
  }
  if (lower.includes('email rate limit') || lower.includes('rate limit')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Problème de connexion réseau. Vérifiez votre internet.';
  }
  if (lower.includes('jwt') || lower.includes('session') || lower.includes('refresh token')) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('not allowed')) {
    return 'Action non autorisée.';
  }
  if (lower.includes('duplicate key') || lower.includes('already exists')) {
    return 'Cet élément existe déjà.';
  }

  // Si le message est déjà en français (accents / mots courants), le garder
  if (/[àâäéèêëïîôùûüç]/i.test(raw) || /\b(erreur|échec|impossible|veuillez|session)\b/i.test(raw)) {
    return raw;
  }

  return raw;
}
