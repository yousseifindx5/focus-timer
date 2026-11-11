import { useMemo } from 'react'
import { useStore, useT } from '../store'
import { Card, Progress, Ring, Toggle } from '../ui'
import { bestHour, fmtClock, fmtDur } from '../stats'
import { dayKey } from '../game'
import type { Mode } from '../types'

const BREAK_TIPS: { ar: string; en: string }[] = [
  { ar: 'تمرين إطالة: مد دراعك لفوق وشد جسمك 20 ثانية', en: 'Stretch: reach both arms up and hold for 20 seconds' },
  { ar: 'تنفس 4-7-8: شهيق 4، احبس 7، زفير 8 — كرر 4 مرات', en: 'Breathe 4-7-8: in 4s, hold 7s, out 8s — repeat 4 times' },
  { ar: 'قاعدة 20-20-20: بص على حاجة بعيدة 20 قدم لمدة 20 ثانية', en: '20-20-20 rule: look at something 20 ft away for 20 seconds' },
  { ar: 'قوم امشي دقيقتين وحرّك رجليك', en: 'Stand up and walk for two minutes' },
  { ar: 'لف رقبتك ببطء يمين وشمال، ودوّر كتافك 10 مرات', en: 'Slowly roll your neck, then roll your shoulders 10 times' },
  { ar: 'مد صوابعك ورسغك — مهم لو بتكتب كتير', en: 'Stretch your fingers and wrists — great after lots of typing' },
  { ar: 'افتح الشباك وخد نفس هواء نضيف', en: 'Open a window and get some fresh air' },
  { ar: 'اعمل 10 ضغطات حائط أو 15 سكوات خفيف', en: 'Do 10 wall push-ups or 15 light squats' },
]

const MODE_COLOR: Record<Mode, string> = { focus: 'var(--work)', short: 'var(--short)', long: 'var(--long)' }
const PRI = { high: 0, medium: 1, low: 2 } as const

function useModeLabel() {
  const t = useT()
  return (m: Mode) => (m === 'focus' ? t('تركيز', 'Focus') : m === 'short' ? t('استراحة قصيرة', 'Short break') : t('استراحة طويلة', 'Long break'))
}

