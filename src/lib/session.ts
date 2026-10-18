import { supabase } from './supabase';

/*
  "זכור אותי": Supabase שומר את ההתחברות בדפדפן כברירת מחדל.
  כשהמשתמשת מבקשת לא לזכור אותה, מסמנים שההתחברות תקפה רק לחלון הנוכחי,
  ובפעם הבאה שהאפליקציה נפתחת בחלון חדש מנתקים אותה.
*/
const SESSION_ONLY_KEY = 'classkim:session-only';
const ACTIVE_WINDOW_KEY = 'classkim:active-window';

export function rememberLogin(remember: boolean) {
  try {
    if (remember) {
      localStorage.removeItem(SESSION_ONLY_KEY);
    } else {
      localStorage.setItem(SESSION_ONLY_KEY, '1');
    }
    sessionStorage.setItem(ACTIVE_WINDOW_KEY, '1');
  } catch {
    // אחסון חסום (למשל גלישה פרטית) – ההתחברות פשוט תישמר כרגיל
  }
}

/** מחזיר true אם ההתחברות פגה כי המשתמשת ביקשה לא לזכור אותה */
export async function enforceRememberChoice(): Promise<boolean> {
  try {
    const sessionOnly = localStorage.getItem(SESSION_ONLY_KEY) === '1';
    const sameWindow = sessionStorage.getItem(ACTIVE_WINDOW_KEY) === '1';
    if (sessionOnly && !sameWindow) {
      localStorage.removeItem(SESSION_ONLY_KEY);
      await supabase.auth.signOut();
      return true;
    }
  } catch {
    // אין גישה לאחסון – לא עושים כלום
  }
  return false;
}
