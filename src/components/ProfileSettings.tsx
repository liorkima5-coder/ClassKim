"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DAY_NAMES, SCHOOL_DAYS, type TeacherProfile } from '../lib/planner';
import { Panel, PanelHeader, ErrorNote, inputClass, labelClass, primaryButton } from './ui';
import { CheckCircle2, Loader2, UserRound } from 'lucide-react';

export function DaysOffPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter(d => d !== day) : [...value, day].sort());

  return (
    <fieldset>
      <legend className={labelClass}>ימים שבהם את לא מלמדת</legend>
      <div className="flex flex-wrap gap-2">
        {SCHOOL_DAYS.map(day => {
          const off = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={off}
              onClick={() => toggle(day)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${off ? 'border-marker-400 bg-marker-100 text-marker-700' : 'border-line bg-surface text-ink-soft hover:border-brand-200'}`}
            >
              {DAY_NAMES[day - 1]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-sm text-ink-faint">ביום חופשי היומן לא יציג שיעורים מהמערכת הקבועה.</p>
    </fieldset>
  );
}

export default function ProfileSettings({ profile, onSaved }: { profile: TeacherProfile; onSaved: (p: TeacherProfile) => void }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [mainSubject, setMainSubject] = useState(profile.main_subject ?? '');
  const [daysOff, setDaysOff] = useState<number[]>(profile.days_off ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    const updates = { full_name: fullName.trim(), main_subject: mainSubject.trim() || null, days_off: daysOff };
    const { error: saveError } = await supabase.from('teachers').update(updates).eq('id', profile.id);
    setIsSaving(false);
    if (saveError) {
      setError('הפרטים לא נשמרו. בדקי את החיבור ונסי שוב.');
      return;
    }
    onSaved({ ...profile, ...updates });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Panel>
      <PanelHeader icon={UserRound} title="הפרטים שלי" description="השם מופיע בראש הפלאנר. ימי החופש משפיעים על היומן ועל מסך הבוקר." />
      <form onSubmit={handleSave} className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-name" className={labelClass}>שם מלא</label>
          <input id="profile-name" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="profile-subject" className={labelClass}>מקצוע עיקרי</label>
          <input id="profile-subject" value={mainSubject} onChange={e => setMainSubject(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <DaysOffPicker value={daysOff} onChange={setDaysOff} />
        </div>
        {error && <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving || !fullName.trim()} className={`${primaryButton} ${saved ? 'bg-success!' : ''}`}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <CheckCircle2 className="h-5 w-5" /> : null}
            {saved ? 'הפרטים נשמרו' : 'שמירת הפרטים'}
          </button>
        </div>
      </form>
    </Panel>
  );
}
