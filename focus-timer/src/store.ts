import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PRESETS } from './types'
import type { Game, Mode, Preset, Project, Session, Settings, Task, Toast, View } from './types'
import { sfx as playSfx, type SfxName } from './audio'
import { BADGES, computeStats, dayKey, freezeGaps } from './game'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const QUOTES: [string, string][] = [
  ['ابدأ من حيث أنت، استخدم ما لديك، افعل ما تستطيع.', 'Start where you are. Use what you have. Do what you can.'],
  ['الانضباط هو الجسر بين الأهداف والإنجاز.', 'Discipline is the bridge between goals and accomplishment.'],
  ['خطوة صغيرة كل يوم أفضل من قفزة كبيرة مرة واحدة.', 'A small step every day beats a giant leap once.'],
  ['ركّز على العملية، والنتيجة ستأتي.', 'Focus on the process, the results will follow.'],
  ['لا تعدّ الأيام، اجعل الأيام تُعدّ.', "Don't count the days, make the days count."],
  ['التعب مؤقت، لكن الفخر دائم.', 'The pain is temporary, the pride is permanent.'],
  ['بومودورو واحد الآن أفضل من خطة مثالية غداً.', 'One pomodoro now beats a perfect plan tomorrow.'],
  ['النجاح هو مجموع مجهودات صغيرة تتكرر يوماً بعد يوم.', 'Success is the sum of small efforts repeated day in and day out.'],
]

export const DEFAULT_SETTINGS: Settings = {
  lang: 'ar',
  theme: 'dark',
  customThemes: [],
  weekStart: 6,
  presetId: '25-5',
  autoSwitch: true,
  autoSavePresets: true,
  dailyGoal: 4,
  weeklyGoal: 20,
  notifSound: true,
  notifVisual: true,
  notifOS: true,
  ambientOn: true,
  sfxOn: true,
  ambientVol: 0.7,
  sfxVol: 0.7,
  ambientOnlyRunning: true,
  ambient: {},
  waterOn: true,
  waterEvery: 45,
  breakTips: true,
  quotesOn: true,
  quoteEvery: 60,
  reminders: [],
  font: 'Segoe UI',
  timerScale: 1,
  sidebarSide: 'right',
  timerLayout: 'center',
  bgImage: null,
  bgDim: 0.35,
  bgBlur: 0,
  reduceMotion: false,
  alwaysOnTop: false,
}

const DEFAULT_GAME: Game = { badges: {}, frozen: [], freezeMonth: '', freezeUsed: 0 }

interface State {
  settings: Settings
  presets: Preset[]
  tasks: Task[]
  projects: Project[]
  sessions: Session[]
  game: Game
  // runtime (not persisted)
  view: View
  mode: Mode
  remaining: number
  total: number
  running: boolean
  endsAt: number
  started: boolean
  cycle: number
  pauses: number
  taskId: string | null
  compact: boolean
  toasts: Toast[]

