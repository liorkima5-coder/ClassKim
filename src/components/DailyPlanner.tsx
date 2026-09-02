"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ChevronRight, ChevronLeft, Save, Calendar as CalendarIcon, CalendarDays, LayoutTemplate, Printer, Plus, X } from 'lucide-react';

interface BaseScheduleItem { id: string; day_of_week: number; period: number; class_id: string; room: string | null; my_classes: { class_name: string }; }
interface PlannerEvent { id?: string; date: string; period: number; topic: string; notes: string; class_id?: string; my_classes?: { class_name: string }; }
interface ClassItem { id: string; class_name: string; }
type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function DailyPlanner({ teacherId }: { teacherId: string }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('daily');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [baseSchedule, setBaseSchedule] = useState<BaseScheduleItem[]>([]);
  const [events, setEvents] = useState<Record<string, Record<number, PlannerEvent>>>({});
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // States עבור המודאל של הוספת שיעור דינמי
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraPeriod, setExtraPeriod] = useState<number>(1);
  const [extraClassId, setExtraClassId] = useState<string>('');

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const formatDateForDB = (date: Date) => { const d = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)); return d.toISOString().split('T')[0]; };
  const getStartOfWeek = (date: Date) => { const d = new Date(date); const diff = d.getDate() - d.getDay(); return new Date(d.setDate(diff)); };
  const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

  useEffect(() => { fetchData(); }, [currentDate, view, teacherId]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. שליפת מערכת בסיסית (כולל class_id)
    const { data: scheduleData } = await supabase.from('base_schedule').select('id, day_of_week, period, class_id, room, my_classes(class_name)').eq('teacher_id', teacherId);
    if (scheduleData) setBaseSchedule(scheduleData as unknown as BaseScheduleItem[]);

    // 2. שליפת רשימת כל הכיתות לטובת מודאל השיבוץ הדינמי
    const { data: classesData } = await supabase.from('my_classes').select('*').eq('teacher_id', teacherId);
    if (classesData) setClasses(classesData);

    let startDate = new Date(currentDate); let endDate = new Date(currentDate);
    if (view === 'weekly') { startDate = getStartOfWeek(currentDate); endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); }
    else if (view === 'monthly') { startDate = getStartOfMonth(currentDate); endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); }

    // 3. שליפת האירועים ביומן (כולל class_id במקרה של שיעורים דינמיים)
    const { data: eventsData } = await supabase.from('planner_events').select('*, my_classes(class_name)').eq('teacher_id', teacherId).gte('date', formatDateForDB(startDate)).lte('date', formatDateForDB(endDate));
    const eventsMap: Record<string, Record<number, PlannerEvent>> = {};
    if (eventsData) { eventsData.forEach((ev: any) => { if (!eventsMap[ev.date]) eventsMap[ev.date] = {}; eventsMap[ev.date][ev.period] = ev; }); }
    setEvents(eventsMap); setLoading(false);
  };

  const handleEventChange = (dateStr: string, period: number, field: 'topic' | 'notes', value: string) => {
    setEvents(prev => { const newEvents = { ...prev }; if (!newEvents[dateStr]) newEvents[dateStr] = {}; newEvents[dateStr][period] = { ...newEvents[dateStr][period], date: dateStr, period, [field]: value }; return newEvents; });
  };

  // הוספת שיעור דינמי שאינו במערכת השעות הקבועה
  const handleAddDynamicClass = () => {
    if (!extraClassId) return;
    const dateStr = formatDateForDB(currentDate);
    
    setEvents(prev => {
      const newEvents = { ...prev };
      if (!newEvents[dateStr]) newEvents[dateStr] = {};
      newEvents[dateStr][extraPeriod] = {
        ...newEvents[dateStr][extraPeriod],
        date: dateStr,
        period: extraPeriod,
        class_id: extraClassId
      };
      return newEvents;
    });
    
    setIsExtraModalOpen(false);
  };

  const saveDailyPlanner = async () => {
    setIsSaving(true); 
    const dateStr = formatDateForDB(currentDate); 
    const dailyEvents = events[dateStr] || {};
    
    const upsertData = Object.values(dailyEvents)
      .filter(ev => ev.topic?.trim() || ev.notes?.trim() || ev.class_id)
      .map(ev => ({ 
        teacher_id: teacherId, 
        date: dateStr, 
        period: ev.period, 
        topic: ev.topic || '', 
        notes: ev.notes || '',
        class_id: ev.class_id || null // שמירת זיהוי הכיתה במידה וזה שיעור דינמי
      }));
      
    if (upsertData.length > 0) { 
      const { error } = await supabase.from('planner_events').upsert(upsertData, { onConflict: 'teacher_id,date,period' }); 
      if (error) alert('שגיאה בשמירה: ' + error.message); 
    }
    setIsSaving(false);
  };

  const changeDate = (amount: number) => { const newDate = new Date(currentDate); if (view === 'daily') newDate.setDate(newDate.getDate() + amount); if (view === 'weekly') newDate.setDate(newDate.getDate() + (amount * 7)); if (view === 'monthly') newDate.setMonth(newDate.getMonth() + amount); setCurrentDate(newDate); };

  const isWeekend = currentDate.getDay() === 6;
  const currentDBDate = formatDateForDB(currentDate);
  const dayEvents = events[currentDBDate] || {};

  // בניית המערכת היומית: מיזוג של המערכת הקבועה עם שינויים דינמיים מאותו יום
  const activeDailyPeriods = [];
  if (view === 'daily' && !isWeekend) {
    const dailyBase = baseSchedule.filter(s => s.day_of_week === currentDate.getDay() + 1);
    
    for (let p = 1; p <= 10; p++) {
      const baseCls = dailyBase.find(s => s.period === p);
      const ev = dayEvents[p];

      if (ev && ev.class_id) {
        // המורה שיבצה כיתה דינמית/חלופית לשעה זו ביומן
        const className = ev.my_classes?.class_name || classes.find(c => c.id === ev.class_id)?.class_name || 'כיתה לא ידועה';
        activeDailyPeriods.push({ period: p, class_id: ev.class_id, class_name: className, isExtra: true });
      } else if (baseCls) {
        // שיעור מהמערכת הקבועה שלא נדרס
        activeDailyPeriods.push({ period: p, class_id: baseCls.class_id, class_name: baseCls.my_classes.class_name, isExtra: false });
      }
    }
    activeDailyPeriods.sort((a, b) => a.period - b.period);
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden print:shadow-none print:border-none relative">
      
      {/* כלי ניווט עליונים */}
      <div className="bg-slate-50/80 border-b border-slate-200 p-4 sm:p-6 print:hidden">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-200/60 p-1 rounded-xl w-full xl:w-auto overflow-x-auto scrollbar-hide">
            {[{ id: 'daily', icon: LayoutTemplate, label: 'יומי' }, { id: 'weekly', icon: CalendarDays, label: 'שבועי' }, { id: 'monthly', icon: CalendarIcon, label: 'חודשי' }].map((v) => (
              <button key={v.id} onClick={() => setView(v.id as ViewMode)} className={`flex-1 xl:flex-none flex justify-center items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${view === v.id ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                <v.icon className="w-4 h-4 hidden sm:block" /> {v.label}
              </button>
            ))}
            <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 ml-2"><Printer className="w-4 h-4" /> הדפס</button>
          </div>

          <div className="flex items-center justify-between w-full xl:w-auto gap-2 sm:gap-6 bg-white xl:bg-transparent p-2 xl:p-0 rounded-2xl xl:rounded-none border xl:border-transparent border-slate-100">
            <button onClick={() => changeDate(-1)} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
            <div className="text-center flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                {view === 'daily' && currentDate.toLocaleDateString('he-IL')}
                {view === 'weekly' && `שבוע של ${getStartOfWeek(currentDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'})}`}
                {view === 'monthly' && currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </h2>
              {view === 'daily' && <p className="text-indigo-600 text-xs sm:text-sm font-medium">יום {dayNames[currentDate.getDay()]}</p>}
            </div>
            <button onClick={() => changeDate(1)} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 print:p-0">
        {loading ? <div className="flex justify-center py-20 print:hidden"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div> : (
          <>
            {/* DAILY VIEW (תצוגה יומית דינמית) */}
            {view === 'daily' && (
              <div className="space-y-4 pb-24 md:pb-6">
                {isWeekend ? (
                  <div className="text-center py-20 text-slate-400">יום שבת - מנוחה!</div>
                ) : activeDailyPeriods.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 text-slate-500 rounded-3xl border-2 border-dashed border-slate-200">לא מוגדרים שיעורים להיום.</div>
                ) : (
                  <>
                    {activeDailyPeriods.map((classData) => {
                      const period = classData.period;
                      const eventData = dayEvents[period] || { topic: '', notes: '' };
                      return (
                        <div key={period} className={`flex flex-col md:flex-row gap-4 items-stretch bg-white p-4 rounded-3xl border shadow-sm ${classData.isExtra ? 'border-amber-200 ring-2 ring-amber-50' : 'border-slate-100'}`}>
                          <div className={`w-full md:w-36 flex flex-col justify-center items-center p-4 rounded-2xl border relative overflow-hidden ${classData.isExtra ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200' : 'bg-indigo-50/50 border-indigo-100/50'}`}>
                            {classData.isExtra && (
                              <div className="absolute top-0 w-full bg-amber-400 text-[10px] font-black text-amber-900 text-center py-0.5 shadow-sm">שיעור דינמי</div>
                            )}
                            <span className={`text-xs font-bold mb-1 ${classData.isExtra ? 'text-amber-600 mt-3' : 'text-indigo-400'}`}>שיעור {period}</span>
                            <span className={`text-2xl font-black text-center ${classData.isExtra ? 'text-amber-900' : 'text-indigo-800'}`}>{classData.class_name}</span>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <input type="text" placeholder="מה נלמד היום? (נושא)" value={eventData.topic || ''} onChange={(e) => handleEventChange(currentDBDate, period, 'topic', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border border-transparent focus:bg-white focus:border-indigo-300 transition-all" />
                            <textarea placeholder="הערות ורפלקציה..." value={eventData.notes || ''} onChange={(e) => handleEventChange(currentDBDate, period, 'notes', e.target.value)} rows={2} className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-sm resize-none border border-transparent focus:bg-white focus:border-indigo-300 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* אזור פעולות למטה */}
                {!isWeekend && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
                    <button 
                      onClick={() => setIsExtraModalOpen(true)}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                    >
                      <Plus className="w-5 h-5" /> שיבוץ דינמי (החלפה / מילוי מקום)
                    </button>
                    
                    <button onClick={saveDailyPlanner} disabled={isSaving} className="shadow-2xl shadow-indigo-300/50 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 w-full sm:w-auto active:scale-95 transition-all">
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} שמור תכנון יומי
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* WEEKLY ו-MONTHLY נשארים כפי שהם... */}
            {/* ... */}
          </>
        )}
      </div>

      {/* מודאל הוספת שיעור דינמי */}
      {isExtraModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 transform transition-all pb-safe">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-amber-50/50">
              <div>
                <h3 className="font-bold text-amber-900 text-lg">שיבוץ דינמי להיום</h3>
                <p className="text-xs text-amber-700/70 mt-1 font-medium">הוספה או החלפה של שיעור קיים</p>
              </div>
              <button onClick={() => setIsExtraModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">איזה שיעור ביום?</label>
                <select value={extraPeriod} onChange={(e) => setExtraPeriod(Number(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-800 appearance-none">
                  {[1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>שיעור {p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">איזו כיתה נכנסת?</label>
                <select value={extraClassId} onChange={(e) => setExtraClassId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-800 appearance-none">
                  <option value="">-- בחרי כיתה --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAddDynamicClass} 
                disabled={!extraClassId} 
                className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 mt-4 hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-200"
              >
                הוסף ליומן
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
