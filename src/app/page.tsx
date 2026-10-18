"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { rememberLogin, enforceRememberChoice } from '../lib/session';
import { Spinner, ErrorNote, inputClass, labelClass, primaryButton, secondaryButton } from '../components/ui';
import { Loader2, MailCheck } from 'lucide-react';

type Mode = 'login' | 'signup' | 'reset';

const PREVIEW_LESSONS = [
  { period: 1, cls: 'ה׳2', chip: 'bg-sky-100 text-sky-900 border-sky-200', topic: 'שברים פשוטים – חזרה לקראת המבחן' },
  { period: 2, cls: 'ו׳1', chip: 'bg-rose-100 text-rose-900 border-rose-200', topic: 'עבודה בזוגות על בעיות מילוליות' },
  { period: 4, cls: 'ה׳1', chip: 'bg-lime-100 text-lime-900 border-lime-200', topic: 'להביא דפי עבודה צבעוניים' },
];

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (await enforceRememberChoice()) {
        setIsLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
      else setIsLoading(false);
    };
    checkUser();
  }, [router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setAuthError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(error.message === 'Invalid login credentials'
            ? 'האימייל או הסיסמה לא נכונים.'
            : error.message === 'Email not confirmed'
              ? 'צריך לאשר קודם את כתובת האימייל. בדקי את תיבת הדואר שלך.'
              : 'ההתחברות נכשלה. נסי שוב בעוד רגע.');
          return;
        }
        rememberLogin(rememberMe);
        router.push('/dashboard');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) {
          setAuthError(error.message.includes('already registered')
            ? 'כבר קיים חשבון עם האימייל הזה. אפשר להתחבר אליו.'
            : 'לא הצלחנו ליצור חשבון. ודאי שהסיסמה באורך 6 תווים לפחות.');
          return;
        }
        if (data.session) {
          rememberLogin(true);
          router.push('/dashboard');
        } else {
          setNotice(`שלחנו מייל אישור ל-${email}. אחרי שתלחצי על הקישור במייל תוכלי להתחבר.`);
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setAuthError('לא הצלחנו לשלוח את המייל. בדקי את הכתובת ונסי שוב.');
          return;
        }
        setNotice(`אם קיים חשבון עם ${email}, נשלח אליו קישור לבחירת סיסמה חדשה.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    rememberLogin(rememberMe);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setAuthError('ההתחברות עם Google נכשלה. נסי שוב.');
  };

  if (isLoading) return <Spinner className="min-h-screen items-center" />;

  const titles: Record<Mode, { title: string; sub: string; cta: string }> = {
    login: { title: 'כניסה לפלאנר', sub: 'טוב לראות אותך שוב.', cta: 'כניסה' },
    signup: { title: 'פתיחת חשבון', sub: 'לוקח פחות מדקה, ואפשר להתחיל לתכנן מיד.', cta: 'יצירת חשבון' },
    reset: { title: 'שכחת סיסמה?', sub: 'נשלח אלייך קישור לבחירת סיסמה חדשה.', cta: 'שליחת קישור' },
  };
  const t = titles[mode];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-8 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-12">

      {/* מה זה ClassKim */}
      <div className="flex-1">
        <div className="mb-10 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="h-11 w-11 rounded-xl" />
          <span className="font-display text-2xl font-bold text-ink">ClassKim</span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.15] text-ink sm:text-5xl">
          כל השיעורים שלך,<br />בדף אחד.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
          מערכת שעות קבועה, יומן שבו רושמים מה לימדת בכל שיעור, ומעקב אחרי ההספק של כל כיתה לאורך השנה.
        </p>

        {/* דוגמה לעמוד ביומן, בסגנון מחברת */}
        <div className="notebook-page mt-10 hidden max-w-md rounded-2xl border border-line py-4 pe-5 ps-14 shadow-[0_1px_0_var(--color-line),0_12px_32px_-16px_rgba(29,43,58,0.25)] sm:block" aria-hidden>
          <p className="flex h-9 items-end pb-1.5 font-display font-semibold text-ink">יום שלישי</p>
          {PREVIEW_LESSONS.map(l => (
            <div key={l.period} className="flex h-9 items-end gap-3 pb-1.5">
              <span className="w-5 text-sm font-semibold text-ink-faint">{l.period}</span>
              <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${l.chip}`}>{l.cls}</span>
              <span className="truncate text-ink">{l.topic}</span>
            </div>
          ))}
          <div className="h-9" />
        </div>
      </div>

      {/* טופס כניסה */}
      <div className="w-full lg:w-[26rem]">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_12px_40px_-24px_rgba(29,43,58,0.35)] sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">{t.title}</h2>
          <p className="mt-1 text-ink-soft">{t.sub}</p>

          {mode !== 'reset' && (
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-line-soft p-1" role="tablist">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                >
                  {m === 'login' ? 'כניסה' : 'הרשמה'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>אימייל</label>
              <input id="email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} text-right`} placeholder="name@school.org.il" />
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className={labelClass}>סיסמה</label>
                <input id="password" type="password" required minLength={6} dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} text-right`} />
                {mode === 'signup' && <p className="mt-1.5 text-sm text-ink-faint">לפחות 6 תווים.</p>}
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 cursor-pointer rounded accent-brand-600" />
                  להישאר מחוברת במכשיר הזה
                </label>
                <button type="button" onClick={() => switchMode('reset')} className="text-sm font-semibold text-brand-700 hover:underline">
                  שכחתי סיסמה
                </button>
              </div>
            )}

            {authError && <ErrorNote>{authError}</ErrorNote>}
            {notice && (
              <p role="status" className="flex gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {notice}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className={`${primaryButton} w-full`}>
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {t.cta}
            </button>
          </form>

          {mode === 'reset' ? (
            <button type="button" onClick={() => switchMode('login')} className="mt-5 w-full text-center text-sm font-semibold text-brand-700 hover:underline">
              חזרה לכניסה
            </button>
          ) : (
            <>
              <div className="my-6 flex items-center gap-3 text-sm text-ink-faint">
                <span className="h-px flex-1 bg-line" /> או <span className="h-px flex-1 bg-line" />
              </div>
              <button type="button" onClick={handleGoogleLogin} className={`${secondaryButton} w-full`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                המשך עם Google
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
