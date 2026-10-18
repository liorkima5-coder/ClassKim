"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { enforceRememberChoice } from '../../lib/session';
import type { TeacherProfile } from '../../lib/planner';
import { Spinner, ErrorNote, inputClass, labelClass, primaryButton, iconButton } from '../../components/ui';
import { Loader2, Sun, CalendarDays, History, Settings, LogOut } from 'lucide-react';
import ClassesManager from '../../components/ClassesManager';
import BaseSchedule from '../../components/BaseSchedule';
import DailyPlanner from '../../components/DailyPlanner';
import OverviewDashboard from '../../components/OverviewDashboard';
import ClassHistory from '../../components/ClassHistory';
import ProfileSettings, { DaysOffPicker } from '../../components/ProfileSettings';

type Tab = 'overview' | 'planner' | 'history' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'overview', label: 'היום', icon: Sun },
  { id: 'planner', label: 'יומן', icon: CalendarDays },
  { id: 'history', label: 'הספק', icon: History },
  { id: 'settings', label: 'הגדרות', icon: Settings },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [plannerDirty, setPlannerDirty] = useState(false);
  const [classesVersion, setClassesVersion] = useState(0);

  // טופס פרופיל ראשוני
  const [fullName, setFullName] = useState('');
  const [mainSubject, setMainSubject] = useState('');
  const [daysOff, setDaysOff] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const checkUserAndProfile = async () => {
      if (await enforceRememberChoice()) return router.replace('/');
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) return router.replace('/');
      setUser(currentUser);
      if (currentUser.user_metadata?.full_name) setFullName(currentUser.user_metadata.full_name);

      const { data: teacherProfile } = await supabase.from('teachers').select('id, full_name, main_subject, days_off').eq('id', currentUser.id).maybeSingle();
      if (teacherProfile) setProfile(teacherProfile as TeacherProfile);
      setLoading(false);
    };
    checkUserAndProfile();
  }, [router]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setProfileError('');
    const newProfile: TeacherProfile = { id: user.id, full_name: fullName.trim(), main_subject: mainSubject.trim() || null, days_off: daysOff };
    const { error } = await supabase.from('teachers').insert([newProfile]);
    setIsSubmitting(false);
    if (error) {
      setProfileError('הפרטים לא נשמרו. בדקי את החיבור ונסי שוב.');
      return;
    }
    setProfile(newProfile);
    setActiveTab('settings'); // בפעם הראשונה מתחילים בהגדרת כיתות ומערכת
  };

  const changeTab = (tab: Tab) => {
    if (tab === activeTab) return;
    if (plannerDirty && !confirm('יש שינויים ביומן שלא נשמרו. לעבור בכל זאת?')) return;
    setPlannerDirty(false);
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    if (plannerDirty && !confirm('יש שינויים ביומן שלא נשמרו. להתנתק בכל זאת?')) return;
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) return <Spinner className="min-h-screen items-center" />;

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold">נעים להכיר</h1>
          <p className="mt-1 text-ink-soft">כמה פרטים קצרים, ואחר כך נגדיר יחד את הכיתות ואת מערכת השעות.</p>
          <form onSubmit={handleCreateProfile} className="mt-6 space-y-5">
            <div>
              <label htmlFor="full-name" className={labelClass}>שם מלא</label>
              <input id="full-name" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="subject" className={labelClass}>מקצוע עיקרי</label>
              <input id="subject" value={mainSubject} onChange={e => setMainSubject(e.target.value)} className={inputClass} placeholder="למשל: מתמטיקה, אמנות, חינוך" />
            </div>
            <DaysOffPicker value={daysOff} onChange={setDaysOff} />
            {profileError && <ErrorNote>{profileError}</ErrorNote>}
            <button type="submit" disabled={isSubmitting || !fullName.trim()} className={`${primaryButton} w-full`}>
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              שמירה והמשך
            </button>
          </form>
        </div>
      </main>
    );
  }

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="min-h-screen pb-28 md:pb-10 print:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="h-9 w-9 rounded-lg" />
            <div className="min-w-0 leading-tight">
              <p className="font-display font-semibold text-ink">ClassKim</p>
              <p className="truncate text-sm text-ink-soft">הפלאנר של {firstName}</p>
            </div>
          </div>

          <nav className="hidden h-full md:flex" aria-label="ניווט ראשי">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                <tab.icon className="h-4 w-4" aria-hidden /> {tab.label}
              </button>
            ))}
          </nav>

          <button onClick={handleLogout} className={iconButton} title="התנתקות" aria-label="התנתקות">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8 print:max-w-full print:p-0">
        {user && activeTab === 'overview' && <OverviewDashboard teacherId={user.id} teacherName={firstName} daysOff={profile.days_off ?? []} onOpenPlanner={() => changeTab('planner')} />}
        {user && activeTab === 'planner' && <DailyPlanner teacherId={user.id} daysOff={profile.days_off ?? []} onDirtyChange={setPlannerDirty} />}
        {user && activeTab === 'history' && <ClassHistory teacherId={user.id} />}
        {user && activeTab === 'settings' && (
          <>
            <ClassesManager teacherId={user.id} onChange={() => setClassesVersion(v => v + 1)} />
            <BaseSchedule teacherId={user.id} daysOff={profile.days_off ?? []} classesVersion={classesVersion} />
            <ProfileSettings profile={profile} onSaved={setProfile} />
          </>
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur md:hidden print:hidden" aria-label="ניווט ראשי">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-xl text-xs ${isActive ? 'font-bold text-brand-700' : 'font-medium text-ink-soft'}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive ? 'bg-brand-100' : ''}`}>
                <tab.icon className="h-5 w-5" aria-hidden />
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
