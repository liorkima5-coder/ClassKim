"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Loader2, Palette, Sparkles, CalendarHeart, LogIn, Mail, Lock, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // States עבור טופס ההתחברות
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        // התחברות קיימת
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // הרשמה חדשה
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // בהרשמה מוצלחת מועברים לדאשבורד (תלוי בהגדרות אישור אימייל בסופבייס)
        router.push('/dashboard');
      }
    } catch (error: any) {
      setAuthError(error.message === 'Invalid login credentials' 
        ? 'אימייל או סיסמה שגויים.' 
        : 'אירעה שגיאה. אנא נסה שוב או בדוק את הסיסמה (לפחות 6 תווים).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) setAuthError('שגיאה בהתחברות עם גוגל.');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden selection:bg-indigo-200">
      
      {/* צד ימין: תוכן שיווקי (Landing Page) */}
      <div className="flex-1 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
        {/* אלמנטים עיצוביים ברקע */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-xl mx-auto md:mx-0">
          {/* לוגו ClassKim */}
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
              <Palette className="w-8 h-8 text-indigo-200" />
            </div>
            <span className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              ClassKim
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            לתכנן שיעורים <br />
            <span className="text-indigo-300">ביצירתיות ובקלות.</span>
          </h1>
          
          <p className="text-lg text-indigo-100/80 mb-10 leading-relaxed max-w-md">
            מערכת חכמה שתוכננה לעשות סדר בבלאגן. נהלי את הכיתות שלך, תכנני מערכי שיעור, ועקבי אחרי ההספק והציוד במקום אחד מעוצב ונוח.
          </p>

          <div className="space-y-4">
            {[
              { icon: CalendarHeart, text: 'יומן דינמי שבועי וחודשי' },
              { icon: Sparkles, text: 'מעקב היסטוריית הספק לכל כיתה' },
              { icon: CheckCircle2, text: 'רשימות ציוד ומשימות "בוקר טוב"' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-indigo-100">
                <feature.icon className="w-5 h-5 text-indigo-300" />
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* צד שמאל: טופס התחברות (Auth) */}
      <div className="flex-1 bg-white p-8 md:p-16 flex flex-col justify-center items-center relative">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {isLoginMode ? 'ברוכה השבה!' : 'יצירת חשבון חדש'}
            </h2>
            <p className="text-slate-500">
              {isLoginMode ? 'הזיני את פרטי ההתחברות שלך כדי להמשיך' : 'הצטרפי אלינו והתחילי לארגן את השנה'}
            </p>
          </div>

          {/* טאבים: התחברות / הרשמה */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
              onClick={() => { setIsLoginMode(true); setAuthError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLoginMode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              התחברות
            </button>
            <button 
              onClick={() => { setIsLoginMode(false); setAuthError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLoginMode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">כתובת אימייל</label>
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pr-12 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="name@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pr-12 p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                />
              </div>
            </div>

            {isLoginMode && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">זכור אותי</span>
                </label>
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">שכחת סיסמה?</a>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-bold shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isLoginMode ? 'היכנסי למערכת' : 'צרי חשבון חדש'}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400 font-medium">או התחברי באמצעות</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="mt-8 w-full bg-white border-2 border-slate-100 text-slate-700 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-200 active:scale-[0.98] transition-all font-bold flex justify-center items-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            התחברות עם Google
          </button>
        </div>
      </div>
    </div>
  );
}