import { useState } from 'react'
import { useStore, useT } from '../store'
import { Card, Progress } from '../ui'
import { fmtDur } from '../stats'
import { dayKey } from '../game'
import { DIFFICULTY_POMOS } from '../types'
import type { Category, Difficulty, Period, Priority, Task } from '../types'

const PRI_COLOR: Record<Priority, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

type Draft = Pick<Task, 'title' | 'category' | 'period' | 'difficulty' | 'priority' | 'estPomos' | 'deadline' | 'projectId'>
const EMPTY: Draft = { title: '', category: 'work', period: 'daily', difficulty: 'medium', priority: 'medium', estPomos: 4, deadline: null, projectId: null }

function TaskForm({ init, onSave, onCancel }: { init: Draft; onSave: (d: Draft) => void; onCancel?: () => void }) {
  const t = useT()
  const projects = useStore((s) => s.projects)
  const [d, setD] = useState<Draft>(init)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const diff: [Difficulty, string][] = [['easy', t('سهلة', 'Easy')], ['medium', t('متوسطة', 'Medium')], ['hard', t('صعبة', 'Hard')]]
  const submit = () => { if (d.title.trim()) { onSave({ ...d, title: d.title.trim() }); if (!onCancel) setD(EMPTY) } }
  return (
    <div className="grid">
      <input type="text" placeholder={t('عنوان المهمة…', 'Task title…')} value={d.title} onChange={(e) => set({ title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus={!!onCancel} />
      <div className="grid g4">
        <label className="f">{t('النوع', 'Type')}
          <select value={d.category} onChange={(e) => set({ category: e.target.value as Category })}>
            <option value="work">{t('شغل', 'Work')}</option><option value="study">{t('مذاكرة', 'Study')}</option>
          </select></label>
        <label className="f">{t('الفترة', 'Period')}
          <select value={d.period} onChange={(e) => set({ period: e.target.value as Period })}>
            <option value="daily">{t('يومية', 'Daily')}</option><option value="weekly">{t('أسبوعية', 'Weekly')}</option><option value="monthly">{t('شهرية', 'Monthly')}</option>
          </select></label>
        <label className="f">{t('الأولوية', 'Priority')}
          <select value={d.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            <option value="high">{t('عالية', 'High')}</option><option value="medium">{t('متوسطة', 'Medium')}</option><option value="low">{t('منخفضة', 'Low')}</option>
          </select></label>
        <label className="f">{t('الموعد النهائي', 'Deadline')}
          <input type="date" value={d.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value || null })} /></label>
      </div>
      <div className="row">
        <span className="muted small">{t('الصعوبة:', 'Difficulty:')}</span>
        {diff.map(([k, l]) => (
          <button key={k} className={`chip ${d.difficulty === k ? 'on' : ''}`} onClick={() => set({ difficulty: k, estPomos: DIFFICULTY_POMOS[k] })}>{l} (~{DIFFICULTY_POMOS[k]} {t('بومودورو', 'pomodoros')})</button>
        ))}
        <label className="f" style={{ flexDirection: 'row', alignItems: 'center' }}>{t('عدد البومودورو المتوقع', 'Est. pomodoros')}
          <input type="number" min={1} max={99} style={{ width: 70 }} value={d.estPomos} onChange={(e) => set({ estPomos: Math.max(1, +e.target.value || 1) })} /></label>
        {projects.length > 0 && (
          <select value={d.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || null })}>
            <option value="">{t('بدون مشروع', 'No project')}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <span className="sp" />
        {onCancel && <button className="btn" onClick={onCancel}>{t('إلغاء', 'Cancel')}</button>}
        <button className="btn pri" onClick={submit}>{onCancel ? t('حفظ', 'Save') : `${t('أضف', 'Add')}`}</button>
      </div>
    </div>
  )
}

export function TasksPage() {
  const t = useT()
  const s = useStore()
  const [tab, setTab] = useState<'all' | Period | 'projects'>('all')
  const [cat, setCat] = useState<'all' | Category>('all')
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [pn, setPn] = useState('')
  const [pc, setPc] = useState<Category>('work')
  const preset = s.presets.find((p) => p.id === s.settings.presetId) ?? s.presets[0]
  const today = dayKey(Date.now())

  const list = s.tasks.filter((x) => (tab === 'all' || tab === 'projects' || x.period === tab) && (cat === 'all' || x.category === cat) && (showDone || !x.done))
  const tabs: ['all' | Period | 'projects', string][] = [['all', t('الكل', 'All')], ['daily', t('يومية', 'Daily')], ['weekly', t('أسبوعية', 'Weekly')], ['monthly', t('شهرية', 'Monthly')], ['projects', t('المشاريع', 'Projects')]]
  const periodLabel = { daily: t('يومية', 'Daily'), weekly: t('أسبوعية', 'Weekly'), monthly: t('شهرية', 'Monthly') }
  const diffLabel = { easy: t('سهلة', 'Easy'), medium: t('متوسطة', 'Medium'), hard: t('صعبة', 'Hard') }

  return (
    <>
      <h1>{t('المهام والمشاريع', 'Tasks & Projects')}</h1>
      <div className="row">
        {tabs.map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        <span className="sp" />
        {(['all', 'work', 'study'] as const).map((k) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{k === 'all' ? t('الكل', 'All') : k === 'work' ? `${t('شغل', 'Work')}` : `${t('مذاكرة', 'Study')}`}</button>)}
      </div>

      {tab === 'projects' ? (
        <>
          <Card>
            <h2>{t('مشروع جديد', 'New project')}</h2>
            <div className="row">
              <input type="text" placeholder={t('اسم المشروع…', 'Project name…')} value={pn} onChange={(e) => setPn(e.target.value)} />
              <select value={pc} onChange={(e) => setPc(e.target.value as Category)}><option value="work">{t('شغل', 'Work')}</option><option value="study">{t('مذاكرة', 'Study')}</option></select>
              <button className="btn pri" onClick={() => { if (pn.trim()) { s.addProject({ name: pn.trim(), category: pc, color: pc === 'work' ? '#ef4444' : '#3b82f6' }); setPn('') } }}>{t('أضف', 'Add')}</button>
            </div>
          </Card>
          <div className="grid g2">
            {s.projects.length === 0 && <div className="muted">{t('مفيش مشاريع لسه.', 'No projects yet.')}</div>}
            {s.projects.map((p) => {
              const ts = s.tasks.filter((x) => x.projectId === p.id)
              const done = ts.filter((x) => x.done).length
              return (
                <Card key={p.id}>
                  <div className="row"><b>{p.name} ({p.category === 'work' ? t('شغل', 'Work') : t('مذاكرة', 'Study')})</b><span className="sp" />
                    {ts.length > 0 && done === ts.length && <span className="tag">{t('منجز', 'Done')}</span>}
                    <button className="btn sm danger" onClick={() => confirm(t('حذف المشروع؟ (المهام هتفضل)', 'Delete project? (tasks are kept)')) && s.removeProject(p.id)}>{t('حذف', 'Delete')}</button></div>
                  <div className="small muted" style={{ margin: '6px 0' }}>{done}/{ts.length} {t('مهام', 'tasks')} · {ts.reduce((a, x) => a + x.donePomos, 0)} {t('بومودورو', 'pomodoros')} · {fmtDur(ts.reduce((a, x) => a + x.spentSec, 0))}</div>
                  <Progress value={ts.length ? done / ts.length : 0} color={p.color} />
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <Card><h2>{t('مهمة جديدة', 'New task')}</h2><TaskForm init={EMPTY} onSave={(d) => s.addTask(d)} /></Card>
          <Card>
            <div className="row" style={{ marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>{t('قائمة المهام', 'Task list')}</h2><span className="sp" />
              <label className="toggle"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /><span className="track" /><span className="small">{t('إظهار المنجزة', 'Show completed')}</span></label>
            </div>
            <div className="small muted" style={{ marginBottom: 8 }}>{t('اسحب المهام لإعادة الترتيب', 'Drag tasks to reorder')}</div>
            <div className="grid" style={{ gap: 8 }}>
              {list.length === 0 && <div className="muted">{t('مفيش مهام هنا.', 'No tasks here.')}</div>}
              {list.map((x) =>
                editing === x.id ? (
                  <Card key={x.id}><TaskForm init={x} onSave={(d) => { s.updateTask(x.id, d); setEditing(null) }} onCancel={() => setEditing(null)} /></Card>
                ) : (
                  <div key={x.id} className={`task ${x.done ? 'done' : ''} ${drag === x.id ? 'drag' : ''} ${over === x.id ? 'over' : ''}`} draggable
                    onDragStart={() => setDrag(x.id)} onDragEnd={() => { setDrag(null); setOver(null) }}
                    onDragOver={(e) => { e.preventDefault(); setOver(x.id) }}
                    onDrop={() => { if (drag) s.moveTask(drag, x.id); setDrag(null); setOver(null) }}>
                    <span className="grip">⋮⋮</span>
                    <input type="checkbox" checked={x.done} onChange={() => s.toggleTask(x.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <i className="dot" style={{ background: PRI_COLOR[x.priority] }} />
                        <span className="title">{x.title}</span>
                        <span className="tag">{x.category === 'work' ? t('شغل', 'Work') : t('مذاكرة', 'Study')}</span>
                        <span className="tag">{periodLabel[x.period]}</span>
                        <span className="tag">{diffLabel[x.difficulty]}</span>
                        {x.deadline && (
                          <span className={`tag ${!x.done && x.deadline < today ? 'over-due' : ''}`}>
                            {t('الموعد النهائي', 'Deadline')} {x.deadline}
                            {!x.done && x.deadline < today ? ` - ${t('متأخرة', 'overdue')}` : x.done && x.doneAt ? ` - ${dayKey(x.doneAt) <= x.deadline ? t('اتنجزت في ميعادها', 'done on time') : t('اتنجزت متأخر', 'finished late')}` : x.deadline === today ? ` - ${t('النهاردة', 'today')}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="small muted" style={{ margin: '4px 0' }}>
                        {x.donePomos}/{x.estPomos} {t('بومودورو', 'pomodoros')} · {t('مقدّر', 'Est.')} {fmtDur(x.estPomos * preset.work * 60)} · {t('فعلي', 'Actual')} {fmtDur(x.spentSec)}
                      </div>
                      <Progress value={x.donePomos / Math.max(1, x.estPomos)} />
                    </div>
                    {!x.done && <button className="btn sm" title={t('ابدأ بالتايمر', 'Work on this')} onClick={() => { s.selectTask(x.id); s.setView('timer') }}>{t('ابدأ', 'Start')}</button>}
                    <button className="btn sm" onClick={() => setEditing(x.id)}>{t('تعديل', 'Edit')}</button>
                    <button className="btn sm danger" onClick={() => s.removeTask(x.id)}>{t('حذف', 'Delete')}</button>
                  </div>
                ),
              )}
            </div>
          </Card>
        </>
      )}
    </>
  )
}
