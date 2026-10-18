"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { classColor, type ClassItem } from '../lib/planner';
import { Panel, PanelHeader, Spinner, ErrorNote, inputClass, primaryButton, iconButton } from './ui';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';

export default function ClassesManager({ teacherId, onChange }: { teacherId: string; onChange?: () => void }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchClasses = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from('my_classes').select('id, class_name').eq('teacher_id', teacherId).order('created_at', { ascending: true });
    if (fetchError) setError('הכיתות לא נטענו. רענני את הדף כדי לנסות שוב.');
    setClasses((data ?? []) as ClassItem[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    const load = async () => { await fetchClasses(); };
    load();
  }, [fetchClasses]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    if (classes.some(c => c.class_name === name)) {
      setError(`כבר יש כיתה בשם ${name}.`);
      return;
    }
    setIsAdding(true);
    setError('');
    const { data, error: insertError } = await supabase.from('my_classes').insert([{ teacher_id: teacherId, class_name: name }]).select('id, class_name').single();
    setIsAdding(false);
    if (insertError || !data) {
      setError('הכיתה לא נוספה. נסי שוב.');
      return;
    }
    setClasses(prev => [...prev, data as ClassItem]);
    setNewClassName('');
    onChange?.();
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    if (!confirm(`למחוק את ${cls.class_name}? הכיתה תוסר גם ממערכת השעות. מה שכבר נכתב ביומן יישאר שמור.`)) return;
    setError('');
    // קודם מסירים את השיבוצים במערכת הקבועה, אחרת מסד הנתונים לא יאפשר למחוק את הכיתה
    const { error: scheduleError } = await supabase.from('base_schedule').delete().eq('class_id', cls.id).eq('teacher_id', teacherId);
    const { error: deleteError } = scheduleError ? { error: scheduleError } : await supabase.from('my_classes').delete().eq('id', cls.id);
    if (deleteError) {
      setError(`לא הצלחנו למחוק את ${cls.class_name}. נסי שוב.`);
      return;
    }
    setClasses(prev => prev.filter(c => c.id !== cls.id));
    onChange?.();
  };

  return (
    <Panel>
      <PanelHeader icon={Users} title="הכיתות שלי" description="כל הכיתות והקבוצות שאת מלמדת השנה. לכל כיתה צבע משלה, שמופיע ביומן ובמערכת." />

      <form onSubmit={handleAddClass} className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="new-class" className="sr-only">שם הכיתה</label>
        <input id="new-class" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="למשל: ה׳2, מגמת אמנות" className={inputClass} />
        <button type="submit" disabled={isAdding || !newClassName.trim()} className={`${primaryButton} shrink-0`}>
          {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" aria-hidden />}
          הוספה
        </button>
      </form>

      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

      {loading ? <Spinner className="py-8" /> : classes.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line p-6 text-center text-ink-soft">עוד אין כיתות. מתחילים בהוספת הכיתה הראשונה.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {classes.map(cls => (
            <li key={cls.id} className={`flex items-center gap-1 rounded-xl border py-1 pe-1 ps-3 ${classColor(classes, cls.id).chip}`}>
              <span className="font-display font-semibold">{cls.class_name}</span>
              <button onClick={() => handleDeleteClass(cls)} className={`${iconButton} h-8 w-8 text-current opacity-60 hover:bg-white/60 hover:text-danger hover:opacity-100`} aria-label={`מחיקת ${cls.class_name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