export function TimerPage() {
  const t = useT()
  const label = useModeLabel()
  const s = useStore()
  const preset = s.presets.find((p) => p.id === s.settings.presetId) ?? s.presets[0]
  const openTasks = s.tasks.filter((x) => !x.done).sort((a, b) => PRI[a.priority] - PRI[b.priority])
  const task = s.tasks.find((x) => x.id === s.taskId)
  const locked = s.running || s.started
  const size = 280 * s.settings.timerScale
  const best = useMemo(() => bestHour(s.sessions), [s.sessions])
  const today = dayKey(Date.now())
  const todayPomos = s.sessions.filter((x) => x.completed && dayKey(x.ts) === today).length
  const tip = BREAK_TIPS[(s.cycle + s.sessions.length) % BREAK_TIPS.length]
  const needTask = s.mode === 'focus' && !s.taskId
  const side = s.settings.timerLayout === 'side'

  const hh = (h: number) => `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`

  const timer = (
    <div className="timer-main">
      <div className="row">
        {(['focus', 'short', 'long'] as Mode[]).map((m) => (
          <button key={m} className={`chip ${s.mode === m ? 'on' : ''}`} disabled={s.running} onClick={() => s.setMode(m)}>{label(m)}</button>
        ))}
      </div>
      <Ring size={size} frac={s.total ? s.remaining / s.total : 0} color={MODE_COLOR[s.mode]} running={s.running}>
        <div className="mode-lab" style={{ color: MODE_COLOR[s.mode], fontSize: size * 0.065 }}>{label(s.mode)}</div>
        <div className="time" style={{ fontSize: size * 0.2 }}>{fmtClock(s.remaining)}</div>
        <div className="muted" style={{ fontSize: size * 0.05, marginTop: 8 }}>{task ? task.title : '—'}</div>
      </Ring>
      <div className="dots" title={t('جلسات قبل الاستراحة الطويلة', 'Sessions until long break')}>
        {Array.from({ length: preset.every }, (_, i) => <i key={i} className={i < s.cycle % preset.every ? 'on' : ''} />)}
      </div>
      <div className="ctrls">
        <button className="btn pri go" onClick={s.toggle} disabled={needTask && !s.running}>
          {s.running ? `${t('إيقاف مؤقت', 'Pause')}` : s.started || s.remaining < s.total ? `${t('استئناف', 'Resume')}` : `${t('ابدأ', 'Start')}`}
        </button>
        <button className="btn" onClick={s.reset} title="R">{t('إعادة تعيين', 'Reset')}</button>
        <button className="btn" onClick={s.skip}>{t('تخطي', 'Skip')}</button>
      </div>
      <div className="small muted">{t('اختصارات: Space إيقاف/تشغيل — R إعادة تعيين', 'Shortcuts: Space start/pause — R reset')}</div>
    </div>
  )

  const info = (
    <div className="grid" style={{ alignContent: 'start' }}>
      <Card>
        <h2>{t('المهمة الحالية', 'Current task')}</h2>
        {openTasks.length === 0 ? (
          <div className="grid">
            <div className="muted">{t('لازم تضيف مهمة (يومية / أسبوعية / شهرية) الأول، وتحدد صعوبتها، وبعدين تبدأ التايمر.', 'Add a task (daily / weekly / monthly) first, set its difficulty, then start the timer.')}</div>
            <button className="btn pri" onClick={() => s.setView('tasks')}>{t('أضف مهمة', 'Add a task')}</button>
          </div>
        ) : (
          <div className="grid">
            <select value={s.taskId ?? ''} onChange={(e) => s.selectTask(e.target.value || null)}>
              <option value="">{t('— اختر مهمة —', '— Choose a task —')}</option>
              {openTasks.map((x) => <option key={x.id} value={x.id}>{x.category === 'study' ? t('مذاكرة', 'Study') : t('شغل', 'Work')} - {x.title} ({x.donePomos}/{x.estPomos})</option>)}
            </select>
            {task && (
              <>
                <Progress value={task.donePomos / Math.max(1, task.estPomos)} />
                <div className="small muted">{task.donePomos}/{task.estPomos} {t('بومودورو', 'pomodoros')} · {t('الوقت الفعلي', 'Actual')} {fmtDur(task.spentSec)} / {t('المقدّر', 'Est.')} {fmtDur(task.estPomos * preset.work * 60)}</div>
              </>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2>{t('نظام التايمر', 'Timer system')}</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          {s.presets.map((p) => (
            <button key={p.id} className={`chip ${p.id === preset.id ? 'on' : ''}`} disabled={locked} onClick={() => s.setPreset(p.id)}>
              {p.id === 'custom' ? `${t('مخصص', 'Custom')} ${p.work}/${p.short}` : p.name}
            </button>
          ))}
        </div>
        <Toggle on={s.settings.autoSwitch} set={(v) => s.setSettings({ autoSwitch: v })} label={t('تبديل تلقائي بين التركيز والاستراحة', 'Auto switch between focus and break')} />
      </Card>

      <Card>
        <h2>{t('اليوم', 'Today')}</h2>
        <div className="row"><span className="big">{todayPomos}</span><span className="muted">/ {s.settings.dailyGoal} {t('بومودورو (هدف اليوم)', 'pomodoros (daily goal)')}</span></div>
        <Progress value={todayPomos / s.settings.dailyGoal} />
      </Card>

      {s.mode !== 'focus' && s.settings.breakTips ? (
        <Card className="tip pop" key={s.cycle}>
          <div><h3>{t('اقتراح للاستراحة', 'Break suggestion')}</h3>{t(tip.ar, tip.en)}</div>
        </Card>
      ) : (
        <Card className="tip">
          <div>
            <h3>{t('أفضل وقت للتركيز', 'Best time to focus')}</h3>
            {best ? t(`حسب تاريخك، أفضل وقت ليك هو ${hh(best.hour)} – ${hh(best.hour + 1)} (من ${best.n} جلسة).`, `Based on your history, your best focus window is ${hh(best.hour)} – ${hh(best.hour + 1)} (${best.n} sessions).`) : t('كمّل كام جلسة وهقترح عليك أفضل وقت للتركيز.', 'Complete a few sessions and I will suggest your best focus time.')}
          </div>
        </Card>
      )}
    </div>
  )

  return (
    <>
      <h1>{t('التايمر', 'Timer')}</h1>
      <div className={`timer-wrap ${side ? 'side' : ''}`} style={side ? undefined : { gridTemplateColumns: '1fr' }}>
        {side ? <>{timer}{info}</> : <>{timer}<div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>{info}</div></>}
      </div>
    </>
  )
}

export function CompactTimer() {
  const t = useT()
  const label = useModeLabel()
  const s = useStore()
  const task = s.tasks.find((x) => x.id === s.taskId)
  return (
    <div className="compact" dir={s.settings.lang === 'ar' ? 'rtl' : 'ltr'}>
      <Ring size={200} frac={s.total ? s.remaining / s.total : 0} color={MODE_COLOR[s.mode]} running={s.running}>
        <div className="mode-lab" style={{ color: MODE_COLOR[s.mode], fontSize: 13 }}>{label(s.mode)}</div>
        <div className="time" style={{ fontSize: 42 }}>{fmtClock(s.remaining)}</div>
      </Ring>
      <div className="small muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task ? task.title : t('اختر مهمة من النافذة الكاملة', 'Pick a task in the full window')}</div>
      <div className="ctrls">
        <button className="btn pri" onClick={s.toggle} disabled={s.mode === 'focus' && !s.taskId && !s.running}>{s.running ? t('إيقاف', 'Pause') : t('ابدأ', 'Start')}</button>
        <button className="btn" onClick={s.reset}>{t('إعادة', 'Reset')}</button>
        <button className="btn" onClick={s.skip}>{t('تخطي', 'Skip')}</button>
        <button className="btn" onClick={() => s.setCompact(false)} title={t('تكبير', 'Expand')}>{t('تكبير', 'Expand')}</button>
      </div>
      <Toggle on={s.settings.alwaysOnTop} set={(v) => s.setSettings({ alwaysOnTop: v })} label={<span className="small">{t('فوق كل البرامج', 'On top of other programs')}</span>} />
    </div>
  )
}
