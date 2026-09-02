"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, X, MapPin, LayoutGrid, CalendarDays } from 'lucide-react';

interface ClassItem { id: string; class_name: string; }
interface ScheduleItem { id: string; day_of_week: number; period: number; class_id: string; room: string | null; my_classes?: { class_name: string }; }

export default function BaseSchedule({ teacherId }: { teacherId: string }) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<number>(1); // יום ראשון כברירת מחדל
  
  const [editingCell, setEditingCell] = useState<{day: number, period: number} | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [roomInput, setRoomInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const days = [
    { val: 1, label: 'א׳', full: 'ראשון' }, { val: 2, label: 'ב׳', full: 'שני' }, { val: 3, label: 'ג׳', full: 'שלישי' },
    { val: 4, label: 'ד׳', full: 'רביעי' }, { val: 5, label: 'ה׳', full: 'חמישי' }, { val: 6, label: 'ו׳', full: 'שישי' }
  ];
  const periods = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => { fetchData(); }, [teacherId]);

  const fetchData = async () => {
    const { data: classesData } = await supabase.from('my_classes').select('*').eq('teacher_id', teacherId);
    if (classesData) setClasses(classesData);
    const { data: scheduleData } = await supabase.from('base_schedule').select('id, day_of_week, period, class_id, room, my_classes(class_name)').eq('teacher_id', teacherId);
    if (scheduleData) setSchedule(scheduleData as any);
    setLoading(false);
  };

  const openEditModal = (day: number, period: number) => {
    const existing = schedule.find(s => s.day_of_week === day && s.period === period);
    setSelectedClassId(existing?.class_id || '');
    setRoomInput(existing?.room || '');
    setEditingCell({ day, period });
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    setIsSaving(true);
    const { day, period } = editingCell;
    const existing = schedule.find(s => s.day_of_week === day && s.period === period);

    if (!selectedClassId) {
      if (existing) await supabase.from('base_schedule').delete().eq('id', existing.id);
    } else {
      if (existing) await supabase.from('base_schedule').update({ class_id: selectedClassId, room: roomInput }).eq('id', existing.id);
      else await supabase.from('base_schedule').insert([{ teacher_id: teacherId, day_of_week: day, period, class_id: selectedClassId, room: roomInput }]);
    }
    await fetchData();
    setEditingCell(null);
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 p-5 sm:p-8 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><LayoutGrid className="w-6 h-6" /></div>
        <h2 className="text-2xl font-bold text-slate-800">מערכת שעות קבועה</h2>
      </div>
      <p className="text-slate-500 mb-6 font-medium text-sm sm:text-base">הגדירי את מערכת השעות השבועית שלך כדי שהיומן יתמלא אוטומטית.</p>

      {/* בורר ימים בסגנון אפליקציה */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-hide">
        {days.map(d => (
          <button 
            key={d.val} onClick={() => setActiveDay(d.val)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
              activeDay === d.val ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-xs font-medium mb-1 opacity-80">יום</span>
            <span className="text-xl font-bold">{d.label}</span>
          </button>
        ))}
      </div>

      {/* רשימת שעות אנכית ליום הנבחר */}
      <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-indigo-500" /> 
          מערכת ליום {days.find(d => d.val === activeDay)?.full}
        </h3>
        
        {periods.map(period => {
          const cellData = schedule.find(s => s.day_of_week === activeDay && s.period === period);
          return (
            <div 
              key={period} 
              onClick={() => openEditModal(activeDay, period)}
              className={`flex items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                cellData ? 'bg-white border-indigo-100 shadow-sm hover:border-indigo-300' : 'bg-transparent border-dashed border-slate-300 text-slate-400 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl font-black text-lg ml-4">
                {period}
              </div>
              
              <div className="flex-1">
                {cellData ? (
                  <div>
                    <span className="block font-bold text-slate-800 text-lg">{cellData.my_classes?.class_name}</span>
                    {cellData.room && <span className="text-xs font-medium text-indigo-600 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {cellData.room}</span>}
                  </div>
                ) : (
                  <span className="font-medium">לחצי לשיבוץ שיעור...</span>
                )}
              </div>
              
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400">
                {cellData ? <LayoutGrid className="w-4 h-4" /> : '+'}
              </div>
            </div>
          );
        })}
      </div>

      {/* מודאל שיבוץ נשאר זהה, רק עם עיצוב מלאכותי יותר */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4 pb-0">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 transform transition-all pb-safe">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">שיבוץ שיעור</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">יום {days.find(d => d.val === editingCell.day)?.full}, שיעור {editingCell.period}</p>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">איזו כיתה?</label>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-800 appearance-none">
                  <option value="">-- חלון (ללא כיתה) --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">מיקום / חדר (אופציונלי)</label>
                <input type="text" value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="למשל: סטודיו 2..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-800" />
              </div>
              <button onClick={handleSaveCell} disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 mt-4">{isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : 'שמור במערכת'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}