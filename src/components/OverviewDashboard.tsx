"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, CheckCircle2, Circle, Trash2, Sun, Coffee } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
}

interface TodayClass {
  period: number;
  room: string | null;
  my_classes: { class_name: string };
}

export default function OverviewDashboard({ teacherId, teacherName }: { teacherId: string, teacherName: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // ברכת שלום משתנה לפי השעה
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';

  useEffect(() => {
    fetchOverviewData();
  }, [teacherId]);

  const fetchOverviewData = async () => {
    setLoading(true);
    
    // 1. שליפת משימות
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (tasksData) setTasks(tasksData);

    // 2. שליפת מערכת שעות להיום
    const todayDayOfWeek = new Date().getDay() + 1;
    const { data: scheduleData } = await supabase
      .from('base_schedule')
      .select('period, room, my_classes(class_name)')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', todayDayOfWeek)
      .order('period', { ascending: true });

    if (scheduleData) setTodayClasses(scheduleData as unknown as TodayClass[]);

    setLoading(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ teacher_id: teacherId, title: newTaskTitle.trim() }])
      .select()
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) setTasks(tasks.filter(t => t.id !== taskId));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* אזור קבלת פנים ומערכת יומית */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-3 mb-2 text-indigo-100">
          {hour < 12 ? <Coffee className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          <span className="text-lg font-medium">{greeting},</span>
        </div>
        <h2 className="text-4xl font-black mb-8">{teacherName}!</h2>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            היום יש לך {todayClasses.length} שיעורים מתוכננים
          </h3>
          
          {todayClasses.length === 0 ? (
            <p className="text-indigo-100">אין לך שיעורים במערכת היום. יום חופשי? איזה כיף!</p>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls) => (
                <div key={cls.period} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                  <span className="font-bold">שיעור {cls.period}</span>
                  <span className="text-lg font-medium">{cls.my_classes.class_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* אזור רשימת משימות */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">רשימת משימות והכנות</h2>
        
        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="מה צריך להכין? למשל: לארגן צבעי גואש"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button type="submit" disabled={!newTaskTitle.trim()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            <Plus className="w-6 h-6" />
          </button>
        </form>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {tasks.length === 0 ? (
            <p className="text-center text-slate-400 py-8">אין משימות פתוחות. הכל מוכן!</p>
          ) : (
            tasks.map(task => (
              <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.is_completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTask(task.id, task.is_completed)}>
                  {task.is_completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-slate-300" />}
                  <span className={`font-medium ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}