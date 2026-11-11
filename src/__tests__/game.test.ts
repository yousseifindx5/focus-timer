import { describe, expect, it } from 'vitest'
import { activeMap, addDays, BADGES, computeStats, computeStreaks, dayKey, freezeGaps, levelFromXp, streakAt, weekStartKey } from '../game'
import { DEFAULT_SETTINGS } from '../store'
import { summarize } from '../stats'
import type { Game, Session } from '../types'

const today = dayKey(Date.now())
const sess = (day: string, n = 1, extra: Partial<Session> = {}): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: day + i, ts: new Date(day + 'T10:00:00').getTime(), sec: 1500, category: 'work', taskId: null, completed: true, pauses: 0, ...extra }))
const game: Game = { badges: {}, frozen: [], freezeMonth: '', freezeUsed: 0 }

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds the start of the week for a chosen week start', () => {
    expect(weekStartKey('2026-11-11', 6)).toBe('2026-11-07') // Saturday
    expect(weekStartKey('2026-11-11', 0)).toBe('2026-11-08') // Sunday
  })
})

describe('streaks', () => {
  it('counts consecutive active days and keeps today optional', () => {
    const act = activeMap([...sess(addDays(today, -1)), ...sess(addDays(today, -2)), ...sess(addDays(today, -3))])
    expect(streakAt(today, act, new Set())).toBe(3)
  })
  it('breaks on a missed day', () => {
    const act = activeMap([...sess(addDays(today, -3)), ...sess(addDays(today, -2))])
    expect(streakAt(today, act, new Set())).toBe(0)
  })
  it('computes the longest streak', () => {
    const act = activeMap([...sess(addDays(today, -10)), ...sess(addDays(today, -9)), ...sess(addDays(today, -8)), ...sess(addDays(today, -1))])
    expect(computeStreaks(act, new Set(), today, 6).longest).toBe(3)
  })
})

describe('streak freeze', () => {
  it('bridges a single missed day', () => {
    const sessions = [4, 3, 2].flatMap((k) => sess(addDays(today, -k)))
    const r = freezeGaps(sessions, game, today)
    expect(r?.count).toBe(1)
    expect(streakAt(today, activeMap(sessions), new Set(r!.game.frozen))).toBe(3)
  })
  it('does not bridge more than 2 days a month', () => {
    expect(freezeGaps(sess(addDays(today, -6)), game, today)).toBeNull()
  })
})

describe('stats and badges', () => {
  it('awards level from xp', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(400)).toBe(3)
  })
  it('computes pomodoro totals', () => {
    const st = computeStats(sess(today, 3), [], [], game, DEFAULT_SETTINGS)
    expect(st.pomos).toBe(3)
    expect(st.xp).toBe(30)
  })
  it('has unique badge ids', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
  })
  it('summarizes distraction rate from abandoned sessions', () => {
    const sessions = [...sess(today, 3), ...sess(today, 1, { completed: false, id: 'x' })]
    const r = summarize(sessions, [], today, today, 'all')
    expect(r.pomos).toBe(3)
    expect(r.distraction).toBe(25)
  })
})
