import { useEffect, useMemo, useState } from 'react'
import { QUOTES, useStore, useT } from './store'
import { applyTheme } from './themes'
import { setAmbient, setSfxVolume, stopAllAmbient } from './audio'
import { computeStats, dayKey, xpForLevel } from './game'
import { fmtClock } from './stats'
import type { View } from './types'
import { Logo, Progress } from './ui'
import { TimerPage, CompactTimer } from './pages/TimerPage'
import { TasksPage } from './pages/TasksPage'
import { StatsPage } from './pages/StatsPage'
import { StreakPage } from './pages/StreakPage'
import { SoundsPage } from './pages/SoundsPage'
import { SettingsPage } from './pages/SettingsPage'

const PRI = { high: 0, medium: 1, low: 2 } as const
const PRI_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' } as const

function Motivation() {
  const settings = useStore((s) => s.settings)
  const { lang, quotesOn, quoteEvery, reminders } = settings
  const items = useMemo(() => {
    const q = quotesOn ? QUOTES.map((x) => ({ text: lang === 'ar' ? x[0] : x[1], sec: quoteEvery, mine: false })) : []
    const mine = reminders.filter((r) => r.enabled && r.text.trim()).map((r) => ({ text: r.text, sec: r.seconds, mine: true }))
    if (!q.length) return mine
    if (!mine.length) return q
    const out: typeof q = []
    q.forEach((x, i) => { out.push(x); out.push(mine[i % mine.length]) })
    return out
  }, [lang, quotesOn, quoteEvery, reminders])
  const [i, setI] = useState(() => Math.floor(Math.random() * 8))
  useEffect(() => {
    if (!items.length) return
    const cur = items[i % items.length]
    const id = setTimeout(() => setI((x) => x + 1), Math.max(3, cur.sec) * 1000)
    return () => clearTimeout(id)
  }, [i, items])
  if (!items.length) return null
  const cur = items[i % items.length]
  return (
    <div className={`motiv ${cur.mine ? 'mine' : ''}`}>
      <span key={i}>{cur.text}</span>
    </div>
  )
}

