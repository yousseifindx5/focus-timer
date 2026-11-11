import { useMemo, useState } from 'react'
import { useStore, useT } from '../store'
import { Bars, Card, Progress, Spark } from '../ui'
import { addDays, activeMap, dayKey, parseKey, rangeKeys, streakAt, weekStartKey } from '../game'
import { fmtDur, summarize, type CatFilter } from '../stats'

type Tab = 'day' | 'week' | 'month' | 'custom'

const monthStart = (k: string) => k.slice(0, 8) + '01'
const monthEnd = (k: string) => { const d = parseKey(k); return dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
const shiftMonth = (k: string, n: number) => { const d = parseKey(k); return dayKey(new Date(d.getFullYear(), d.getMonth() + n, 1)) }
const addMonthsKey = (k: string, n: number) => { const d = parseKey(k); return dayKey(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())) }
// custom range is limited to 3 months
const maxEnd = (from: string) => addDays(addMonthsKey(from, 3), -1)
const minStart = (to: string) => addDays(addMonthsKey(to, -3), 1)

export function StatsPage() {
  const t = useT()
  const s = useStore()
  const lang = s.settings.lang
  const loc = lang === 'ar' ? 'ar-u-nu-latn' : 'en-US'
  const ws = s.settings.weekStart
  const today = dayKey(Date.now())
  const [tab, setTab] = useState<Tab>('day')
  const [anchor, setAnchor] = useState(today)
  const [cat, setCat] = useState<CatFilter>('all')
  const [from, setFrom] = useState(addDays(today, -13))
  const [to, setTo] = useState(today)

  const onFrom = (v: string) => {
    if (!v) return
    const f = v > today ? today : v
    let e = to < f ? f : to
    if (e > maxEnd(f)) e = maxEnd(f)
    setFrom(f)
    setTo(e)
  }
  const onTo = (v: string) => {
    if (!v) return
    const e = v > today ? today : v
    let f = from > e ? e : from
    if (f < minStart(e)) f = minStart(e)
    setTo(e)
    setFrom(f)
  }

  let a = anchor, b = anchor
  if (tab === 'week') { a = weekStartKey(anchor, ws); b = addDays(a, 6) }
  if (tab === 'month') { a = monthStart(anchor); b = monthEnd(anchor) }
  if (tab === 'custom') { a = from; b = to }

  const nav = (dir: number) => {
    if (tab === 'day') setAnchor(addDays(anchor, dir))
    else if (tab === 'week') setAnchor(addDays(anchor, 7 * dir))
    else if (tab === 'month') setAnchor(shiftMonth(anchor, dir))
  }

  const sum = useMemo(() => summarize(s.sessions, s.tasks, a, b, cat), [s.sessions, s.tasks, a, b, cat])
  const work = useMemo(() => summarize(s.sessions, s.tasks, a, b, 'work'), [s.sessions, s.tasks, a, b])
  const study = useMemo(() => summarize(s.sessions, s.tasks, a, b, 'study'), [s.sessions, s.tasks, a, b])
  const dayLab = (k: string, o: Intl.DateTimeFormatOptions) => parseKey(k).toLocaleDateString(loc, o)
  const keys = Object.keys(sum.days)
  const preset = s.presets.find((p) => p.id === s.settings.presetId) ?? s.presets[0]

  const title = tab === 'day' ? dayLab(a, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : tab === 'month' ? dayLab(a, { month: 'long', year: 'numeric' })
    : `${dayLab(a, { day: 'numeric', month: 'short' })} - ${dayLab(b, { day: 'numeric', month: 'short', year: 'numeric' })}`

  /* weekly: best/worst only consider days that actually had sessions */
  const past = keys.filter((k) => k <= today)
  const activeDays = past.filter((k) => sum.days[k].sec > 0)
  const idleDays = past.length - activeDays.length
  const best = activeDays.length ? activeDays.reduce((x, y) => (sum.days[y].sec > sum.days[x].sec ? y : x)) : null
  const worst = activeDays.length > 1 ? activeDays.reduce((x, y) => (sum.days[y].sec < sum.days[x].sec ? y : x)) : null
  const prevWeek = useMemo(() => (tab === 'week' ? summarize(s.sessions, s.tasks, addDays(a, -7), addDays(a, -1), cat) : null), [tab, a, s.sessions, s.tasks, cat])
  const trend = prevWeek && prevWeek.sec > 0 ? Math.round(((sum.sec - prevWeek.sec) / prevWeek.sec) * 100) : null
  const weeks8 = useMemo(() => {
    if (tab !== 'week') return []
    return Array.from({ length: 8 }, (_, i) => {
      const st = addDays(a, -7 * (7 - i))
      return { label: parseKey(st).toLocaleDateString(loc, { day: 'numeric', month: 'short' }), value: Math.round((summarize(s.sessions, s.tasks, st, addDays(st, 6), cat).sec / 3600) * 10) / 10, hi: st === a ? true : undefined }
    })
  }, [tab, a, s.sessions, s.tasks, cat, loc])

  /* monthly */
  const heat = useMemo(() => {
    if (tab !== 'month') return null
    const end = b < today ? b : today
    const last = weekStartKey(end, ws)
    const first = addDays(last, -25 * 7)
    const days = summarize(s.sessions, s.tasks, first, addDays(last, 6), cat).days
    return rangeKeys(first, addDays(last, 6)).map((k) => ({ k, n: days[k]?.pomos ?? 0, out: k > today }))
  }, [tab, b, ws, s.sessions, s.tasks, cat, today])
  const act = useMemo(() => activeMap(s.sessions), [s.sessions])
  const frozen = useMemo(() => new Set(s.game.frozen), [s.game.frozen])
  const evoKeys = tab === 'month' ? keys.filter((k) => k <= today) : []
  const streakEvo = evoKeys.map((k) => streakAt(k, act, frozen))
  const projectsDone = tab === 'month' ? s.projects.filter((p) => {
    const ts = s.tasks.filter((x) => x.projectId === p.id)
    if (!ts.length || !ts.every((x) => x.done)) return false
    const last = dayKey(Math.max(...ts.map((x) => x.doneAt ?? 0)))
    return last >= a && last <= b
  }).length : 0
  const lvl = (n: number) => (n <= 0 ? '' : n >= s.settings.dailyGoal * 1.5 ? 'l4' : n >= s.settings.dailyGoal ? 'l3' : n >= s.settings.dailyGoal / 2 ? 'l2' : 'l1')

  const barsFor = (ks: string[]) => ks.map((k) => ({ label: tab === 'week' ? dayLab(k, { weekday: 'short' }) : String(+k.slice(8)), value: Math.round(sum.days[k].sec / 60), hi: tab === 'week' && best ? k === best : undefined }))
  const months = tab === 'custom' ? [...new Set(keys.map((k) => k.slice(0, 7)))] : []
  const taskRows = s.tasks.filter((x) => (cat === 'all' || x.category === cat) && (x.spentSec > 0 || !x.done)).slice(-20).reverse()
  const hrs = (sec: number) => (sec / 3600).toFixed(1)
  const catName = (c: string) => (c === 'work' ? t('شغل', 'Work') : t('مذاكرة', 'Study'))

  return (
    <>
      <h1>{t('الملخصات', 'Summaries')}</h1>
      <div className="row">
        {([['day', t('يومي', 'Daily')], ['week', t('أسبوعي', 'Weekly')], ['month', t('شهري', 'Monthly')], ['custom', t('مخصص', 'Custom')]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
        <span className="sp" />
        {(['all', 'work', 'study'] as CatFilter[]).map((k) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{k === 'all' ? t('الكل', 'All') : catName(k)}</button>)}
      </div>

      <div className="row">
        {tab !== 'custom' ? (
          <>
            <button className="btn" onClick={() => nav(-1)}>{lang === 'ar' ? '›' : '‹'}</button>
            <b style={{ minWidth: 220, textAlign: 'center' }}>{title}</b>
            <button className="btn" onClick={() => nav(1)}>{lang === 'ar' ? '‹' : '›'}</button>
            <button className="btn sm" onClick={() => setAnchor(today)}>{t('اليوم', 'Today')}</button>
          </>
        ) : (
          <>
            <label className="f" style={{ flexDirection: 'row', alignItems: 'center' }}>{t('من', 'From')}<input type="date" max={today} value={from} onChange={(e) => onFrom(e.target.value)} /></label>
            <label className="f" style={{ flexDirection: 'row', alignItems: 'center' }}>{t('إلى', 'To')}<input type="date" max={today} value={to} onChange={(e) => onTo(e.target.value)} /></label>
            <span className="small muted">{t('أقصى فترة: 3 شهور', 'Maximum range: 3 months')}</span>
          </>
        )}
      </div>

      <div className="grid g4">
        <Card><h3>{t('إجمالي وقت التركيز', 'Total focus time')}</h3><div className="big">{fmtDur(sum.sec)}</div></Card>
        <Card><h3>{t('عدد البومودورو', 'Pomodoros')}</h3><div className="big">{sum.pomos}</div></Card>
        <Card><h3>{t('المهام المنجزة', 'Tasks completed')}</h3><div className="big">{sum.tasksDone}</div></Card>
        <Card>
          <h3>{t('معدل التشتت', 'Distraction rate')}</h3>
          <div className="big">{sum.distraction}%</div>
          <div className="small muted">{sum.abandoned} {t('جلسة متقطعة', 'abandoned')} / {sum.completed + sum.abandoned} {t('جلسة بدأت', 'started')} · {sum.pauses} {t('إيقاف مؤقت', 'pauses')}</div>
          <div className="small muted" style={{ marginTop: 4 }}>{t('الجلسة المتقطعة = إعادة تعيين أو تخطي جلسة تركيز بعد 30 ثانية على الأقل قبل ما تخلص. الإيقاف المؤقت بيتعد لوحده ومش داخل في النسبة.', 'Abandoned = a focus session reset or skipped after at least 30 s, before it finished. Pauses are listed separately and not part of the rate.')}</div>
        </Card>
      </div>

      {cat === 'all' && (
        <Card>
          <h3>{t('شغل مقابل مذاكرة', 'Work vs study')}</h3>
          <div className="grid g2">
            <div><b>{t('شغل', 'Work')}</b><div className="muted">{fmtDur(work.sec)} · {work.pomos} {t('بومودورو', 'pomodoros')} · {work.tasksDone} {t('مهام', 'tasks')}</div></div>
            <div><b>{t('مذاكرة', 'Study')}</b><div className="muted">{fmtDur(study.sec)} · {study.pomos} {t('بومودورو', 'pomodoros')} · {study.tasksDone} {t('مهام', 'tasks')}</div></div>
          </div>
        </Card>
      )}

      {tab === 'day' && (
        <Card>
          <h2>{t('التركيز بالساعة (دقائق)', 'Focus by hour (minutes)')}</h2>
          <Bars height={170} data={sum.hourly.map((v, h) => ({ label: h % 3 === 0 ? String(h) : '', value: Math.round(v) }))} />
        </Card>
      )}

      {tab === 'week' && (
        <>
          <Card><h2>{t('مقارنة الأيام (دقائق)', 'Day comparison (minutes)')}</h2><Bars height={170} data={barsFor(keys)} /></Card>
          <div className="grid g4">
            <Card><h3>{t('أفضل يوم', 'Best day')}</h3><div className="big" style={{ fontSize: 20 }}>{best ? dayLab(best, { weekday: 'long' }) : '-'}</div><div className="small muted">{best ? fmtDur(sum.days[best].sec) : t('مفيش نشاط الأسبوع ده', 'No activity this week')}</div></Card>
            <Card><h3>{t('أضعف يوم (من الأيام النشطة)', 'Weakest active day')}</h3><div className="big" style={{ fontSize: 20 }}>{worst ? dayLab(worst, { weekday: 'long' }) : '-'}</div><div className="small muted">{worst ? fmtDur(sum.days[worst].sec) : t('محتاج يومين نشطين على الأقل', 'Needs at least two active days')}</div></Card>
            <Card><h3>{t('أيام من غير جلسات', 'Days without sessions')}</h3><div className="big" style={{ fontSize: 20 }}>{idleDays}</div><div className="small muted">{t('من أصل', 'out of')} {past.length} {t('يوم مضى', 'elapsed days')}</div></Card>
            <Card><h3>{t('اتجاه الإنتاجية', 'Productivity trend')}</h3><div className="big" style={{ fontSize: 20, color: trend == null ? undefined : trend >= 0 ? 'var(--short)' : 'var(--work)' }}>{trend == null ? '-' : `${trend >= 0 ? '+' : ''}${trend}%`}</div><div className="small muted">{t('وقت التركيز مقارنة بالأسبوع اللي فات', 'Focus time vs previous week')}</div></Card>
          </div>
          <div className="grid g2">
            <Card><h3>{t('أهداف الأسبوع', 'Weekly goal')}</h3><div className="row"><span className="big">{sum.pomos}</span><span className="muted">/ {s.settings.weeklyGoal} {t('بومودورو', 'pomodoros')}</span></div><Progress value={sum.pomos / s.settings.weeklyGoal} /></Card>
            <Card>
              <h2>{t('آخر 8 أسابيع (ساعات تركيز)', 'Last 8 weeks (focus hours)')}</h2>
              <Bars height={130} data={weeks8} fmt={(v) => v.toFixed(1)} />
              <div className="small muted" style={{ marginTop: 6 }}>{t('كل عمود = أسبوع كامل، تحته تاريخ أول يوم فيه. الأسبوع الحالي هو الأخير.', 'Each bar is one full week, labeled with its first day. The selected week is the last bar.')}</div>
            </Card>
          </div>
        </>
      )}

      {tab === 'month' && heat && (
        <>
          <div className="grid g3">
            <Card><h3>{t('إجمالي الساعات', 'Total hours')}</h3><div className="big">{hrs(sum.sec)}h</div></Card>
            <Card><h3>{t('المشاريع المنجزة', 'Projects completed')}</h3><div className="big">{projectsDone}</div></Card>
            <Card><h3>{t('أيام النشاط', 'Active days')}</h3><div className="big">{keys.filter((k) => sum.days[k].pomos > 0).length}</div></Card>
          </div>
          <Card>
            <h2>{t('خريطة النشاط', 'Activity heatmap')}</h2>
            <div className="heat">{heat.map((c) => <i key={c.k} className={c.out ? 'out' : lvl(c.n)} title={`${c.k}: ${c.n}`} />)}</div>
            <div className="small muted" style={{ marginTop: 6 }}>{t('كل مربع = يوم، والأفتح = بومودورو أكتر. آخر 26 أسبوع.', 'Each square is a day; brighter means more pomodoros. Last 26 weeks.')}</div>
          </Card>
          <div className="grid g2">
            <Card>
              <h2>{t('تطور السلسلة', 'Streak evolution')}</h2>
              <Spark values={streakEvo} peak={`${t('أعلى سلسلة في الشهر', 'Peak this month')}: ${Math.max(0, ...streakEvo)} ${t('يوم', 'days')}`} startLabel={evoKeys.length ? dayLab(evoKeys[0], { day: 'numeric', month: 'short' }) : ''} endLabel={evoKeys.length ? dayLab(evoKeys[evoKeys.length - 1], { day: 'numeric', month: 'short' }) : ''} />
              <div className="small muted" style={{ marginTop: 6 }}>{t('الخط بيوضح طول سلسلتك اليومية في آخر كل يوم من أيام الشهر. لما ينزل لصفر يبقى السلسلة اتقطعت.', 'The line shows how long your daily streak was at the end of each day of the month. A drop to zero means the streak was broken.')}</div>
            </Card>
            <Card><h2>{t('دقائق التركيز يومياً', 'Daily focus minutes')}</h2><Bars height={110} data={barsFor(keys)} /></Card>
          </div>
        </>
      )}

      {tab === 'custom' && months.map((m) => (
        <Card key={m}>
          <h2>{dayLab(m + '-01', { month: 'long', year: 'numeric' })} ({t('دقائق التركيز يومياً', 'daily focus minutes')})</h2>
          <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 31 * 22 }}><Bars height={150} data={barsFor(keys.filter((k) => k.startsWith(m)))} /></div></div>
        </Card>
      ))}

      <Card>
        <h2>{t('تحليل المهام: الوقت المقدّر مقابل الفعلي', 'Task analytics: estimated vs actual')}</h2>
        {taskRows.length === 0 ? <div className="muted">-</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>{t('المهمة', 'Task')}</th><th>{t('المقدّر', 'Estimated')}</th><th>{t('الفعلي', 'Actual')}</th><th>{t('بومودورو', 'Pomodoros')}</th><th></th></tr></thead>
              <tbody>
                {taskRows.map((x) => {
                  const est = x.estPomos * preset.work * 60
                  const diff = est ? Math.round(((x.spentSec - est) / est) * 100) : 0
                  return (
                    <tr key={x.id}>
                      <td>{x.title} <span className="tag">{catName(x.category)}</span> {x.done && <span className="tag">{t('منجزة', 'done')}</span>}</td>
                      <td>{fmtDur(est)}</td><td>{fmtDur(x.spentSec)}</td><td>{x.donePomos}/{x.estPomos}</td>
                      <td className="small" style={{ color: x.spentSec === 0 ? undefined : diff > 0 ? 'var(--work)' : 'var(--short)' }}>{x.spentSec ? `${diff > 0 ? '+' : ''}${diff}%` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="small muted" style={{ marginTop: 6 }}>{t(`الوقت المقدّر = عدد البومودورو × ${preset.work} دقيقة (النظام الحالي)`, `Estimated time = pomodoros × ${preset.work} min (current system)`)}</div>
      </Card>
    </>
  )
}
