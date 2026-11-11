export type Lang = 'ar' | 'en'
export type Category = 'work' | 'study'
export type Period = 'daily' | 'weekly' | 'monthly'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Priority = 'low' | 'medium' | 'high'
export type Mode = 'focus' | 'short' | 'long'
export type View = 'timer' | 'tasks' | 'stats' | 'streak' | 'sounds' | 'settings'

export interface Preset {
  id: string
  name: string
  work: number // minutes
  short: number
  long: number
  every: number // focus sessions before a long break
  builtin?: boolean
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: '25-5', name: '25/5', work: 25, short: 5, long: 15, every: 4, builtin: true },
  { id: '45-15', name: '45/15', work: 45, short: 15, long: 30, every: 3, builtin: true },
  { id: '50-10', name: '50/10', work: 50, short: 10, long: 30, every: 3, builtin: true },
  { id: '90-20', name: '90/20', work: 90, short: 20, long: 30, every: 2, builtin: true },
  { id: 'custom', name: 'Custom', work: 30, short: 5, long: 15, every: 4 },
]

export interface Project {
  id: string
  name: string
  color: string
  category: Category
}

export interface Task {
  id: string
  title: string
  category: Category
  period: Period
  difficulty: Difficulty
  priority: Priority
  estPomos: number
  donePomos: number
  spentSec: number
  deadline: string | null // YYYY-MM-DD
  projectId: string | null
  done: boolean
  doneAt: number | null
  warned?: 'today' | 'late' // deadline notification already shown
  createdAt: number
}

// one focus session (completed or abandoned)
export interface Session {
  id: string
  ts: number // end time (ms)
  sec: number
  category: Category
  taskId: string | null
  completed: boolean
  pauses: number
}

export interface Reminder {
  id: string
  text: string
  seconds: number // how long this reminder stays on screen
  enabled: boolean
}

export interface CustomTheme {
  id: string
  name: string
  font: string
  v: ThemeVars
}

export interface ThemeVars {
  bg: string
  surface: string
  text: string
  accent: string
  work: string
  short: string
  long: string
  dark: boolean
}

export interface Settings {
  lang: Lang
  theme: string
  customThemes: CustomTheme[]
  weekStart: number // 0=Sun .. 6=Sat
  // timer
  presetId: string
  autoSwitch: boolean
  autoSavePresets: boolean
  dailyGoal: number
  weeklyGoal: number
  // notifications
  notifSound: boolean
  notifVisual: boolean
  notifOS: boolean
  // audio
  ambientOn: boolean
  sfxOn: boolean
  ambientVol: number
  sfxVol: number
  ambientOnlyRunning: boolean
  ambient: Record<string, number> // selected ambient id -> volume
  // smart
  waterOn: boolean
  waterEvery: number // minutes
  breakTips: boolean
  quotesOn: boolean
  quoteEvery: number // seconds
  reminders: Reminder[]
  // look & layout
  font: string
  timerScale: number
  sidebarSide: 'left' | 'right'
  timerLayout: 'center' | 'side'
  bgImage: string | null
  bgDim: number
  bgBlur: number
  reduceMotion: boolean
  alwaysOnTop: boolean
}

export interface Game {
  badges: Record<string, number> // badge id -> earnedAt
  frozen: string[] // days protected by a streak freeze
  freezeMonth: string
  freezeUsed: number
}

export interface Toast {
  id: string
  text: string
  kind: 'info' | 'success' | 'badge'
}

export const DIFFICULTY_POMOS: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 }
export const FREEZES_PER_MONTH = 2
export const WEEKEND_DAYS = [5, 6] // Fri, Sat
