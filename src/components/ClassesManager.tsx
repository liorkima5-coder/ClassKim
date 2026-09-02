"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';

interface ClassItem {
  id: string;
  class_name: string;
}

export default function ClassesManager({ teacherId }: { teacherId: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [teacherId]);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('my_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('שגיאה בשליפת כיתות:', error);
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    setIsAdding(true);

    const { data, error } = await supabase
      .from('my_classes')
      .insert([{ teacher_id: teacherId, class_name: newClassName.trim() }])
      .select()
      .single();

    if (error) {
      alert('לא הצלחנו להוסיף את הכיתה. נסה שוב.');
    } else if (data) {
      setClasses([...classes, data]);
      setNewClassName('');
    }
    
    setIsAdding(false);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('האם אתה בטוח? פעולה זו תמחק גם את השיעורים המקושרים לכיתה זו ביומן.')) return;

    const { error } = await supabase.from('my_classes').delete().eq('id', classId);

    if (!error) {
      setClasses(classes.filter(c => c.id !== classId));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 p-5 sm:p-8 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">הכיתות שלי</h2>
      </div>
      <p className="text-slate-500 mb-6 sm:mb-8 font-medium text-sm sm:text-base">הוסיפי את כל הכיתות והקבוצות שאת מלמדת השנה (למשל: א'1, מגמת אמנות, וכו')</p>

      {/* טופס הוספת כיתה מותאם לנייד */}
      <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-3 mb-8 sm:mb-10 max-w-2xl">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="הקלידי את שם הכיתה..."
          className="w-full sm:flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isAdding || !newClassName.trim()}
          className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-slate-300 disabled:active:scale-100 flex items-center justify-center gap-2 font-bold shadow-md shadow-indigo-200"
        >
          {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          הוסף כיתה
        </button>
      </form>

      {/* רשימת הכיתות */}
      {classes.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-20" />
          <p className="font-medium text-base sm:text-lg">עדיין לא הוספת כיתות למערכת.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-4 rounded-2xl group hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="font-bold text-slate-700 text-base sm:text-lg pr-2">{cls.class_name}</span>
              <button
                onClick={() => handleDeleteClass(cls.id)}
                className="text-slate-300 hover:text-red-500 transition-colors bg-white p-2 rounded-xl hover:bg-red-50 border border-slate-100 hover:border-red-100"
                title="מחק כיתה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}