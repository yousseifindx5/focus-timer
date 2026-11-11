import type { Game, Project, Session, Settings, Task } from './types'
import { FREEZES_PER_MONTH, WEEKEND_DAYS } from './types'

/* ---------- date helpers (all keys are local YYYY-MM-DD) ---------- */
const p2 = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d: Date | number) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`
}
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: string, n: number) => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
export const daysBetween = (a: string, b: string) =>
  Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 864e5)
export const weekStartKey = (k: string, ws: number) => addDays(k, -((parseKey(k).getDay() - ws + 7) % 7))
export const rangeKeys = (a: string, b: string) => {
  const out: string[] = []
  for (let k = a, i = 0; k <= b && i < 800; k = addDays(k, 1), i++) out.push(k)
  return out
}

/* ---------- streaks ---------- */
export function activeMap(sessions: Session[]) {
  const m: Record<string, number> = {}
  for (const s of sessions) if (s.completed) m[dayKey(s.ts)] = (m[dayKey(s.ts)] || 0) + 1
  return m
}

export function streakAt(day: string, active: Record<string, number>, frozen: Set<string>) {
  let d = day
  if (!active[d]) d = addDays(d, -1)
  let n = 0
  for (let i = 0; i < 2000; i++) {
    if (active[d]) n++
    else if (!frozen.has(d)) break
    d = addDays(d, -1)
  }
  return n
}

export function computeStreaks(active: Record<string, number>, frozen: Set<string>, today: string, ws: number) {
  const current = streakAt(today, active, frozen)
  const keys = [...new Set([...Object.keys(active), ...frozen])].sort()
  let longest = 0
  let run = 0
  let prev = ''
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run : 0
    if (active[k]) run++
    longest = Math.max(longest, run)
    prev = k
  }
  // weekly streak: consecutive weeks with >= 3 active (or frozen) days
  const weeks: Record<string, number> = {}
  for (const k of keys) {
    const w = weekStartKey(k, ws)
    weeks[w] = (weeks[w] || 0) + 1
  }
  let w = weekStartKey(today, ws)
  if ((weeks[w] || 0) < 3) w = addDays(w, -7)
  let weekly = 0
  while ((weeks[w] || 0) >= 3) {
    weekly++
    w = addDays(w, -7)
  }
  return { current, longest, weekly }
}

export const freezesLeft = (g: Game, today: string) =>
  FREEZES_PER_MONTH - (g.freezeMonth === today.slice(0, 7) ? g.freezeUsed : 0)

/** Streak protection: bridge a gap of missed days with freezes (2 per month, renewed monthly). */
export function freezeGaps(sessions: Session[], game: Game, today: string) {
  const act = activeMap(sessions)
  const all = [...new Set([...Object.keys(act), ...game.frozen])].filter((k) => k < today).sort()
  if (!all.length) return null
  const last = all[all.length - 1]
  const gap = daysBetween(last, addDays(today, -1))
  if (gap <= 0 || gap > freezesLeft(game, today)) return null
  const month = today.slice(0, 7)
  const used = game.freezeMonth === month ? game.freezeUsed : 0
  const add = Array.from({ length: gap }, (_, i) => addDays(last, i + 1))
  return { game: { ...game, frozen: [...game.frozen, ...add], freezeMonth: month, freezeUsed: used + gap }, count: gap }
}

/* ---------- stats / xp / level ---------- */
export const XP_POMO = 10
export const XP_TASK = 25
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1
export const xpForLevel = (l: number) => (l - 1) * (l - 1) * 100

export function computeStats(sessions: Session[], tasks: Task[], projects: Project[], game: Game, s: Settings) {
  const done = sessions.filter((x) => x.completed)
  const active = activeMap(sessions)
  const frozen = new Set(game.frozen)
  const today = dayKey(Date.now())
  const st = computeStreaks(active, frozen, today, s.weekStart)
  const tasksDone = tasks.filter((t) => t.done).length
  const xp = done.length * XP_POMO + tasksDone * XP_TASK

  // perfect weeks: every day of the week reached the daily goal; value = longest consecutive run
  const weekDays: Record<string, number> = {}
  for (const [k, n] of Object.entries(active)) if (n >= s.dailyGoal) {
    const w = weekStartKey(k, s.weekStart)
    weekDays[w] = (weekDays[w] || 0) + 1
  }
  const perfect = Object.keys(weekDays).filter((w) => weekDays[w] >= 7).sort()
  let perfectWeeks = 0
  let run = 0
  perfect.forEach((w, i) => {
    run = i > 0 && addDays(perfect[i - 1], 7) === w ? run + 1 : 1
    perfectWeeks = Math.max(perfectWeeks, run)
  })

  return {
    pomos: done.length,
    hours: sessions.reduce((a, x) => a + x.sec, 0) / 3600,
    tasks: tasksDone,
    streak: st.current,
    longest: st.longest,
    weeklyStreak: st.weekly,
    perfectWeeks,
    early: done.filter((x) => new Date(x.ts - x.sec * 1000).getHours() < 8).length,
    night: done.filter((x) => new Date(x.ts).getHours() >= 22).length,
    weekend: done.filter((x) => WEEKEND_DAYS.includes(new Date(x.ts).getDay())).length,
    studyPomos: done.filter((x) => x.category === 'study').length,
    workPomos: done.filter((x) => x.category === 'work').length,
    bestDay: Math.max(0, ...Object.values(active)),
    projectsDone: projects.filter((p) => {
      const ts = tasks.filter((t) => t.projectId === p.id)
      return ts.length > 0 && ts.every((t) => t.done)
    }).length,
    xp,
    level: levelFromXp(xp),
  }
}
export type Stats = ReturnType<typeof computeStats>

/* ---------- badges ---------- */
export interface BadgeDef {
  id: string
  icon: string
  color: string
  k: keyof Stats
  v: number
  ar: string
  en: string
  dAr: string
  dEn: string
}
const B = (id: string, icon: string, color: string, k: keyof Stats, v: number, ar: string, en: string, dAr: string, dEn: string): BadgeDef => ({ id, icon, color, k, v, ar, en, dAr, dEn })

export const BADGES: BadgeDef[] = [
  // original badges
  B('first-session', '✨', '#fbbf24', 'pomos', 1, 'البداية', 'First Steps', 'أكمل أول بومودورو', 'Complete your first pomodoro'),
  B('streak-3', '🔥', '#f97316', 'longest', 3, 'ثلاثة أيام', '3-Day Streak', '3 أيام متتالية', '3 days in a row'),
  B('streak-7', '🏆', '#eab308', 'longest', 7, 'أسبوع كامل', 'Week Warrior', '7 أيام متتالية', '7 days in a row'),
  B('streak-30', '👑', '#fbbf24', 'longest', 30, 'شهر أسطوري', 'Monthly Master', '30 يوماً متتالياً', '30 days in a row'),
  B('streak-100', '🎖️', '#f59e0b', 'longest', 100, 'مائة يوم', 'Centurion', '100 يوم متتالي', '100 days in a row'),
  B('pomodoros-10', '🎯', '#3b82f6', 'pomos', 10, 'عشرة بومودورو', 'Getting Started', 'أكمل 10 بومودورو', 'Complete 10 pomodoros'),
  B('pomodoros-50', '⚡', '#8b5cf6', 'pomos', 50, 'خمسون بومودورو', 'Focused Fifty', 'أكمل 50 بومودورو', 'Complete 50 pomodoros'),
  B('pomodoros-100', '⭐', '#ec4899', 'pomos', 100, 'مائة بومودورو', 'Century Club', 'أكمل 100 بومودورو', 'Complete 100 pomodoros'),
  B('pomodoros-500', '💎', '#06b6d4', 'pomos', 500, 'خمسمائة بومودورو', 'Pomodoro Master', 'أكمل 500 بومودورو', 'Complete 500 pomodoros'),
  B('hours-10', '⏰', '#22c55e', 'hours', 10, 'عشر ساعات', '10 Hours', '10 ساعات تركيز', '10 hours of focus'),
  B('hours-50', '🕓', '#16a34a', 'hours', 50, 'خمسون ساعة', '50 Hours', '50 ساعة تركيز', '50 hours of focus'),
  B('hours-100', '🕗', '#15803d', 'hours', 100, 'مائة ساعة', '100 Hours', '100 ساعة تركيز', '100 hours of focus'),
  B('tasks-10', '✅', '#3b82f6', 'tasks', 10, 'عشر مهام', 'Task Tamer', 'أكمل 10 مهام', 'Complete 10 tasks'),
  B('tasks-50', '☑️', '#2563eb', 'tasks', 50, 'خمسون مهمة', 'Task Master', 'أكمل 50 مهمة', 'Complete 50 tasks'),
  B('perfect-week-1', '📅', '#8b5cf6', 'perfectWeeks', 1, 'أسبوع مثالي', 'Perfect Week', 'أسبوع كامل بتحقيق الهدف اليومي', 'Full week meeting the daily goal'),
  B('perfect-week-4', '🗓️', '#7c3aed', 'perfectWeeks', 4, 'شهر مثالي', 'Perfect Month', '4 أسابيع مثالية متتالية', '4 perfect weeks in a row'),
  B('early-bird-5', '🌅', '#f97316', 'early', 5, 'طائر مبكر', 'Early Bird', '5 جلسات قبل الساعة 8 صباحاً', '5 sessions before 8 AM'),
  B('night-owl-5', '🌙', '#6366f1', 'night', 5, 'بومة ليلية', 'Night Owl', '5 جلسات بعد الساعة 10 مساءً', '5 sessions after 10 PM'),
  B('weekend-warrior-3', '🛡️', '#ec4899', 'weekend', 3, 'محارب العطلة', 'Weekend Warrior', '3 جلسات في عطلة نهاية الأسبوع', '3 sessions on the weekend'),
  // new badges
  B('streak-14', '🔥', '#f97316', 'longest', 14, 'أسبوعان', 'Fortnight Fire', '14 يوماً متتالياً', '14 days in a row'),
  B('streak-365', '🌟', '#facc15', 'longest', 365, 'سنة كاملة', 'Year of Focus', '365 يوماً متتالياً', '365 days in a row'),
  B('weekly-streak-4', '🔗', '#14b8a6', 'weeklyStreak', 4, 'ثبات شهري', 'Consistent', '4 أسابيع متتالية نشطة', '4 active weeks in a row'),
  B('pomodoros-1000', '🚀', '#f43f5e', 'pomos', 1000, 'ألف بومودورو', 'Thousand Club', 'أكمل 1000 بومودورو', 'Complete 1000 pomodoros'),
  B('hours-500', '🌌', '#0ea5e9', 'hours', 500, 'خمسمائة ساعة', '500 Hours', '500 ساعة تركيز', '500 hours of focus'),
  B('tasks-100', '🏁', '#1d4ed8', 'tasks', 100, 'مئة مهمة', 'Task Legend', 'أكمل 100 مهمة', 'Complete 100 tasks'),
  B('project-1', '📦', '#a855f7', 'projectsDone', 1, 'منجز المشاريع', 'Project Closer', 'أنهِ مشروعاً كاملاً', 'Finish a whole project'),
  B('project-5', '🏗️', '#9333ea', 'projectsDone', 5, 'بنّاء المشاريع', 'Project Builder', 'أنهِ 5 مشاريع', 'Finish 5 projects'),
  B('study-50', '📚', '#0891b2', 'studyPomos', 50, 'دودة كتب', 'Bookworm', '50 بومودورو مذاكرة', '50 study pomodoros'),
  B('work-50', '💼', '#475569', 'workPomos', 50, 'محترف الشغل', 'Work Pro', '50 بومودورو شغل', '50 work pomodoros'),
  B('daily-8', '🏃', '#ef4444', 'bestDay', 8, 'ماراثون', 'Marathon Day', '8 بومودورو في يوم واحد', '8 pomodoros in a single day'),
  B('level-5', '🥉', '#b45309', 'level', 5, 'مستوى 5', 'Level 5', 'وصل للمستوى 5', 'Reach level 5'),
  B('level-10', '🥈', '#94a3b8', 'level', 10, 'مستوى 10', 'Level 10', 'وصل للمستوى 10', 'Reach level 10'),
  B('level-25', '🥇', '#eab308', 'level', 25, 'مستوى 25', 'Level 25', 'وصل للمستوى 25', 'Reach level 25'),
]
