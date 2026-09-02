"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Loader2, BookOpen, Sun, CalendarDays, History, Settings, LogOut } from 'lucide-react';
import ClassesManager from '../../components/ClassesManager';
import BaseSchedule from '../../components/BaseSchedule';
import DailyPlanner from '../../components/DailyPlanner';
import OverviewDashboard from '../../components/OverviewDashboard';
import ClassHistory from '../../components/ClassHistory';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'planner' | 'history' | 'settings'>('overview');

  const [fullName, setFullName] = useState('');
  const [mainSubject, setMainSubject] = useState('');
  const [daysOff, setDaysOff] = useState<number[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUserAndProfile = async () => {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) return router.push('/');
      setUser(currentUser);
      if (currentUser.user_metadata?.full_name) setFullName(currentUser.user_metadata.full_name);
      
      const { data: teacherProfile } = await supabase.from('teachers').select('*').eq('id', currentUser.id).single();
      if (teacherProfile) {
        setHasProfile(true);
        setFullName(teacherProfile.full_name); 
      }
      setLoading(false);
    };
    checkUserAndProfile();
  }, [router]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('teachers').insert([{ id: user.id, full_name: fullName, main_subject: mainSubject, days_off: daysOff }]);
    if (error) { alert('שגיאה בשמירת הנתונים.'); setIsSubmitting(false); return; }
    setHasProfile(true);
    setIsSubmitting(false);
  };

  const handleLogout = () => supabase.auth.signOut().then(() => router.push('/'));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        {/* טופס הרשמה - נשאר זהה */}
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">הגדרת פרופיל מורה</h2>
            <p className="text-slate-500 mt-2">כדי להתחיל, נגדיר את המערכת האישית שלך</p>
          </div>
          <form onSubmit={handleCreateProfile} className="space-y-5">
            <div><label className="block text-sm font-medium mb-1">שם מלא</label><input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" /></div>
            <div><label className="block text-sm font-medium mb-1">מקצוע עיקרי</label><input type="text" required value={mainSubject} onChange={(e) => setMainSubject(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" /></div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שמור והיכנס לפלאנר'}</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'בוקר טוב', icon: Sun },
    { id: 'planner', label: 'יומן שיעורים', icon: CalendarDays },
    { id: 'history', label: 'היסטוריה', icon: History },
    { id: 'settings', label: 'הגדרות', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 p-4 sm:p-8 print:bg-white print:p-0" dir="rtl">
      
      {/* Header - בטלפון מציג רק לוגו והתנתקות */}
      <header className="max-w-6xl mx-auto mb-6 md:mb-8 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl"><BookOpen className="w-5 h-5 text-indigo-600" /></div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">הפלאנר של {fullName}</h1>
        </div>
        
        {/* טאבים למסך גדול בלבד */}
        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl mx-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2.5 rounded-xl transition-colors" title="התנתק">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* תוכן מרכזי */}
      <div className="max-w-6xl mx-auto space-y-6 print:max-w-full">
        {user && activeTab === 'overview' && <OverviewDashboard teacherId={user.id} teacherName={fullName} />}
        {user && activeTab === 'planner' && <DailyPlanner teacherId={user.id} />}
        {user && activeTab === 'history' && <ClassHistory teacherId={user.id} />}
        {user && activeTab === 'settings' && <><ClassesManager teacherId={user.id} /><BaseSchedule teacherId={user.id} /></>}
      </div>

      {/* תפריט ניווט תחתון אפליקטיבי - רק במסכים קטנים */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50 scale-110' : 'scale-100'}`}>
                <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] mt-1 transition-all ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}