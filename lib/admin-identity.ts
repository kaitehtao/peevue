import type { User } from '@supabase/supabase-js';
// Pass only a user returned by the server-side Auth getUser verification.
export function verifiedAdministratorEmail(user: Pick<User, 'email' | 'email_confirmed_at' | 'is_anonymous'>): string | null {
  if (!user.email || !user.email_confirmed_at || user.is_anonymous) return null;
  return user.email.trim().toLowerCase();
}
