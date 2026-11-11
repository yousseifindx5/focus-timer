import type { Category, Session, Task } from './types'
import { addDays, dayKey, rangeKeys } from './game'

export type CatFilter = 'all' | Category

export interface Summary {
  days: Record<string, { sec: number; pomos: number }>
  sec: number
  pomos: number
  hourly: number[] // focus minutes per hour (0..23)
  completed: number
  abandoned: number
  pauses: number
  tasksDone: number
  distraction: number // % of started sessions that were abandoned
}

export function summarize(sessions: Session[], tasks: Task[], a: string, b: string, cat: CatFilter): Summary {
  const out: Summary = { days: {}, sec: 0, pomos: 0, hourly: Array(24).fill(0), completed: 0, abandoned: 0, pauses: 0, tasksDone: 0, distraction: 0 }
  for (const k of rangeKeys(a, b)) out.days[k] = { sec: 0, pomos: 0 }
  for (const s of sessions) {
    const k = dayKey(s.ts)
    if (k < a || k > b || (cat !== 'all' && s.category !== cat)) continue
    const d = out.days[k]
    d.sec += s.sec
    out.sec += s.sec
    out.pauses += s.pauses
    out.hourly[new Date(s.ts - s.sec * 500).getHours()] += s.sec / 60
    if (s.completed) {
      d.pomos++
      out.pomos++
      out.completed++
    } else out.abandoned++
  }
  out.tasksDone = tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) >= a && dayKey(t.doneAt) <= b && (cat === 'all' || t.category === cat)).length
  const started = out.completed + out.abandoned
  out.distraction = started ? Math.round((out.abandoned / started) * 100) : 0
  return out
}

export const fmtDur = (sec: number) => {
  const m = Math.round(sec / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
export const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

/** best focus hour based on history (start hour of completed sessions, last 60 days) */
export function bestHour(sessions: Session[]) {
  const from = dayKey(Date.now() - 60 * 864e5)
  const h = Array(24).fill(0)
  let n = 0
  for (const s of sessions) {
    if (!s.completed || dayKey(s.ts) < from) continue
    h[new Date(s.ts - s.sec * 1000).getHours()] += s.sec
    n++
  }
  if (n < 5) return null
  const best = h.indexOf(Math.max(...h))
  return { hour: best, n }
}

export { addDays }
