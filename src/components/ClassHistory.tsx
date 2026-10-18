"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { classColor, dayOfWeek, fromDateKey, type BaseScheduleItem, type ClassItem, type PlannerEvent } from '../lib/planner';
import { Panel, PanelHeader, Spinner, EmptyState, ErrorNote, inputClass } from './ui';
import { History, BookOpen } from 'lucide-react';

export default function ClassHistory({ teacherId }: { teacherId: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedule, setSchedule] = useState<BaseScheduleItem[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    const [classesRes, scheduleRes, eventsRes] = await Promise.all([
      supabase.from('my_classes').select('id, class_name').eq('teacher_id', teacherId).order('created_at', { ascending: true }),
      supabase.from('base_schedule').select('id, day_of_week, period, class_id, room').eq('teacher_id', teacherId),
      supabase.from('planner_events').select('date, period, topic, notes, class_id').eq('teacher_id', teacherId).order('date', { ascending: false }).order('period', { ascending: false }),
    ]);
    if (classesRes.error || scheduleRes.error || eventsRes.error) setError('חלק מהנתונים לא נטענו. רענני את הדף כדי לנסות שוב.');

    const classList = (classesRes.data ?? []) as ClassItem[];
    setClasses(classList);
    setSelectedClassId(prev => prev || classList[0]?.id || '');
    setSchedule((scheduleRes.data ?? []) as BaseScheduleItem[]);
    setEvents((eventsRes.data ?? []) as PlannerEvent[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    const load = async () => { await fetchAll(); };
    load();
  }, [fetchAll]);

  const knownIds = new Set(classes.map(c => c.id));

  /*
    לכל שיעור שנרשם ביומן קובעים לאיזו כיתה הוא שייך:
    1. אם נשמרה כיתה עם השיעור – זו הכיתה (כולל החלפות ושיעורים חד-פעמיים).
    2. רשומות ישנות בלי כיתה שמורה – משייכים לפי המערכת הקבועה של אותו יום ושעה.
  */
  const history = events.filter(ev => {
    if (!ev.topic?.trim() && !ev.notes?.trim()) return false;
    if (ev.class_id && knownIds.has(ev.class_id)) return ev.class_id === selectedClassId;
    const dow = dayOfWeek(fromDateKey(ev.date));
    return schedule.some(s => s.class_id === selectedClassId && s.day_of_week === dow && s.period === ev.period);
  });

  const formatDate = (key: string) =>
    fromDateKey(key).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const selected = classes.find(c => c.id === selectedClassId);

  return (
    <Panel className="min-h-[28rem]">
      <PanelHeader icon={History} title="מה לימדתי כל כיתה" description="כל השיעורים שנרשמו ביומן לכיתה, מהאחרון לראשון.">
        {classes.length > 0 && (
          <div className="w-full sm:w-56">
            <label htmlFor="history-class" className="sr-only">בחירת כיתה</label>
            <select id="history-class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={`${inputClass} font-semibold`}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
        )}
      </PanelHeader>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {loading ? <Spinner /> : classes.length === 0 ? (
        <EmptyState icon={BookOpen} title="עוד אין כיתות">מוסיפים כיתות בלשונית ההגדרות, ואז כל שיעור שנרשם ביומן יופיע כאן.</EmptyState>
      ) : history.length === 0 ? (
        <EmptyState icon={History} title={`עוד לא נרשמו שיעורים ל${selected?.class_name ?? 'כיתה'}`}>
          כשכותבים נושא או הערה לשיעור ביומן ושומרים, הוא מופיע כאן.
        </EmptyState>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-soft">
            <span className={`me-2 inline-block rounded border px-1.5 font-bold ${classColor(classes, selectedClassId).chip}`}>{selected?.class_name}</span>
            {history.length} שיעורים נרשמו
          </p>
          <ol className="relative space-y-4 border-s-2 border-line ps-6">
            {history.map(item => (
              <li key={`${item.date}-${item.period}`} className="relative">
                <span className={`absolute -start-[1.95rem] top-2 h-3 w-3 rounded-full ring-4 ring-surface ${classColor(classes, selectedClassId).dot}`} aria-hidden />
                <p className="text-sm text-ink-soft">{formatDate(item.date)} · שיעור {item.period}</p>
                <p className="mt-0.5 font-display text-lg font-semibold text-ink">{item.topic || 'בלי נושא'}</p>
                {item.notes && <p className="mt-1 max-w-prose whitespace-pre-wrap leading-relaxed text-ink-soft">{item.notes}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
}
