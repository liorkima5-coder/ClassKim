"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DAY_NAMES, PERIODS, classColor, dayOfWeek, isDayOff, toDateKey, type BaseScheduleItem, type ClassItem, type PlannerEvent } from '../lib/planner';
import { Panel, Spinner, ErrorNote, inputClass, iconButton, primaryButton, secondaryButton } from './ui';
import { Plus, Check, Trash2, MapPin, CalendarDays, Coffee } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
}

interface TodayLesson {
  period: number;
  classId: string;
  room: string | null;
  topic: string;
  isExtra: boolean;
}

export default function OverviewDashboard({ teacherId, teacherName, daysOff, onOpenPlanner }: {
  teacherId: string;
  teacherName: string;
  daysOff: number[];
  onOpenPlanner: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<TodayLesson[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
  const dayOff = isDayOff(today, daysOff);

  const fetchOverviewData = useCallback(async () => {
    const now = new Date();
    const [tasksRes, classesRes, scheduleRes, eventsRes] = await Promise.all([
      supabase.from('tasks').select('id, title, is_completed').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('my_classes').select('id, class_name').eq('teacher_id', teacherId).order('created_at', { ascending: true }),
      supabase.from('base_schedule').select('id, day_of_week, period, class_id, room').eq('teacher_id', teacherId).eq('day_of_week', dayOfWeek(now)),
      supabase.from('planner_events').select('date, period, topic, notes, class_id').eq('teacher_id', teacherId).eq('date', toDateKey(now)),
    ]);

    if (tasksRes.error || classesRes.error || scheduleRes.error || eventsRes.error) {
      setError('חלק מהנתונים לא נטענו. רענני את הדף כדי לנסות שוב.');
    }

    const classList = (classesRes.data ?? []) as ClassItem[];
    const knownIds = new Set(classList.map(c => c.id));
    const base = (scheduleRes.data ?? []) as BaseScheduleItem[];
    const events = (eventsRes.data ?? []) as PlannerEvent[];

    // מיזוג המערכת הקבועה עם שינויים שנרשמו ביומן להיום
    const merged: TodayLesson[] = [];
    for (const period of PERIODS) {
      const baseLesson = base.find(b => b.period === period);
      const ev = events.find(e => e.period === period);
      const evClass = ev?.class_id && knownIds.has(ev.class_id) ? ev.class_id : null;
      const classId = evClass ?? baseLesson?.class_id;
      if (!classId) continue;
      merged.push({
        period,
        classId,
        room: baseLesson && baseLesson.class_id === classId ? baseLesson.room : null,
        topic: ev?.topic ?? '',
        isExtra: !!evClass && evClass !== baseLesson?.class_id,
      });
    }

    setTasks((tasksRes.data ?? []) as Task[]);
    setClasses(classList);
    setLessons(merged);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    const load = async () => { await fetchOverviewData(); };
    load();
  }, [fetchOverviewData]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const { data, error: insertError } = await supabase.from('tasks').insert([{ teacher_id: teacherId, title }]).select('id, title, is_completed').single();
    if (insertError || !data) {
      setError('המשימה לא נשמרה. נסי שוב.');
      return;
    }
    setTasks(prev => [data as Task, ...prev]);
    setNewTaskTitle('');
  };

  const toggleTask = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    const { error: updateError } = await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
    if (updateError) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      setError('השינוי לא נשמר. נסי שוב.');
    }
  };

  const deleteTask = async (task: Task) => {
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
    if (deleteError) setError('המשימה לא נמחקה. נסי שוב.');
    else setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const clearCompleted = async () => {
    const done = tasks.filter(t => t.is_completed);
    const { error: deleteError } = await supabase.from('tasks').delete().in('id', done.map(t => t.id));
    if (deleteError) setError('המשימות לא נמחקו. נסי שוב.');
    else setTasks(prev => prev.filter(t => !t.is_completed));
  };

  if (loading) return <Spinner />;

  const openTasks = tasks.filter(t => !t.is_completed);
  const doneTasks = tasks.filter(t => t.is_completed);
  const unplanned = lessons.filter(l => !l.topic.trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-ink-soft">
          יום {DAY_NAMES[today.getDay()]}, {today.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">{greeting}, {teacherName}</h1>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* השיעורים של היום */}
        <Panel>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold">השיעורים של היום</h2>
              {!dayOff && lessons.length > 0 && (
                <p className="mt-0.5 text-sm text-ink-soft">
                  {lessons.length} שיעורים{unplanned > 0 ? `, ${unplanned} עוד בלי נושא` : ', כולם מתוכננים'}
                </p>
              )}
            </div>
            <button onClick={onOpenPlanner} className={`${secondaryButton} px-4 py-2 text-sm`}>
              <CalendarDays className="h-4 w-4" aria-hidden /> פתיחת היומן
            </button>
          </div>

          {dayOff && lessons.length === 0 ? (
            <div className="flex items-center gap-4 rounded-xl bg-marker-50 p-5 text-marker-700">
              <Coffee className="h-8 w-8 shrink-0" aria-hidden />
              <p className="font-semibold">היום יום חופשי. אין שיעורים במערכת.</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-line p-6 text-center text-ink-soft">
              אין שיעורים במערכת להיום. אפשר להגדיר את מערכת השעות בלשונית ההגדרות.
            </div>
          ) : (
            <ol className="divide-y divide-line-soft">
              {lessons.map(lesson => {
                const cls = classes.find(c => c.id === lesson.classId);
                const color = classColor(classes, lesson.classId);
                return (
                  <li key={lesson.period} className="flex items-center gap-4 py-3">
                    <span className="w-7 shrink-0 text-center font-display text-lg font-semibold text-ink-faint">{lesson.period}</span>
                    <span className={`w-24 shrink-0 truncate rounded-lg border px-2.5 py-1 text-center text-sm font-bold ${color.chip}`}>{cls?.class_name ?? 'כיתה'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate ${lesson.topic ? 'text-ink' : 'text-ink-faint'}`}>{lesson.topic || 'עוד לא נרשם נושא'}</p>
                      {(lesson.room || lesson.isExtra) && (
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                          {lesson.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{lesson.room}</span>}
                          {lesson.isExtra && <span className="rounded bg-marker-100 px-1.5 font-semibold text-marker-700">שינוי במערכת</span>}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        {/* משימות */}
        <Panel>
          <h2 className="mb-4 font-display text-xl font-semibold">מה צריך להכין</h2>
          <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
            <label htmlFor="new-task" className="sr-only">משימה חדשה</label>
            <input id="new-task" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="למשל: לצלם דפי עבודה לה׳2" className={inputClass} />
            <button type="submit" disabled={!newTaskTitle.trim()} className={`${primaryButton} px-3.5`} aria-label="הוספת משימה">
              <Plus className="h-5 w-5" />
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="py-6 text-center text-ink-soft">אין משימות פתוחות.</p>
          ) : (
            <ul className="space-y-1">
              {[...openTasks, ...doneTasks].map(task => (
                <li key={task.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-line-soft">
                  <button
                    onClick={() => toggleTask(task)}
                    role="checkbox"
                    aria-checked={task.is_completed}
                    aria-label={task.title}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${task.is_completed ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-surface hover:border-brand-500'}`}
                  >
                    {task.is_completed && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 ${task.is_completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{task.title}</span>
                  <button onClick={() => deleteTask(task)} className={`${iconButton} h-8 w-8 opacity-60 group-hover:opacity-100 hover:text-danger`} aria-label={`מחיקת ${task.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {doneTasks.length > 0 && (
            <button onClick={clearCompleted} className="mt-3 text-sm font-semibold text-ink-soft hover:text-ink">
              ניקוי {doneTasks.length} משימות שהושלמו
            </button>
          )}
        </Panel>
      </div>
    </div>
  );
}
