"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  DAY_NAMES, PERIODS, SCHOOL_DAYS, addDays, classColor, dayOfWeek, errorMessage, fromDateKey, isDayOff, startOfWeek, toDateKey,
  type BaseScheduleItem, type ClassItem, type PlannerEvent,
} from '../lib/planner';
import { Panel, Spinner, ErrorNote, Modal, iconButton, labelClass, inputClass, primaryButton, secondaryButton } from './ui';
import { ChevronRight, ChevronLeft, Save, Printer, Plus, CheckCircle2, Loader2, MapPin, Coffee, X } from 'lucide-react';

type ViewMode = 'daily' | 'weekly' | 'monthly';
type EventsMap = Record<string, Record<number, PlannerEvent>>;

interface LessonSlot {
  period: number;
  classId: string;
  room: string | null;
  isExtra: boolean; // שיעור שאינו לפי המערכת הקבועה (החלפה / מילוי מקום)
}

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'daily', label: 'יום' },
  { id: 'weekly', label: 'שבוע' },
  { id: 'monthly', label: 'חודש' },
];

function rangeFor(date: Date, view: ViewMode): [Date, Date] {
  if (view === 'weekly') {
    const start = startOfWeek(date);
    return [start, addDays(start, 6)];
  }
  if (view === 'monthly') {
    return [new Date(date.getFullYear(), date.getMonth(), 1), new Date(date.getFullYear(), date.getMonth() + 1, 0)];
  }
  return [date, date];
}

interface PlannerData {
  baseSchedule: BaseScheduleItem[];
  classes: ClassItem[];
  events: EventsMap;
  failed: boolean;
}

async function loadPlannerData(teacherId: string, fromKey: string, toKey: string): Promise<PlannerData> {
  const [scheduleRes, classesRes, eventsRes] = await Promise.all([
    supabase.from('base_schedule').select('id, day_of_week, period, class_id, room').eq('teacher_id', teacherId),
    supabase.from('my_classes').select('id, class_name').eq('teacher_id', teacherId).order('created_at', { ascending: true }),
    supabase.from('planner_events').select('id, date, period, topic, notes, class_id').eq('teacher_id', teacherId).gte('date', fromKey).lte('date', toKey),
  ]);

  const events: EventsMap = {};
  for (const ev of (eventsRes.data ?? []) as PlannerEvent[]) {
    const key = ev.date.slice(0, 10);
    (events[key] ??= {})[ev.period] = { ...ev, date: key, topic: ev.topic ?? '', notes: ev.notes ?? '' };
  }

  return {
    baseSchedule: (scheduleRes.data ?? []) as BaseScheduleItem[],
    classes: (classesRes.data ?? []) as ClassItem[],
    events,
    failed: !!(scheduleRes.error || classesRes.error || eventsRes.error),
  };
}

