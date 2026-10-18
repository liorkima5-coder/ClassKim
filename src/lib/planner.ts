// טיפוסים ועזרים משותפים לכל רכיבי הפלאנר

export interface ClassItem {
  id: string;
  class_name: string;
}

export interface BaseScheduleItem {
  id: string;
  day_of_week: number; // 1 = ראשון ... 7 = שבת
  period: number;
  class_id: string;
  room: string | null;
}

export interface PlannerEvent {
  id?: string;
  date: string; // YYYY-MM-DD
  period: number;
  topic: string;
  notes: string;
  class_id: string | null;
}

export interface TeacherProfile {
  id: string;
  full_name: string;
  main_subject: string | null;
  days_off: number[] | null;
}

export const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** ימי הלימודים שאפשר לשבץ בהם שיעורים (ראשון עד שישי) */
export const SCHOOL_DAYS = [1, 2, 3, 4, 5, 6];

/** תאריך מקומי בפורמט של מסד הנתונים, בלי הזזות של אזור זמן */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** היום בשבוע בפורמט של מסד הנתונים: 1 = ראשון ... 7 = שבת */
export function dayOfWeek(date: Date): number {
  return date.getDay() + 1;
}

export function startOfWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isDayOff(date: Date, daysOff: number[] | null | undefined): boolean {
  return dayOfWeek(date) === 7 || !!daysOff?.includes(dayOfWeek(date));
}

/*
  כל כיתה מקבלת צבע קבוע לפי הסדר שבו נוספה, כמו מדבקות צבעוניות ביומן נייר.
  כך קל לזהות כיתה במבט אחד בכל המסכים.
*/
const CLASS_COLORS = [
  { chip: 'bg-sky-100 text-sky-900 border-sky-200', dot: 'bg-sky-400' },
  { chip: 'bg-rose-100 text-rose-900 border-rose-200', dot: 'bg-rose-400' },
  { chip: 'bg-lime-100 text-lime-900 border-lime-200', dot: 'bg-lime-500' },
  { chip: 'bg-violet-100 text-violet-900 border-violet-200', dot: 'bg-violet-400' },
  { chip: 'bg-orange-100 text-orange-900 border-orange-200', dot: 'bg-orange-400' },
  { chip: 'bg-teal-100 text-teal-900 border-teal-200', dot: 'bg-teal-500' },
  { chip: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200', dot: 'bg-fuchsia-400' },
  { chip: 'bg-indigo-100 text-indigo-900 border-indigo-200', dot: 'bg-indigo-400' },
];

export type ClassColor = (typeof CLASS_COLORS)[number];

export function classColor(classes: ClassItem[], classId: string | null | undefined): ClassColor {
  const idx = classes.findIndex(c => c.id === classId);
  return CLASS_COLORS[(idx < 0 ? 0 : idx) % CLASS_COLORS.length];
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}
