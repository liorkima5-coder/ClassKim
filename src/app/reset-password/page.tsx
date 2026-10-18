"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { rememberLogin } from '../../lib/session';
import { ErrorNote, Spinner, inputClass, labelClass, primaryButton } from '../../components/ui';
import { Loader2, KeyRound } from 'lucide-react';

// לכאן מגיעים מהקישור במייל "שכחתי סיסמה". Supabase מזהה את הקישור ומחבר זמנית.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    // נותנים לספרייה רגע לעבד את הקישור לפני שמסיקים שהוא לא תקין
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setReady(true);
      else setLinkInvalid(true);
    }, 1500);
    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('שתי הסיסמאות לא זהות.');
      return;
    }
    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (updateError) {
      setError('לא הצלחנו לשמור את הסיסמה. ודאי שהיא באורך 6 תווים לפחות.');
      return;
    }
    rememberLogin(true);
    router.replace('/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold">בחירת סיסמה חדשה</h1>

        {linkInvalid && !ready ? (
          <div className="mt-4 space-y-4">
            <ErrorNote>הקישור לא תקין או שפג תוקפו. אפשר לבקש קישור חדש ממסך הכניסה.</ErrorNote>
            <Link href="/" className={`${primaryButton} w-full`}>חזרה למסך הכניסה</Link>
          </div>
        ) : !ready ? (
          <Spinner className="py-10" />
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className={labelClass}>סיסמה חדשה</label>
              <input id="new-password" type="password" required minLength={6} dir="ltr" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} text-right`} />
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>שוב, לאימות</label>
              <input id="confirm-password" type="password" required minLength={6} dir="ltr" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={`${inputClass} text-right`} />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <button type="submit" disabled={isSaving} className={`${primaryButton} w-full`}>
              {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
              שמירת הסיסמה
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