export default function DailyPlanner({ teacherId, daysOff, onDirtyChange }: {
  teacherId: string;
  daysOff: number[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<ViewMode>('daily');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [baseSchedule, setBaseSchedule] = useState<BaseScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<EventsMap>({});
  const [dirtyDates, setDirtyDates] = useState<Set<string>>(new Set());

  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraPeriod, setExtraPeriod] = useState<number>(1);
  const [extraClassId, setExtraClassId] = useState<string>('');

  const isDirty = dirtyDates.size > 0;
  const [rangeStart, rangeEnd] = rangeFor(currentDate, view);
  const rangeStartKey = toDateKey(rangeStart);
  const rangeEndKey = toDateKey(rangeEnd);
  const knownClassIds = new Set(classes.map(c => c.id));

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  // אזהרה לפני סגירת הדף עם שינויים שלא נשמרו
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const applyData = useCallback((data: PlannerData) => {
    setError(data.failed ? 'חלק מהנתונים לא נטענו. רענני את הדף כדי לנסות שוב.' : '');
    setBaseSchedule(data.baseSchedule);
    setClasses(data.classes);
    setEvents(data.events);
    setDirtyDates(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    loadPlannerData(teacherId, rangeStartKey, rangeEndKey).then(data => { if (active) applyData(data); });
    return () => { active = false; };
  }, [teacherId, rangeStartKey, rangeEndKey, applyData]);

  const refresh = () => loadPlannerData(teacherId, rangeStartKey, rangeEndKey).then(applyData);

  /** השיעורים של תאריך מסוים: המערכת הקבועה + שינויים שנרשמו ביומן */
  const lessonsFor = (date: Date): LessonSlot[] => {
    const key = toDateKey(date);
    const dayEvents = events[key] ?? {};
    const off = isDayOff(date, daysOff);
    const base = off ? [] : baseSchedule.filter(s => s.day_of_week === dayOfWeek(date));
    const slots: LessonSlot[] = [];
    for (const period of PERIODS) {
      const baseLesson = base.find(b => b.period === period);
      const ev = dayEvents[period];
      const evClass = ev?.class_id && knownClassIds.has(ev.class_id) ? ev.class_id : null;
      const classId = evClass ?? baseLesson?.class_id;
      if (!classId) continue;
      slots.push({
        period,
        classId,
        room: baseLesson?.class_id === classId ? baseLesson.room : null,
        isExtra: !!evClass && evClass !== baseLesson?.class_id,
      });
    }
    return slots;
  };

  const updateEvent = (dateKey: string, period: number, patch: Partial<PlannerEvent>) => {
    setEvents(prev => {
      const day = { ...(prev[dateKey] ?? {}) };
      const prevEvent = day[period];
      day[period] = { topic: prevEvent?.topic ?? '', notes: prevEvent?.notes ?? '', class_id: prevEvent?.class_id ?? null, id: prevEvent?.id, date: dateKey, period, ...patch };
      return { ...prev, [dateKey]: day };
    });
    setDirtyDates(prev => new Set(prev).add(dateKey));
    setSaveSuccess(false);
  };

  const confirmDiscard = () => !isDirty || confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?');

  const goTo = (date: Date, nextView: ViewMode = view) => {
    if (!confirmDiscard()) return;
    setCurrentDate(date);
    setView(nextView);
  };

  const shift = (amount: number) => {
    const d = new Date(currentDate);
    if (view === 'daily') d.setDate(d.getDate() + amount);
    if (view === 'weekly') d.setDate(d.getDate() + amount * 7);
    if (view === 'monthly') d.setMonth(d.getMonth() + amount, 1);
    goTo(d);
  };

  const handleAddDynamicClass = () => {
    if (!extraClassId) return;
    updateEvent(toDateKey(currentDate), extraPeriod, { class_id: extraClassId });
    setIsExtraModalOpen(false);
    setExtraClassId('');
  };

  const removeExtraLesson = (period: number) => {
    // אם אין בשעה הזו שיעור קבוע, גם מה שנכתב לשיעור החד-פעמי נמחק איתו
    const hasBaseLesson = !isDayOff(currentDate, daysOff) && baseSchedule.some(s => s.day_of_week === dayOfWeek(currentDate) && s.period === period);
    updateEvent(toDateKey(currentDate), period, hasBaseLesson ? { class_id: null } : { class_id: null, topic: '', notes: '' });
  };

  const save = async () => {
    setIsSaving(true);
    setError('');
    try {
      for (const dateKey of dirtyDates) {
        const date = fromDateKey(dateKey);
        const slots = lessonsFor(date);
        const base = isDayOff(date, daysOff) ? [] : baseSchedule.filter(s => s.day_of_week === dayOfWeek(date));

        for (const ev of Object.values(events[dateKey] ?? {})) {
          const slot = slots.find(s => s.period === ev.period);
          const baseClass = base.find(b => b.period === ev.period)?.class_id ?? null;
          const topic = ev.topic?.trim() ?? '';
          const notes = ev.notes?.trim() ?? '';
          // תמיד שומרים את הכיתה בפועל, כדי שההיסטוריה לא תשתנה אם המערכת הקבועה תשתנה בהמשך
          const classId = slot?.classId ?? null;
          const isEmpty = !topic && !notes && (!classId || classId === baseClass);

          if (isEmpty) {
            if (ev.id) {
              const { error: delError } = await supabase.from('planner_events').delete().eq('id', ev.id);
              if (delError) throw delError;
            }
            continue;
          }

          const row = { teacher_id: teacherId, date: dateKey, period: ev.period, topic, notes, class_id: classId };
          const { error: saveError } = ev.id
            ? await supabase.from('planner_events').update(row).eq('id', ev.id)
            : await supabase.from('planner_events').insert([row]);
          if (saveError) throw saveError;
        }
      }
      await refresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setError(`השמירה נכשלה: ${errorMessage(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const todayKey = toDateKey(new Date());
  const currentKey = toDateKey(currentDate);
  const dayEvents = events[currentKey] ?? {};
  const dayOff = isDayOff(currentDate, daysOff);
  const dailyLessons = view === 'daily' ? lessonsFor(currentDate) : [];
  const className = (id: string) => classes.find(c => c.id === id)?.class_name ?? 'כיתה';
  // בתצוגה השבועית מציגים שורות רק עד השיעור האחרון שיש בשבוע (לפחות 6)
  const weekLastPeriod = view === 'weekly'
    ? Math.max(6, ...SCHOOL_DAYS.flatMap(day => lessonsFor(addDays(rangeStart, day - 1)).map(l => l.period)))
    : 10;
  const weekPeriods = PERIODS.filter(p => p <= weekLastPeriod);

  const title =
    view === 'daily' ? `יום ${DAY_NAMES[currentDate.getDay()]}, ${currentDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}`
      : view === 'weekly' ? `${rangeStart.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} – ${addDays(rangeStart, 5).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}`
        : currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  return (
    <Panel className="relative">
      {/* סרגל ניווט */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className={iconButton} aria-label="הקודם"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={() => shift(1)} className={iconButton} aria-label="הבא"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="ms-2 font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
          {view === 'daily' && currentKey !== todayKey && (
            <button onClick={() => goTo(new Date())} className="ms-3 rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">להיום</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-3 rounded-xl bg-line-soft p-1 lg:flex-none" role="tablist" aria-label="תצוגה">
            {VIEWS.map(v => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                onClick={() => view !== v.id && goTo(currentDate, v.id)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${view === v.id ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-soft hover:text-ink'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className={`${iconButton} hidden md:inline-flex`} aria-label="הדפסה" title="הדפסה">
            <Printer className="h-5 w-5" />
          </button>
        </div>
      </div>

      <h2 className="mb-4 hidden font-display text-2xl font-semibold print:block">{title}</h2>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {loading ? <Spinner /> : (
        <>
          {/* תצוגה יומית */}
          {view === 'daily' && (
            <div className="space-y-3">
              {dayOff && (
                <div className="flex items-center gap-3 rounded-xl bg-marker-50 px-4 py-3 text-marker-700">
                  <Coffee className="h-5 w-5 shrink-0" aria-hidden />
                  <p className="font-semibold">
                    {currentDate.getDay() === 6 ? 'שבת. אין שיעורים במערכת.' : 'יום חופשי. אין שיעורים מהמערכת הקבועה.'}
                    {' '}אפשר עדיין להוסיף שיעור חד-פעמי.
                  </p>
                </div>
              )}

              {dailyLessons.length === 0 && !dayOff && (
                <div className="rounded-xl border-2 border-dashed border-line p-8 text-center text-ink-soft">
                  אין שיעורים במערכת ביום הזה. אפשר להוסיף שיעור חד-פעמי, או להגדיר את מערכת השעות בלשונית ההגדרות.
                </div>
              )}

              {dailyLessons.map(lesson => {
                const ev = dayEvents[lesson.period];
                const color = classColor(classes, lesson.classId);
                return (
                  <article
                    key={lesson.period}
                    className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[9rem_1fr] sm:gap-5 sm:p-4 print:break-inside-avoid ${lesson.isExtra ? 'border-marker-400/60 bg-marker-50' : 'border-line bg-surface'}`}
                  >
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
                      <span className="font-display text-sm font-semibold text-ink-faint">שיעור {lesson.period}</span>
                      <span className={`rounded-lg border px-2.5 py-1 font-display text-lg font-semibold ${color.chip}`}>{className(lesson.classId)}</span>
                      {lesson.room && <span className="flex items-center gap-1 text-xs text-ink-soft"><MapPin className="h-3 w-3" aria-hidden />{lesson.room}</span>}
                      {lesson.isExtra && (
                        <span className="ms-auto flex items-center gap-1 sm:ms-0">
                          <span className="rounded bg-marker-100 px-1.5 text-xs font-semibold text-marker-700">שינוי במערכת</span>
                          <button onClick={() => removeExtraLesson(lesson.period)} className="rounded p-0.5 text-marker-700 hover:bg-marker-100" aria-label={`ביטול השינוי בשיעור ${lesson.period}`} title="ביטול השינוי">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="sr-only" htmlFor={`topic-${lesson.period}`}>נושא השיעור</label>
                      <input
                        id={`topic-${lesson.period}`}
                        placeholder="מה לומדים בשיעור?"
                        value={ev?.topic ?? ''}
                        onChange={e => updateEvent(currentKey, lesson.period, { topic: e.target.value })}
                        className={`${inputClass} font-semibold`}
                      />
                      <label className="sr-only" htmlFor={`notes-${lesson.period}`}>הערות</label>
                      <textarea
                        id={`notes-${lesson.period}`}
                        placeholder="הערות: ציוד, מי חסר, מה להמשיך בפעם הבאה"
                        value={ev?.notes ?? ''}
                        onChange={e => updateEvent(currentKey, lesson.period, { notes: e.target.value })}
                        rows={2}
                        className={`${inputClass} resize-y text-sm`}
                      />
                    </div>
                  </article>
                );
              })}

              <div className="sticky bottom-20 z-10 mt-6 flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur sm:p-3 md:bottom-4 print:hidden">
                <button onClick={() => { setExtraPeriod(1); setIsExtraModalOpen(true); }} className={`${secondaryButton} px-3 sm:px-5`}>
                  <Plus className="h-5 w-5" aria-hidden /> שיעור חד-פעמי
                </button>
                <div className="flex items-center gap-3">
                  {isDirty && !isSaving && <span className="hidden text-sm font-medium text-marker-700 sm:inline">יש שינויים שלא נשמרו</span>}
                  <button onClick={save} disabled={isSaving || !isDirty} className={`${primaryButton} ${saveSuccess ? 'bg-success! opacity-100!' : ''}`}>
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : saveSuccess ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {saveSuccess ? 'נשמר' : 'שמירה'}
                    {isDirty && !isSaving && <span className="h-2 w-2 rounded-full bg-marker-400 sm:hidden" aria-label="יש שינויים שלא נשמרו" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* תצוגה שבועית */}
          {view === 'weekly' && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[56rem] border-separate border-spacing-1 table-fixed">
                  <thead>
                    <tr>
                      <th className="w-10" />
                      {SCHOOL_DAYS.map(day => {
                        const date = addDays(rangeStart, day - 1);
                        const isToday = toDateKey(date) === todayKey;
                        return (
                          <th key={day} className="pb-2 text-center font-normal">
                            <button onClick={() => goTo(date, 'daily')} className={`rounded-lg px-3 py-1 hover:bg-line-soft ${isToday ? 'bg-brand-50 text-brand-800' : ''}`}>
                              <span className="block font-display font-semibold">{DAY_NAMES[day - 1]}</span>
                              <span className="text-xs text-ink-soft">{date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}{isDayOff(date, daysOff) && ' (חופשי)'}</span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {weekPeriods.map(period => (
                      <tr key={period}>
                        <td className="text-center font-display text-sm font-semibold text-ink-faint">{period}</td>
                        {SCHOOL_DAYS.map(day => {
                          const date = addDays(rangeStart, day - 1);
                          const off = isDayOff(date, daysOff);
                          const lesson = lessonsFor(date).find(l => l.period === period);
                          const topic = events[toDateKey(date)]?.[period]?.topic;
                          return (
                            <td key={day} className={`h-16 rounded-lg align-top ${off ? 'bg-marker-50' : 'bg-paper/60'}`}>
                              {lesson && (
                                <button onClick={() => goTo(date, 'daily')} className={`h-full w-full rounded-lg border p-1.5 text-right ${lesson.isExtra ? 'border-marker-400/60 bg-marker-50' : 'border-line bg-surface hover:border-brand-200'}`}>
                                  <span className={`inline-block rounded border px-1.5 text-xs font-bold ${classColor(classes, lesson.classId).chip}`}>{className(lesson.classId)}</span>
                                  <span className={`mt-1 block truncate text-xs ${topic ? 'text-ink' : 'text-ink-faint'}`}>{topic || 'לא תוכנן'}</span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 md:hidden">
                {SCHOOL_DAYS.map(day => {
                  const date = addDays(rangeStart, day - 1);
                  const lessons = lessonsFor(date);
                  return (
                    <div key={day} className="rounded-xl border border-line p-3">
                      <button onClick={() => goTo(date, 'daily')} className="mb-2 flex w-full items-baseline justify-between">
                        <span className="font-display font-semibold">יום {DAY_NAMES[day - 1]}</span>
                        <span className="text-sm text-ink-soft">{date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>
                      </button>
                      {lessons.length === 0 ? (
                        <p className="py-2 text-sm text-ink-faint">{isDayOff(date, daysOff) ? 'יום חופשי' : 'אין שיעורים'}</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {lessons.map(l => {
                            const topic = events[toDateKey(date)]?.[l.period]?.topic;
                            return (
                              <li key={l.period} className="flex items-center gap-2 text-sm">
                                <span className="w-4 text-center font-semibold text-ink-faint">{l.period}</span>
                                <span className={`rounded border px-1.5 text-xs font-bold ${classColor(classes, l.classId).chip}`}>{className(l.classId)}</span>
                                <span className={`truncate ${topic ? 'text-ink' : 'text-ink-faint'}`}>{topic || 'לא תוכנן'}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* תצוגה חודשית */}
          {view === 'monthly' && (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {DAY_NAMES.map(d => <div key={d} className="py-1 text-center text-xs font-semibold text-ink-soft sm:text-sm">{d}</div>)}
              {Array.from({ length: rangeStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: rangeEnd.getDate() }).map((_, i) => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                const key = toDateKey(date);
                const total = lessonsFor(date).length;
                const planned = Object.values(events[key] ?? {}).filter(e => e.topic?.trim()).length;
                const isToday = key === todayKey;
                const off = isDayOff(date, daysOff);
                return (
                  <button
                    key={key}
                    onClick={() => goTo(date, 'daily')}
                    className={`flex h-16 flex-col rounded-lg border p-1.5 text-right transition-colors sm:h-24 sm:p-2 ${isToday ? 'border-brand-500 bg-brand-50' : off ? 'border-transparent bg-line-soft/70' : 'border-line bg-surface hover:border-brand-200'}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-brand-600 text-white' : 'text-ink'}`}>{i + 1}</span>
                    {total > 0 && (planned > 0 || key <= todayKey) && (
                      <span className={`mt-auto text-[10px] font-semibold sm:text-xs ${planned === total ? 'text-brand-700' : 'text-ink-soft'}`}>
                        <span className="hidden sm:inline">{planned}/{total} מתוכננים</span>
                        <span className="sm:hidden">{planned}/{total}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {isExtraModalOpen && (
        <Modal title="שיעור חד-פעמי" subtitle="החלפה, מילוי מקום או שיעור נוסף ביום הזה בלבד" onClose={() => setIsExtraModalOpen(false)}>
          <div>
            <label htmlFor="extra-period" className={labelClass}>באיזה שיעור?</label>
            <select id="extra-period" value={extraPeriod} onChange={e => setExtraPeriod(Number(e.target.value))} className={inputClass}>
              {PERIODS.map(p => {
                const existing = dailyLessons.find(l => l.period === p);
                return <option key={p} value={p}>שיעור {p}{existing ? ` (במקום ${className(existing.classId)})` : ''}</option>;
              })}
            </select>
          </div>
          <div>
            <label htmlFor="extra-class" className={labelClass}>איזו כיתה?</label>
            <select id="extra-class" value={extraClassId} onChange={e => setExtraClassId(e.target.value)} className={inputClass}>
              <option value="">בחירת כיתה</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
            {classes.length === 0 && <p className="mt-1.5 text-sm text-ink-soft">עוד אין כיתות. מוסיפים אותן בלשונית ההגדרות.</p>}
          </div>
          <button onClick={handleAddDynamicClass} disabled={!extraClassId} className={`${primaryButton} w-full`}>
            הוספה ליומן
          </button>
        </Modal>
      )}
    </Panel>
  );
}