function Sidebar() {
  const t = useT()
  const s = useStore()
  const st = computeStats(s.sessions, s.tasks, s.projects, s.game, s.settings)
  const today = dayKey(Date.now())
  const todo = s.tasks.filter((x) => !x.done).sort((a, b) => PRI[a.priority] - PRI[b.priority] || (a.deadline ?? '9').localeCompare(b.deadline ?? '9')).slice(0, 6)
  const nav: [View, string, string][] = [
    ['timer', '', t('التايمر', 'Timer')],
    ['tasks', '', t('المهام والمشاريع', 'Tasks & Projects')],
    ['stats', '', t('الملخصات', 'Summaries')],
    ['streak', '', t('السلسلة والشارات', 'Streak & Badges')],
    ['sounds', '', t('الأصوات', 'Sounds')],
    ['settings', '', t('الإعدادات', 'Settings')],
  ]
  const lo = xpForLevel(st.level)
  const hi = xpForLevel(st.level + 1)
  return (
    <aside className="sidebar" dir={s.settings.lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="logo"><Logo /> Focus Timer</div>
      {nav.map(([v, ic, label]) => (
        <button key={v} className={`nav ${s.view === v ? 'on' : ''}`} onClick={() => s.setView(v)}>
          {label}
        </button>
      ))}
      <div className="side-sec">{t('قائمة المهام (حسب الأولوية)', 'To-do (by priority)')}</div>
      <div className="todo-mini">
        {todo.length === 0 && <div className="small muted" style={{ padding: 6 }}>{t('مفيش مهام — ضيف من صفحة المهام', 'No tasks — add some in Tasks')}</div>}
        {todo.map((x) => (
          <label key={x.id} title={x.title} className={x.deadline && x.deadline < today ? 'over-due' : ''}>
            <input type="checkbox" checked={x.done} onChange={() => s.toggleTask(x.id)} />
            <span>{x.title}</span>
            <i className="dot" style={{ background: PRI_COLOR[x.priority] }} />
          </label>
        ))}
      </div>
      <div className="lvl">
        <div className="row"><b>{t('المستوى', 'Level')} {st.level}</b><span className="sp" /><span className="small muted">{st.xp} XP</span></div>
        <Progress value={(st.xp - lo) / (hi - lo)} />
        <div className="row small muted" style={{ marginTop: 6 }}>{t('السلسلة', 'Streak')} {st.streak} {t('يوم', 'd')}<span className="sp" />
          <button className="btn sm" onClick={() => s.setCompact(true)} title={t('نافذة مصغرة', 'Compact window')}>{t('نافذة مصغرة', 'Compact')}</button>
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  const s = useStore()
  const { settings: st } = s
  const t = useT()

  // theme + language
  useEffect(() => { applyTheme(st) }, [st.theme, st.customThemes, st.font, st.reduceMotion])
  useEffect(() => {
    document.documentElement.lang = st.lang
    document.documentElement.dir = st.lang === 'ar' ? 'rtl' : 'ltr'
  }, [st.lang])

  // init + ticking
  useEffect(() => { useStore.getState().init() }, [])
  useEffect(() => {
    const id = setInterval(() => useStore.getState().checkDeadlines(), 60000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const id = setInterval(() => useStore.getState().tick(), 250)
    return () => clearInterval(id)
  }, [])

  // in-app keyboard shortcuts: Space = start/pause, R = reset
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable
    }
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) useStore.getState().toggle() }
      else if (e.code === 'KeyR' && !e.repeat) useStore.getState().reset()
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space' && !typing(e)) e.preventDefault() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ambient sounds engine (independent from SFX)
  const playing = st.ambientOn && (!st.ambientOnlyRunning || s.running)
  const ambKey = JSON.stringify(st.ambient)
  useEffect(() => {
    if (playing && Object.keys(st.ambient).length) setAmbient(st.ambient, st.ambientVol)
    else stopAllAmbient()
  }, [playing, ambKey, st.ambientVol])
  useEffect(() => { setSfxVolume(st.sfxVol) }, [st.sfxVol])

  useEffect(() => { window.api?.top(st.alwaysOnTop && s.compact) }, [st.alwaysOnTop])
  useEffect(() => {
    document.title = s.running ? `${fmtClock(s.remaining)} · Focus Timer` : 'Focus Timer'
  }, [s.running, s.remaining])

  const page = { timer: <TimerPage />, tasks: <TasksPage />, stats: <StatsPage />, streak: <StreakPage />, sounds: <SoundsPage />, settings: <SettingsPage /> }[s.view]
  const rtl = st.lang === 'ar'

  const bgStyle = st.bgImage ? ({ ['--bgimg' as string]: `url(${st.bgImage})`, filter: st.bgBlur ? `blur(${st.bgBlur}px)` : undefined } as React.CSSProperties) : undefined

  return (
    <div className={`app ${st.sidebarSide === 'right' ? 'right' : ''}`}>
      <div className={`bg ${st.bgImage ? 'img' : ''}`} style={bgStyle} />
      {st.bgImage && <div className="dim" style={{ opacity: st.bgDim }} />}
      {s.compact ? (
        <CompactTimer />
      ) : (
        <>
          <Sidebar />
          <div className="main" dir={rtl ? 'rtl' : 'ltr'}>
            <Motivation />
            <div className="page" key={s.view}>
              <div className="page-in">{page}</div>
            </div>
          </div>
        </>
      )}
      <div className="toasts">
        {s.toasts.map((x) => <div key={x.id} className={`toast ${x.kind}`} dir={rtl ? 'rtl' : 'ltr'}>{x.text}</div>)}
      </div>
    </div>
  )
}
