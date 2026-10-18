-- ClassKim: תיקונים מומלצים למסד הנתונים (לא חובה, הקוד עובד גם בלעדיהם)
-- להריץ ב-Supabase: SQL Editor → New query. מומלץ לגבות לפני.
-- כל סעיף עומד בפני עצמו, ואפשר להריץ רק חלק.

-- 1. planner_events.class_id: בלי ערך אקראי כברירת מחדל, ועם קישור לכיתה.
--    כשכיתה נמחקת, השיעורים שלה נשארים ביומן בלי כיתה.
alter table public.planner_events alter column class_id drop default;

update public.planner_events pe
set class_id = null
where class_id is not null
  and not exists (select 1 from public.my_classes c where c.id = pe.class_id);

alter table public.planner_events
  add constraint planner_events_class_id_fkey
  foreign key (class_id) references public.my_classes(id) on delete set null;

-- 2. שיעור אחד לכל תאריך ושעה (מונע כפילויות ביומן).
--    אם יש כבר כפילויות, השורה הזו תיכשל. אפשר לאתר אותן כך:
--    select teacher_id, date, period, count(*) from public.planner_events group by 1,2,3 having count(*) > 1;
alter table public.planner_events
  add constraint planner_events_teacher_date_period_key unique (teacher_id, date, period);

-- 3. שיבוץ אחד לכל יום ושעה במערכת הקבועה.
alter table public.base_schedule
  add constraint base_schedule_teacher_day_period_key unique (teacher_id, day_of_week, period);

-- 4. מחיקת כיתה מוחקת אוטומטית גם את השיבוצים שלה במערכת הקבועה.
alter table public.base_schedule drop constraint base_schedule_class_id_fkey;
alter table public.base_schedule
  add constraint base_schedule_class_id_fkey
  foreign key (class_id) references public.my_classes(id) on delete cascade;

-- 5. הרשאות (RLS): כל מורה רואה ועורכת רק את הנתונים שלה.
--    אם כבר הגדרת policies, בדקי ב-Authentication → Policies לפני שמריצים.
alter table public.teachers enable row level security;
alter table public.my_classes enable row level security;
alter table public.base_schedule enable row level security;
alter table public.planner_events enable row level security;
alter table public.tasks enable row level security;

create policy "own profile" on public.teachers
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own classes" on public.my_classes
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create policy "own schedule" on public.base_schedule
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create policy "own planner events" on public.planner_events
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
