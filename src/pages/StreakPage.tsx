import { useStore, useT } from '../store'
import { Card, Progress } from '../ui'
import { BADGES, computeStats, dayKey, freezesLeft, xpForLevel } from '../game'
import { FREEZES_PER_MONTH } from '../types'

export function StreakPage() {
  const t = useT()
  const s = useStore()
  const st = computeStats(s.sessions, s.tasks, s.projects, s.game, s.settings)
  const left = freezesLeft(s.game, dayKey(Date.now()))
  const lo = xpForLevel(st.level)
  const hi = xpForLevel(st.level + 1)
  const earned = BADGES.filter((b) => s.game.badges[b.id]).length
  const lang = s.settings.lang

  return (
    <>
      <h1>{t('السلسلة والمستويات والشارات', 'Streaks, levels & badges')}</h1>
      <div className="grid g4">
        <Card><h3>{t('السلسلة اليومية', 'Daily streak')}</h3><div className="big">{st.streak}</div><div className="small muted">{t('يوم متتالي', 'days in a row')}</div></Card>
        <Card><h3>{t('السلسلة الأسبوعية', 'Weekly streak')}</h3><div className="big">{st.weeklyStreak}</div><div className="small muted">{t('أسبوع (3 أيام نشطة أو أكتر)', 'weeks (3 or more active days)')}</div></Card>
        <Card><h3>{t('أطول سلسلة', 'Longest streak')}</h3><div className="big">{st.longest}</div><div className="small muted">{t('يوم', 'days')}</div></Card>
        <Card>
          <h3>{t('حماية السلسلة', 'Streak freeze')}</h3>
          <div className="big">{left}/{FREEZES_PER_MONTH}</div>
          <div className="small muted">{t('بتتجدد مرتين كل شهر وبتتفعّل تلقائياً لو فاتك يوم', 'Renews twice a month, auto-applies if you miss a day')}</div>
        </Card>
      </div>

      <Card>
        <div className="row"><h2 style={{ margin: 0 }}>{t('المستوى', 'Level')} {st.level}</h2><span className="sp" /><span className="muted">{st.xp} / {hi} XP</span></div>
        <div style={{ margin: '10px 0' }}><Progress value={(st.xp - lo) / (hi - lo)} /></div>
        <div className="small muted">{t('كل بومودورو = 10 XP — كل مهمة منجزة = 25 XP', 'Each pomodoro = 10 XP — each completed task = 25 XP')}</div>
      </Card>

      <Card>
        <h2>{t('الشارات', 'Badges')} ({earned}/{BADGES.length})</h2>
        <div className="grid g4">
          {BADGES.map((b) => {
            const on = !!s.game.badges[b.id]
            const cur = Math.min(b.v, Math.floor(st[b.k] as number))
            return (
              <div key={b.id} className={`badge ${on ? 'on' : 'off'}`} style={on ? { borderColor: b.color, boxShadow: `0 0 18px ${b.color}33` } : undefined} title={lang === 'ar' ? b.dAr : b.dEn}>
                <div className="ico">{b.icon}</div>
                <b style={{ fontSize: 13 }}>{lang === 'ar' ? b.ar : b.en}</b>
                <div className="small muted">{lang === 'ar' ? b.dAr : b.dEn}</div>
                {!on && <div style={{ width: '100%' }}><Progress value={cur / b.v} /><div className="small muted">{cur}/{b.v}</div></div>}
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}
