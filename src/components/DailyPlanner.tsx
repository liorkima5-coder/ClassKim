"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ChevronRight, ChevronLeft, Save, MapPin, Calendar as CalendarIcon, CalendarDays, LayoutTemplate, Printer, Clock } from 'lucide-react';

interface BaseScheduleItem { id: string; day_of_week: number; period: number; room: string | null; my_classes: { class_name: string }; }
interface PlannerEvent { id?: string; date: string; period: number; topic: string; notes: string; }
type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function DailyPlanner({ teacherId }: { teacherId: string }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('daily');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [baseSchedule, setBaseSchedule] = useState<BaseScheduleItem[]>([]);
  const [events, setEvents] = useState<Record<string, Record<number, PlannerEvent>>>({});

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const formatDateForDB = (date: Date) => { const d = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)); return d.toISOString().split('T')[0]; };
  const getStartOfWeek = (date: Date) => { const d = new Date(date); const diff = d.getDate() - d.getDay(); return new Date(d.setDate(diff)); };
  const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

  useEffect(() => { fetchData(); }, [currentDate, view, teacherId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: scheduleData } = await supabase.from('base_schedule').select('id, day_of_week, period, room, my_classes(class_name)').eq('teacher_id', teacherId);
    if (scheduleData) setBaseSchedule(scheduleData as unknown as BaseScheduleItem[]);

    let startDate = new Date(currentDate); let endDate = new Date(currentDate);
    if (view === 'weekly') { startDate = getStartOfWeek(currentDate); endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); }
    else if (view === 'monthly') { startDate = getStartOfMonth(currentDate); endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); }

    const { data: eventsData } = await supabase.from('planner_events').select('*').eq('teacher_id', teacherId).gte('date', formatDateForDB(startDate)).lte('date', formatDateForDB(endDate));
    const eventsMap: Record<string, Record<number, PlannerEvent>> = {};
    if (eventsData) { eventsData.forEach((ev: any) => { if (!eventsMap[ev.date]) eventsMap[ev.date] = {}; eventsMap[ev.date][ev.period] = ev; }); }
    setEvents(eventsMap); setLoading(false);
  };

  const handleEventChange = (dateStr: string, period: number, field: 'topic' | 'notes', value: string) => {
    setEvents(prev => { const newEvents = { ...prev }; if (!newEvents[dateStr]) newEvents[dateStr] = {}; newEvents[dateStr][period] = { ...newEvents[dateStr][period], date: dateStr, period, [field]: value }; return newEvents; });
  };

  const saveDailyPlanner = async () => {
    setIsSaving(true); const dateStr = formatDateForDB(currentDate); const dailyEvents = events[dateStr] || {};
    const upsertData = Object.values(dailyEvents).filter(ev => ev.topic?.trim() || ev.notes?.trim()).map(ev => ({ teacher_id: teacherId, date: dateStr, period: ev.period, topic: ev.topic || '', notes: ev.notes || '' }));
    if (upsertData.length > 0) { const { error } = await supabase.from('planner_events').upsert(upsertData, { onConflict: 'teacher_id,date,period' }); if (error) alert('שגיאה: ' + error.message); }
    setIsSaving(false);
  };

  const changeDate = (amount: number) => { const newDate = new Date(currentDate); if (view === 'daily') newDate.setDate(newDate.getDate() + amount); if (view === 'weekly') newDate.setDate(newDate.getDate() + (amount * 7)); if (view === 'monthly') newDate.setMonth(newDate.getMonth() + amount); setCurrentDate(newDate); };

  const isWeekend = currentDate.getDay() === 6;
  const currentDBDate = formatDateForDB(currentDate);
  const dailySchedule = baseSchedule.filter(s => s.day_of_week === currentDate.getDay() + 1).sort((a, b) => a.period - b.period);

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden print:shadow-none print:border-none">
      
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
            {/* DAILY VIEW */}
            {view === 'daily' && (
              <div className="space-y-4">
                {isWeekend ? (
                  <div className="text-center py-20 text-slate-400">יום שבת - מנוחה!</div>
                ) : dailySchedule.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 text-slate-500 rounded-3xl">לא מוגדרים שיעורים להיום.</div>
                ) : (
                  <>
                    {dailySchedule.map((classData) => {
                      const period = classData.period;
                      const eventData = events[currentDBDate]?.[period] || { topic: '', notes: '' };
                      return (
                        <div key={period} className="flex flex-col md:flex-row gap-4 items-stretch bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                          <div className="w-full md:w-32 flex flex-col justify-center items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                            <span className="text-xs font-bold text-indigo-400 mb-1">שיעור {period}</span>
                            <span className="text-2xl font-black text-indigo-800">{classData.my_classes.class_name}</span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <input type="text" placeholder="מה נלמד היום? (נושא)" value={eventData.topic || ''} onChange={(e) => handleEventChange(currentDBDate, period, 'topic', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium" />
                            <textarea placeholder="הערות ורפלקציה..." value={eventData.notes || ''} onChange={(e) => handleEventChange(currentDBDate, period, 'notes', e.target.value)} rows={2} className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-sm resize-none" />
                          </div>
                        </div>
                      );
                    })}
                    <div className="sticky bottom-20 md:bottom-6 flex justify-end mt-8 z-40">
                      <button onClick={saveDailyPlanner} disabled={isSaving} className="shadow-2xl shadow-indigo-300/50 bg-indigo-600 text-white px-6 sm:px-8 py-4 rounded-full font-bold flex items-center gap-3 w-full md:w-auto justify-center">
                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} שמור תכנון
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* WEEKLY VIEW */}
            {view === 'weekly' && (
              <>
                {/* Desktop Grid */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3 bg-white w-16 border-b border-l border-slate-200"></th>
                        {[1, 2, 3, 4, 5, 6].map(dayIdx => {
                          const dateOfCol = new Date(getStartOfWeek(currentDate)); dateOfCol.setDate(dateOfCol.getDate() + dayIdx - 1);
                          return (
                            <th key={dayIdx} className="p-3 bg-slate-50 border border-slate-200 text-slate-700">
                              {dayNames[dayIdx - 1]}<span className="block text-xs font-normal text-slate-400 mt-1">{dateOfCol.toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'})}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[1,2,3,4,5,6,7,8,9,10].map(period => (
                        <tr key={period}>
                          <td className="p-2 text-center text-sm font-semibold text-slate-400 bg-slate-50 border-b border-l border-slate-200">{period}</td>
                          {[1, 2, 3, 4, 5, 6].map(dayIdx => {
                            const classData = baseSchedule.find(s => s.day_of_week === dayIdx && s.period === period);
                            const dateOfCol = new Date(getStartOfWeek(currentDate)); dateOfCol.setDate(dateOfCol.getDate() + dayIdx - 1);
                            const cellEvent = events[formatDateForDB(dateOfCol)]?.[period];
                            return (
                              <td key={dayIdx} className="p-2 border border-slate-200 h-24 align-top">
                                {classData ? (
                                  <div className="bg-indigo-50/40 rounded-lg p-2 h-full flex flex-col">
                                    <span className="font-bold text-indigo-700 text-sm">{classData.my_classes.class_name}</span>
                                    {cellEvent?.topic && <span className="text-xs text-slate-700 mt-1 line-clamp-2">{cellEvent.topic}</span>}
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Vertical List */}
                <div className="md:hidden space-y-6 pb-20">
                  {[1, 2, 3, 4, 5, 6].map(dayIdx => {
                    const dateOfCol = new Date(getStartOfWeek(currentDate)); dateOfCol.setDate(dateOfCol.getDate() + dayIdx - 1);
                    const daySchedule = baseSchedule.filter(s => s.day_of_week === dayIdx).sort((a,b) => a.period - b.period);
                    
                    return (
                      <div key={dayIdx} className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4">
                        <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                          <h3 className="font-bold text-lg text-slate-800">יום {dayNames[dayIdx - 1]}</h3>
                          <span className="text-sm text-slate-400">{dateOfCol.toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'})}</span>
                        </div>
                        {daySchedule.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">אין שיעורים</p>
                        ) : (
                          <div className="space-y-3">
                            {daySchedule.map(cls => {
                              const ev = events[formatDateForDB(dateOfCol)]?.[cls.period];
                              return (
                                <div key={cls.period} className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">{cls.period}</div>
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-800">{cls.my_classes.class_name}</p>
                                    <p className={`text-xs mt-1 ${ev?.topic ? 'text-slate-600' : 'text-slate-400 italic'}`}>{ev?.topic || 'לא תוכנן נושא'}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* MONTHLY VIEW (Overview) */}
            {view === 'monthly' && (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 pb-20">
                {dayNames.map(day => <div key={day} className="text-center font-bold text-[10px] sm:text-sm text-slate-400 py-1 sm:py-2">{day}</div>)}
                {Array.from({ length: getStartOfMonth(currentDate).getDay() }).map((_, i) => <div key={`empty-${i}`} className="h-16 sm:h-28 bg-slate-50/50 rounded-xl border border-transparent"></div>)}
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                  const dateStr = formatDateForDB(currentDay);
                  const dayEvents = events[dateStr];
                  const plannedCount = dayEvents ? Object.values(dayEvents).filter(e => e.topic).length : 0;
                  const isToday = formatDateForDB(new Date()) === dateStr;
                  return (
                    <div key={i} onClick={() => { setCurrentDate(currentDay); setView('daily'); }} className={`h-16 sm:h-28 p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col ${isToday ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-300'}`}>
                      <span className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mb-1 sm:mb-2 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>{i + 1}</span>
                      {plannedCount > 0 && <span className="mt-auto text-[9px] sm:text-xs font-medium text-indigo-600 bg-indigo-100 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md text-center truncate">{plannedCount} ש׳</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}