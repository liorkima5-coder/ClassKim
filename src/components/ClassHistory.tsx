"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, History, BookOpen, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface ClassItem {
  id: string;
  class_name: string;
}

interface HistoryEvent {
  date: string;
  period: number;
  topic: string;
  notes: string;
}

export default function ClassHistory({ teacherId }: { teacherId: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. שליפת רשימת הכיתות הקיימות כדי לאכלס את התפריט הנגלל
  useEffect(() => {
    const initClasses = async () => {
      const { data } = await supabase
        .from('my_classes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: true });
        
      if (data && data.length > 0) {
        setClasses(data);
        setSelectedClassId(data[0].id); // בחירת הכיתה הראשונה כברירת מחדל
      } else {
        setLoading(false);
      }
    };
    initClasses();
  }, [teacherId]);

  // 2. שליפת ההיסטוריה בכל פעם שמשנים כיתה
  useEffect(() => {
    if (!selectedClassId) return;
    fetchClassHistory();
  }, [selectedClassId]);

  const fetchClassHistory = async () => {
    setLoading(true);

    // א. שליפת מערכת השעות של הכיתה הספציפית (באילו ימים ושעות היא לומדת?)
    const { data: scheduleData } = await supabase
      .from('base_schedule')
      .select('day_of_week, period')
      .eq('class_id', selectedClassId);

    const scheduleMap = scheduleData || [];

    // ב. שליפת כל השיעורים של המורה שיש בהם תוכן כלשהו
    const { data: eventsData } = await supabase
      .from('planner_events')
      .select('date, period, topic, notes')
      .eq('teacher_id', teacherId)
      .order('date', { ascending: false });

    if (eventsData) {
      // ג. סינון (בצד הלקוח) - רק שיעורים שנופלים על היום והשעה של הכיתה הזו
      const classEvents = eventsData.filter(ev => {
        // התעלמות משיעורים ריקים
        if (!ev.topic?.trim() && !ev.notes?.trim()) return false;
        
        // חילוץ מדויק של היום בשבוע מתוך התאריך (YYYY-MM-DD)
        const [year, month, day] = ev.date.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
        const dayOfWeek = dateObj.getDay() + 1;

        // בדיקה האם השיעור הזה תואם למערכת של הכיתה
        return scheduleMap.some(s => s.day_of_week === dayOfWeek && s.period === ev.period);
      });

      setHistory(classEvents);
    }
    
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 min-h-[500px]">
      
      {/* כותרת ובחירת כיתה */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            מעקב הספק והיסטוריית כיתה
          </h2>
          <p className="text-slate-500 mt-1">בחר כיתה כדי לראות את כל מה שלימדת אותה עד היום</p>
        </div>

        {classes.length > 0 && (
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 block pr-10 p-3 outline-none appearance-none font-medium"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* תצוגת הנתונים */}
      {classes.length === 0 ? (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center">
          <BookOpen className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg">עוד לא הוספת כיתות למערכת.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
          <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-lg">אין היסטוריה להציג.</p>
          <p className="text-sm mt-1">עדיין לא תוכננו שיעורים לכיתה זו ביומן.</p>
        </div>
      ) : (
        <div className="relative border-r-2 border-indigo-100 pr-6 space-y-8 mt-4 mr-2">
          {history.map((item, index) => (
            <div key={`${item.date}-${item.period}`} className="relative group">
              {/* נקודת ציר הזמן */}
              <div className="absolute -right-[33px] top-1.5 w-4 h-4 rounded-full bg-indigo-200 border-4 border-white shadow-sm group-hover:bg-indigo-500 transition-colors"></div>
              
              {/* כרטיסיית השיעור */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all">
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg inline-flex">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDate(item.date)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    שיעור {item.period}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {item.topic || 'ללא נושא'}
                </h3>
                
                {item.notes && (
                  <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}