  setSettings: (p: Partial<Settings>) => void
  setView: (v: View) => void
  setCompact: (v: boolean) => void
  toast: (text: string, kind?: Toast['kind']) => void
  // timer
  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (m: Mode) => void
  setPreset: (id: string) => void
  savePreset: (p: Preset) => void
  addPreset: (p: Preset) => void
  removePreset: (id: string) => void
  selectTask: (id: string | null) => void
  tick: () => void
  checkDeadlines: () => void
  // tasks
  addTask: (t: Pick<Task, 'title' | 'category' | 'period' | 'difficulty' | 'priority' | 'estPomos' | 'deadline' | 'projectId'>) => void
  updateTask: (id: string, p: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  moveTask: (from: string, before: string) => void
  addProject: (p: Omit<Project, 'id'>) => void
  removeProject: (id: string) => void
  // game
  init: () => void
  // data
  importData: (json: string) => boolean
  resetData: () => void
}

let waterAcc = 0

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const L = (ar: string, en: string) => (get().settings.lang === 'ar' ? ar : en)
      const preset = () => {
        const s = get()
        return s.presets.find((p) => p.id === s.settings.presetId) ?? s.presets[0]
      }
      const dur = (p: Preset, m: Mode) => (m === 'focus' ? p.work : m === 'short' ? p.short : p.long) * 60
      const toast = (text: string, kind: Toast['kind'] = 'info') => {
        const id = uid()
        set((s) => ({ toasts: [...s.toasts, { id, text, kind }].slice(-4) }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5500)
      }
      /** UI sound effects obey the SFX switch */
      const sfx = (n: SfxName) => get().settings.sfxOn && playSfx(n)
      /** smart notification: sound + visual + OS */
      const alert = (title: string, body: string, sound: SfxName) => {
        const s = get().settings
        if (s.notifVisual) {
          toast(`${title} — ${body}`, 'success')
          window.api?.flash()
        }
        if (s.notifSound) playSfx(sound)
        if (s.notifOS && 'Notification' in window) {
          try {
            if (Notification.permission === 'default') void Notification.requestPermission()
            if (Notification.permission === 'granted') new Notification(title, { body, silent: true })
          } catch { /* ignore */ }
        }
      }
      const begin = (mode: Mode, run: boolean) => {
        const d = dur(preset(), mode)
        set({ mode, total: d, remaining: d, running: run, endsAt: run ? Date.now() + d * 1000 : 0, started: run && mode === 'focus', pauses: 0 })
      }
      const liveRemaining = () => {
        const s = get()
        return s.running ? Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000)) : s.remaining
      }
      const record = (completed: boolean, sec: number) => {
        const s = get()
        const task = s.tasks.find((t) => t.id === s.taskId)
        const sess: Session = { id: uid(), ts: Date.now(), sec, category: task?.category ?? 'work', taskId: s.taskId, completed, pauses: s.pauses }
        set({
          sessions: [...s.sessions, sess],
          tasks: s.tasks.map((t) => (t.id === s.taskId ? { ...t, spentSec: t.spentSec + sec, donePomos: t.donePomos + (completed ? 1 : 0) } : t)),
        })
      }
      const abandon = () => {
        const s = get()
        if (s.mode === 'focus' && s.started) {
          const el = s.total - liveRemaining()
          if (el >= 30) record(false, el)
        }
      }
      const stats = () => {
        const s = get()
        return computeStats(s.sessions, s.tasks, s.projects, s.game, s.settings)
      }
      const checkBadges = () => {
        const s = get()
        const st = stats()
        const earned = { ...s.game.badges }
        const fresh: typeof BADGES = []
        for (const b of BADGES) {
          if (!earned[b.id] && (st[b.k] as number) >= b.v) {
            earned[b.id] = Date.now()
            fresh.push(b)
          }
        }
        const changed = fresh.length > 0
        if (fresh.length > 2) toast(`${L(`حصلت على ${fresh.length} شارات جديدة!`, `You earned ${fresh.length} new badges!`)}`, 'badge')
        else fresh.forEach((b) => toast(`${L(b.ar, b.en)} — ${L(b.dAr, b.dEn)}`, 'badge'))
        if (changed) sfx('badge')
        if (changed) set({ game: { ...s.game, badges: earned } })
      }
      const complete = () => {
        const s = get()
        const p = preset()
        const wasFocus = s.mode === 'focus'
        let cycle = s.cycle
        if (wasFocus) {
          const lvBefore = stats().level
          record(true, s.total)
          cycle++
          const lvAfter = stats().level
          if (lvAfter > lvBefore) toast(`${L('مستوى جديد', 'Level up')}: ${lvAfter}`, 'badge')
          const t = get().tasks.find((x) => x.id === s.taskId)
          if (t && !t.done && t.donePomos >= t.estPomos)
            toast(L(`وصلت للتقدير (${t.estPomos} بومودورو) في "${t.title}" — هل أنجزتها؟`, `Estimate reached (${t.estPomos}) on "${t.title}" — is it done?`))
        }
        const next: Mode = wasFocus ? (cycle % p.every === 0 ? 'long' : 'short') : 'focus'
        alert(
          wasFocus ? L('انتهت جلسة التركيز', 'Focus session complete') : L('انتهت الاستراحة', 'Break is over'),
          wasFocus ? L(next === 'long' ? 'خد استراحة طويلة' : 'خد استراحة قصيرة', next === 'long' ? 'Take a long break' : 'Take a short break') : L('جاهز للجلسة الجاية؟', 'Ready for the next session?'),
          wasFocus ? 'focusEnd' : 'breakEnd',
        )
        const canRun = s.settings.autoSwitch && (next !== 'focus' || !!get().taskId)
        set({ cycle })
        begin(next, canRun)
        checkBadges()
      }

      return {
        settings: DEFAULT_SETTINGS,
        presets: DEFAULT_PRESETS,
        tasks: [],
        projects: [],
        sessions: [],
        game: DEFAULT_GAME,
        view: 'timer',
        mode: 'focus',
        remaining: 25 * 60,
        total: 25 * 60,
        running: false,
        endsAt: 0,
        started: false,
        cycle: 0,
        pauses: 0,
        taskId: null,
        compact: false,
        toasts: [],

        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        setView: (view) => set({ view }),
        setCompact: (compact) => {
          set({ compact })
          window.api?.compact(compact, get().settings.alwaysOnTop)
        },
        toast,

        start: () => {
          const s = get()
          if (s.running) return
          if (s.mode === 'focus' && !s.taskId) {
            toast(L('اختار مهمة الأول قبل ما تبدأ التايمر', 'Pick a task before starting the timer'))
            return
          }
          set({ running: true, endsAt: Date.now() + s.remaining * 1000, started: s.started || s.mode === 'focus' })
          sfx('start')
        },
        pause: () => {
          const s = get()
          if (!s.running) return
          set({ running: false, remaining: Math.max(1, liveRemaining()), pauses: s.mode === 'focus' ? s.pauses + 1 : s.pauses })
          sfx('pause')
        },
        toggle: () => (get().running ? get().pause() : get().start()),
        reset: () => {
          abandon()
          begin(get().mode, false)
          sfx('reset')
        },
        skip: () => {
          const s = get()
          abandon()
          begin(s.mode === 'focus' ? 'short' : 'focus', false)
          sfx('click')
        },
        setMode: (m) => {
          if (get().running) return
          abandon()
          begin(m, false)
        },
        setPreset: (id) => {
          if (get().running) return
          abandon()
          set((s) => ({ settings: { ...s.settings, presetId: id }, cycle: 0 }))
          begin(get().mode, false)
        },
        savePreset: (p) => {
          set((s) => ({ presets: s.presets.map((x) => (x.id === p.id ? p : x)) }))
          const s = get()
          if (p.id === s.settings.presetId && !s.running && !s.started) begin(s.mode, false)
        },
        addPreset: (p) => set((s) => ({ presets: [...s.presets, p] })),
        removePreset: (id) =>
          set((s) => ({
            presets: s.presets.filter((p) => p.id !== id),
            settings: s.settings.presetId === id ? { ...s.settings, presetId: '25-5' } : s.settings,
          })),
        selectTask: (id) => set({ taskId: id }),

        tick: () => {
          const s = get()
          if (!s.running) return
          const rem = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000))
          if (rem !== s.remaining) set({ remaining: rem })
          if (rem <= 0) return complete()
          waterAcc += 0.25
          if (s.settings.waterOn && waterAcc >= s.settings.waterEvery * 60) {
            waterAcc = 0
            alert(L('وقت المياه', 'Water time'), L('اشرب كوباية مياه', 'Drink a glass of water'), 'water')
          }
        },

        addTask: (t) =>
          set((s) => ({ tasks: [...s.tasks, { ...t, id: uid(), donePomos: 0, spentSec: 0, done: false, doneAt: null, createdAt: Date.now() }] })),
        updateTask: (id, p) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p, ...('deadline' in p ? { warned: undefined } : {}) } : t)) })),
        removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), taskId: s.taskId === id ? null : s.taskId })),
        toggleTask: (id) => {
          const t = get().tasks.find((x) => x.id === id)
          if (!t) return
          const done = !t.done
          set((s) => ({
            tasks: s.tasks.map((x) => (x.id === id ? { ...x, done, doneAt: done ? Date.now() : null } : x)),
            taskId: done && s.taskId === id ? null : s.taskId,
          }))
          if (done) {
            toast(L('مهمة منجزة +25 XP', 'Task done +25 XP'), 'success')
            checkBadges()
          }
        },
        moveTask: (from, before) =>
          set((s) => {
            if (from === before) return s
            const arr = [...s.tasks]
            const i = arr.findIndex((t) => t.id === from)
            if (i < 0) return s
            const [item] = arr.splice(i, 1)
            const j = arr.findIndex((t) => t.id === before)
            arr.splice(j < 0 ? arr.length : j, 0, item)
            return { tasks: arr }
          }),
        addProject: (p) => set((s) => ({ projects: [...s.projects, { ...p, id: uid() }] })),
        removeProject: (id) =>
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
          })),

        // Deadline handling: each task is announced once when due today and once when overdue.
        // Overdue tasks stay in the list (marked in red) until they are finished or deleted.
        checkDeadlines: () => {
          const today = dayKey(Date.now())
          const due: string[] = []
          const late: string[] = []
          const tasks = get().tasks.map((t) => {
            if (t.done || !t.deadline) return t
            if (t.deadline < today && t.warned !== 'late') { late.push(t.title); return { ...t, warned: 'late' as const } }
            if (t.deadline === today && !t.warned) { due.push(t.title); return { ...t, warned: 'today' as const } }
            return t
          })
          if (!due.length && !late.length) return
          set({ tasks })
          if (late.length) alert(L('فات ميعاد مهمة', 'Task deadline passed'), late.join(', '), 'breakEnd')
          if (due.length) alert(L('ميعاد مهمة النهاردة', 'Task due today'), due.join(', '), 'breakEnd')
        },

        init: () => {
          const s = get()
          const r = freezeGaps(s.sessions, s.game, dayKey(Date.now()))
          if (r) {
            set({ game: r.game })
            toast(L(`حماية السلسلة اتفعّلت (${r.count} يوم)`, `Streak freeze used (${r.count} day)`), 'info')
          }
          const p = preset()
          if (!get().started && !get().running) set({ total: dur(p, get().mode), remaining: dur(p, get().mode) })
          get().checkDeadlines()
          checkBadges()
        },

        importData: (json) => {
          try {
            const d = JSON.parse(json)
            if (!d || typeof d !== 'object' || !Array.isArray(d.tasks) || !Array.isArray(d.sessions)) return false
            set({
              settings: { ...DEFAULT_SETTINGS, ...d.settings },
              presets: d.presets ?? DEFAULT_PRESETS,
              tasks: d.tasks,
              projects: d.projects ?? [],
              sessions: d.sessions,
              game: { ...DEFAULT_GAME, ...d.game },
            })
            return true
          } catch {
            return false
          }
        },
        resetData: () => {
          set({ tasks: [], projects: [], sessions: [], game: DEFAULT_GAME, presets: DEFAULT_PRESETS, taskId: null, cycle: 0 })
          begin('focus', false)
        },
      }
    },
    {
      name: 'focus-timer-v1',
      version: 1,
      partialize: (s) => ({ settings: s.settings, presets: s.presets, tasks: s.tasks, projects: s.projects, sessions: s.sessions, game: s.game }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) }, game: { ...current.game, ...(p.game ?? {}) } }
      },
    },
  ),
)

export const useT = () => {
  const lang = useStore((s) => s.settings.lang)
  return (ar: string, en: string) => (lang === 'ar' ? ar : en)
}
