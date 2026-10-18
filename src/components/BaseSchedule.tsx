"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DAY_NAMES, DAY_SHORT, PERIODS, SCHOOL_DAYS, classColor, type BaseScheduleItem, type ClassItem } from '../lib/planner';
import { Panel, PanelHeader, Spinner, ErrorNote, Modal, inputClass, labelClass, primaryButton, secondaryButton } from './ui';
import { Loader2, MapPin, LayoutGrid, Plus } from 'lucide-react';

export default function BaseSchedule({ teacherId, daysOff, classesVersion = 0 }: {
  teacherId: string;
  daysOff: number[];
  classesVersion?: number;
}) {
  const [schedule, setSchedule] = useState<BaseScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState<number>(() => {
    const today = new Date().getDay() + 1;
    return SCHOOL_DAYS.includes(today) ? today : 1;
  });

  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [roomInput, setRoomInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [classesRes, scheduleRes] = await Promise.all([
      supabase.from('my_classes').select('id, class_name').eq('teacher_id', teacherId).order('created_at', { ascending: true }),
      supabase.from('base_schedule').select('id, day_of_week, period, class_id, room').eq('teacher_id', teacherId),
    ]);
    if (classesRes.error || scheduleRes.error) setError('המערכת לא נטענה. רענני את הדף כדי לנסות שוב.');
    setClasses((classesRes.data ?? []) as ClassItem[]);
    setSchedule((scheduleRes.data ?? []) as BaseScheduleItem[]);
    setLoading(false);
  }, [teacherId]);

  // נטען מחדש גם כשמוסיפים או מוחקים כיתה ברכיב הכיתות
  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, [fetchData, classesVersion]);

  const cellAt = (day: number, period: number) => schedule.find(s => s.day_of_week === day && s.period === period);
  const className = (id: string) => classes.find(c => c.id === id)?.class_name ?? 'כיתה';

  const openEditModal = (day: number, period: number) => {
    const existing = cellAt(day, period);
    setSelectedClassId(existing?.class_id || '');
    setRoomInput(existing?.room || '');
    setEditingCell({ day, period });
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    setIsSaving(true);
    setError('');
    const { day, period } = editingCell;
    const existing = cellAt(day, period);
    const room = roomInput.trim() || null;

    const { error: saveError } = !selectedClassId
      ? existing ? await supabase.from('base_schedule').delete().eq('id', existing.id) : { error: null }
      : existing
        ? await supabase.from('base_schedule').update({ class_id: selectedClassId, room }).eq('id', existing.id)
        : await supabase.from('base_schedule').insert([{ teacher_id: teacherId, day_of_week: day, period, class_id: selectedClassId, room }]);

    setIsSaving(false);
    if (saveError) {
      setError('השינוי במערכת לא נשמר. נסי שוב.');
      return;
    }
    await fetchData();
    setEditingCell(null);
  };

  const renderCell = (day: number, period: number, compact = false) => {
    const cell = cellAt(day, period);
    const off = daysOff.includes(day);
    if (!cell) {
      return (
        <button
          onClick={() => openEditModal(day, period)}
          className={`flex h-full w-full items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-ink-faint transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 ${off ? 'border-transparent' : 'border-line'} ${compact ? 'min-h-12' : 'min-h-14 justify-start px-4'}`}
          aria-label={`שיבוץ ביום ${DAY_NAMES[day - 1]}, שיעור ${period}`}
        >
          <Plus className="h-4 w-4" aria-hidden />{!compact && 'שיבוץ שיעור'}
        </button>
      );
    }
    return (
      <button
        onClick={() => openEditModal(day, period)}
        className={`flex h-full w-full flex-col items-start justify-center rounded-lg border text-right transition-shadow hover:shadow-sm ${classColor(classes, cell.class_id).chip} ${compact ? 'min-h-12 px-2 py-1' : 'min-h-14 px-4 py-2'}`}
        aria-label={`יום ${DAY_NAMES[day - 1]}, שיעור ${period}: ${className(cell.class_id)}. לעריכה`}
      >
        <span className="font-display font-semibold">{className(cell.class_id)}</span>
        {cell.room && <span className="flex items-center gap-1 text-xs opacity-80"><MapPin className="h-3 w-3" aria-hidden />{cell.room}</span>}
      </button>
    );
  };

  return (
    <Panel>
      <PanelHeader icon={LayoutGrid} title="מערכת שעות קבועה" description="מה מלמדים בכל יום ובכל שעה. היומן נבנה מהמערכת הזו באופן אוטומטי." />

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {loading ? <Spinner /> : classes.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line p-6 text-center text-ink-soft">קודם מוסיפים כיתות למעלה, ואז משבצים אותן כאן.</p>
      ) : (
        <>
          {/* מסך רחב: כל השבוע בטבלה אחת */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[52rem] table-fixed border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-10" />
                  {SCHOOL_DAYS.map(day => (
                    <th key={day} className="pb-1 font-display font-semibold">
                      {DAY_NAMES[day - 1]}
                      {daysOff.includes(day) && <span className="ms-1.5 rounded bg-marker-100 px-1.5 text-xs font-semibold text-marker-700">חופשי</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td className="text-center font-display text-sm font-semibold text-ink-faint">{period}</td>
                    {SCHOOL_DAYS.map(day => (
                      <td key={day} className={`rounded-lg ${daysOff.includes(day) ? 'bg-marker-50' : ''}`}>
                        {renderCell(day, period, true)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* מסך צר: יום אחד בכל פעם */}
          <div className="lg:hidden">
            <div className="mb-4 grid grid-cols-6 gap-1 rounded-xl bg-line-soft p-1" role="tablist" aria-label="בחירת יום">
              {SCHOOL_DAYS.map(day => (
                <button
                  key={day}
                  role="tab"
                  aria-selected={activeDay === day}
                  aria-label={`יום ${DAY_NAMES[day - 1]}`}
                  onClick={() => setActiveDay(day)}
                  className={`rounded-lg py-2 font-display font-semibold transition-colors ${activeDay === day ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-soft'}`}
                >
                  {DAY_SHORT[day - 1]}
                </button>
              ))}
            </div>
            {daysOff.includes(activeDay) && (
              <p className="mb-3 rounded-xl bg-marker-50 px-4 py-2 text-sm font-semibold text-marker-700">יום {DAY_NAMES[activeDay - 1]} מוגדר כיום חופשי, ולכן לא יופיע ביומן.</p>
            )}
            <ol className="space-y-2">
              {PERIODS.map(period => (
                <li key={period} className="flex items-stretch gap-3">
                  <span className="flex w-8 shrink-0 items-center justify-center font-display font-semibold text-ink-faint">{period}</span>
                  <div className="flex-1">{renderCell(activeDay, period)}</div>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {editingCell && (
        <Modal
          title={`יום ${DAY_NAMES[editingCell.day - 1]}, שיעור ${editingCell.period}`}
          subtitle="השינוי חל על כל השבועות מעכשיו"
          onClose={() => setEditingCell(null)}
        >
          <div>
            <label htmlFor="slot-class" className={labelClass}>כיתה</label>
            <select id="slot-class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={inputClass}>
              <option value="">חלון (בלי שיעור)</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="slot-room" className={labelClass}>חדר <span className="font-normal text-ink-faint">(לא חובה)</span></label>
            <input id="slot-room" value={roomInput} onChange={e => setRoomInput(e.target.value)} placeholder="למשל: חדר אמנות, מעבדה 2" className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveCell} disabled={isSaving} className={`${primaryButton} flex-1`}>
              {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
              שמירה
            </button>
            <button onClick={() => setEditingCell(null)} className={secondaryButton}>ביטול</button>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
