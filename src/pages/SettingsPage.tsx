import { useState } from 'react'
import { useStore, useT, uid } from '../store'
import { Card, Row, Slider, Toggle } from '../ui'
import { FONTS, THEMES, randomThemeVars } from '../themes'
import type { CustomTheme, Preset, ThemeVars } from '../types'

function PresetEditor() {
  const t = useT()
  const s = useStore()
  const p = s.presets.find((x) => x.id === s.settings.presetId) ?? s.presets[0]
  const [draft, setDraft] = useState<Preset>(p)
  const [dirtyId, setDirtyId] = useState(p.id)
  if (dirtyId !== p.id) { setDraft(p); setDirtyId(p.id) }
  const auto = s.settings.autoSavePresets
  const upd = (patch: Partial<Preset>) => {
    const n = { ...draft, ...patch }
    setDraft(n)
    if (auto) s.savePreset(n)
  }
  const num = (k: 'work' | 'short' | 'long' | 'every', min: number, max: number) => (
    <input type="number" style={{ width: 72 }} min={min} max={max} value={draft[k]} onChange={(e) => upd({ [k]: Math.min(max, Math.max(min, +e.target.value || min)) })} />
  )
  const changed = JSON.stringify(draft) !== JSON.stringify(p)
  return (
    <Card>
      <h2>{t('أنظمة التايمر (Presets)', 'Timer presets')}</h2>
      <Row label={t('حفظ تلقائي للبريسيتس', 'Auto-save presets')} hint={t('مفعّل تلقائياً — أي تعديل يتحفظ فوراً', 'On by default — every change is saved instantly')}><Toggle on={auto} set={(v) => s.setSettings({ autoSavePresets: v })} /></Row>
      <div className="row" style={{ margin: '10px 0' }}>
        {s.presets.map((x) => <button key={x.id} className={`chip ${x.id === p.id ? 'on' : ''}`} disabled={s.running} onClick={() => s.setPreset(x.id)}>{x.id === 'custom' ? t('مخصص', 'Custom') : x.name}</button>)}
        <button className="btn sm" onClick={() => { const id = uid(); s.addPreset({ id, name: `${draft.work}/${draft.short}`, work: draft.work, short: draft.short, long: draft.long, every: draft.every }); s.setPreset(id) }}>{t('نظام جديد', 'New preset')}</button>
      </div>
      <div className="row">
        <label className="f">{t('اسم', 'Name')}<input type="text" style={{ width: 130 }} value={draft.name} onChange={(e) => upd({ name: e.target.value })} /></label>
        <label className="f">{t('تركيز (د)', 'Focus (min)')}{num('work', 1, 240)}</label>
        <label className="f">{t('استراحة (د)', 'Break (min)')}{num('short', 1, 60)}</label>
        <label className="f">{t('استراحة طويلة (د)', 'Long break (min)')}{num('long', 1, 120)}</label>
        <label className="f">{t('جلسات قبل الطويلة', 'Sessions / long')}{num('every', 1, 12)}</label>
        {!auto && <button className="btn pri" disabled={!changed} onClick={() => s.savePreset(draft)}>{t('حفظ', 'Save')}</button>}
        {!p.builtin && p.id !== 'custom' && <button className="btn danger" onClick={() => s.removePreset(p.id)}>{t('حذف', 'Delete')}</button>}
      </div>
    </Card>
  )
}

function ThemeEditor() {
  const t = useT()
  const s = useStore()
  const st = s.settings
  const [name, setName] = useState('')
  const [font, setFont] = useState(st.font)
  const [v, setV] = useState<ThemeVars>({ ...THEMES.dark.v })
  const colors: [keyof ThemeVars, string][] = [['bg', t('الخلفية', 'Background')], ['surface', t('الأسطح', 'Surface')], ['text', t('النص', 'Text')], ['accent', t('اللون الرئيسي', 'Accent')], ['work', t('تركيز', 'Focus')], ['short', t('استراحة', 'Break')], ['long', t('طويلة', 'Long')]]
  const save = () => {
    const c: CustomTheme = { id: 'c-' + uid(), name: name.trim() || t('ثيمي', 'My theme'), font, v }
    s.setSettings({ customThemes: [...st.customThemes, c], theme: c.id })
    setName('')
  }
  return (
    <Card>
      <h2>{t('اصنع ثيمك الخاص', 'Create your own theme')}</h2>
      <div className="row">
        {colors.map(([k, l]) => (
          <label key={k} className="f" style={{ alignItems: 'center' }}>{l}<input type="color" value={v[k] as string} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
        ))}
        <Toggle on={v.dark} set={(d) => setV({ ...v, dark: d })} label={t('داكن', 'Dark')} />
      </div>
      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <label className="f">{t('الخط', 'Font')}
          <select value={FONTS.includes(font) ? font : ''} onChange={(e) => e.target.value && setFont(e.target.value)}>
            {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            {!FONTS.includes(font) && <option value="">{font}</option>}
          </select></label>
        <label className="f">{t('اسم الثيم', 'Theme name')}<input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn" onClick={() => setV(randomThemeVars())}>{t('توليد عشوائي', 'Randomize')}</button>
        <button className="btn pri" onClick={save}>{t('حفظ وتطبيق', 'Save & apply')}</button>
      </div>
      <div className="sw" style={{ height: 34, marginTop: 12 }}>{[v.bg, v.surface, v.text, v.accent, v.work, v.short, v.long].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
    </Card>
  )
}

export function SettingsPage() {
  const t = useT()
  const s = useStore()
  const st = s.settings
  const set = s.setSettings
  const [msg, setMsg] = useState('')

  const pickBg = (f?: File) => {
    if (!f) return
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => {
      const k = Math.min(1, 1920 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = img.width * k; c.height = img.height * k
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      set({ bgImage: c.toDataURL('image/jpeg', 0.82) })
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
  const exportData = () => {
    const { settings, presets, tasks, projects, sessions, game } = useStore.getState()
    const blob = new Blob([JSON.stringify({ settings, presets, tasks, projects, sessions, game }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `focus-timer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importData = (f?: File) => f?.text().then((txt) => setMsg(s.importData(txt) ? t('تم الاستيراد', 'Imported') : t('ملف غير صالح', 'Invalid file')))
  const reminders = st.reminders
  const setRem = (id: string, p: object) => set({ reminders: reminders.map((r) => (r.id === id ? { ...r, ...p } : r)) })

  return (
    <>
      <h1>{t('الإعدادات', 'Settings')}</h1>

      <Card>
        <h2>{t('عام', 'General')}</h2>
        <Row label={t('لغة الواجهة', 'Interface language')}>
          <button className={`chip ${st.lang === 'ar' ? 'on' : ''}`} onClick={() => set({ lang: 'ar' })}>العربية</button>
          <button className={`chip ${st.lang === 'en' ? 'on' : ''}`} onClick={() => set({ lang: 'en' })}>English</button>
        </Row>
        <Row label={t('بداية الأسبوع', 'Week starts on')} hint={t('بيأثر على الملخص الأسبوعي والسلسلة الأسبوعية والأسبوع المثالي', 'Affects the weekly summary, the weekly streak and perfect weeks')}>
          <select value={st.weekStart} onChange={(e) => set({ weekStart: +e.target.value })}>
            <option value={6}>{t('السبت', 'Saturday')}</option><option value={0}>{t('الأحد', 'Sunday')}</option><option value={1}>{t('الاثنين', 'Monday')}</option>
          </select>
        </Row>
        <Row label={t('الهدف اليومي (بومودورو)', 'Daily goal (pomodoros)')}><input type="number" min={1} max={30} style={{ width: 70 }} value={st.dailyGoal} onChange={(e) => set({ dailyGoal: Math.max(1, +e.target.value || 1) })} /></Row>
        <Row label={t('هدف الأسبوع (بومودورو)', 'Weekly goal (pomodoros)')}><input type="number" min={1} max={200} style={{ width: 70 }} value={st.weeklyGoal} onChange={(e) => set({ weeklyGoal: Math.max(1, +e.target.value || 1) })} /></Row>
        <Row label={t('تبديل تلقائي بين التركيز والاستراحة', 'Auto switch between focus and break')}><Toggle on={st.autoSwitch} set={(v) => set({ autoSwitch: v })} /></Row>
      </Card>

      <PresetEditor />

      <Card>
        <h2>{t('الإشعارات', 'Notifications')}</h2>
        <Row label={t('صوتية', 'Sound')}><Toggle on={st.notifSound} set={(v) => set({ notifSound: v })} /></Row>
        <Row label={t('بصرية (داخل البرنامج + وميض النافذة)', 'Visual (in-app + window flash)')}><Toggle on={st.notifVisual} set={(v) => set({ notifVisual: v })} /></Row>
        <Row label={t('إشعارات النظام (OS)', 'System (OS) notifications')}><Toggle on={st.notifOS} set={(v) => { set({ notifOS: v }); if (v && 'Notification' in window) void Notification.requestPermission() }} /></Row>
      </Card>

      <Card>
        <h2>{t('ميزات ذكية', 'Smart features')}</h2>
        <Row label={t('تذكير بشرب المياه', 'Water reminder')}>
          <Toggle on={st.waterOn} set={(v) => set({ waterOn: v })} />
          <input type="number" min={5} max={180} style={{ width: 70 }} value={st.waterEvery} onChange={(e) => set({ waterEvery: Math.max(5, +e.target.value || 45) })} /><span className="small muted">{t('دقيقة', 'min')}</span>
        </Row>
        <Row label={t('اقتراحات الاستراحة (إطالة / تنفس / حركة)', 'Break suggestions (stretch / breathing / movement)')}><Toggle on={st.breakTips} set={(v) => set({ breakTips: v })} /></Row>
        <Row label={t('عبارات تحفيزية', 'Motivational quotes')}>
          <Toggle on={st.quotesOn} set={(v) => set({ quotesOn: v })} />
          <input type="number" min={5} max={600} style={{ width: 70 }} value={st.quoteEvery} onChange={(e) => set({ quoteEvery: Math.max(5, +e.target.value || 60) })} /><span className="small muted">{t('ثانية لكل عبارة', 'sec each')}</span>
        </Row>
        <h3 style={{ marginTop: 14 }}>{t('تذكيراتي بأهدافي', 'My goal reminders')}</h3>
        <div className="grid" style={{ gap: 8 }}>
          {reminders.map((r) => (
            <div className="row" key={r.id}>
              <Toggle on={r.enabled} set={(v) => setRem(r.id, { enabled: v })} />
              <input type="text" style={{ flex: 1, minWidth: 180 }} value={r.text} placeholder={t('اكتب هدفك أو تذكيرك…', 'Write your goal or reminder…')} onChange={(e) => setRem(r.id, { text: e.target.value })} />
              <input type="number" min={3} max={3600} style={{ width: 70 }} value={r.seconds} onChange={(e) => setRem(r.id, { seconds: Math.max(3, +e.target.value || 30) })} /><span className="small muted">{t('ث', 's')}</span>
              <button className="btn sm danger" onClick={() => set({ reminders: reminders.filter((x) => x.id !== r.id) })}>{t('حذف', 'Delete')}</button>
            </div>
          ))}
          <div><button className="btn" onClick={() => set({ reminders: [...reminders, { id: uid(), text: '', seconds: 30, enabled: true }] })}>{t('أضف تذكير', 'Add reminder')}</button></div>
        </div>
      </Card>

      <Card>
        <h2>{t('المظهر', 'Appearance')}</h2>
        <div className="grid g4" style={{ marginBottom: 12 }}>
          {[...Object.entries(THEMES).map(([id, d]) => ({ id, name: st.lang === 'ar' ? d.ar : d.en, v: d.v })), ...st.customThemes.map((c) => ({ id: c.id, name: '' + c.name, v: c.v }))].map((x) => (
            <div key={x.id} className={`theme ${st.theme === x.id ? 'on' : ''}`} onClick={() => set({ theme: x.id })}>
              <div className="sw">{[x.v.bg, x.v.surface, x.v.accent, x.v.work, x.v.short, x.v.long].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
              <div className="row"><b className="small">{x.name}</b><span className="sp" />{x.id.startsWith('c-') && <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); set({ customThemes: st.customThemes.filter((c) => c.id !== x.id), theme: st.theme === x.id ? 'dark' : st.theme }) }}>{t('حذف', 'Delete')}</button>}</div>
            </div>
          ))}
        </div>
        <Row label={t('الخط', 'Font')}>
          <select value={FONTS.includes(st.font) ? st.font : ''} onChange={(e) => e.target.value && set({ font: e.target.value })}>
            {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}{!FONTS.includes(st.font) && <option value="">{st.font}</option>}
          </select>
        </Row>
        <Row label={t('حجم التايمر', 'Timer size')}><Slider min={0.6} max={1.6} step={0.05} value={st.timerScale} set={(v) => set({ timerScale: v })} /><span className="small muted">{Math.round(st.timerScale * 100)}%</span></Row>
        <Row label={t('مكان السايد بار', 'Sidebar position')}>
          <button className={`chip ${st.sidebarSide === 'left' ? 'on' : ''}`} onClick={() => set({ sidebarSide: 'left' })}>{t('يسار', 'Left')}</button>
          <button className={`chip ${st.sidebarSide === 'right' ? 'on' : ''}`} onClick={() => set({ sidebarSide: 'right' })}>{t('يمين', 'Right')}</button>
        </Row>
        <Row label={t('مكان التايمر', 'Timer layout')}>
          <button className={`chip ${st.timerLayout === 'center' ? 'on' : ''}`} onClick={() => set({ timerLayout: 'center' })}>{t('في المنتصف', 'Centered')}</button>
          <button className={`chip ${st.timerLayout === 'side' ? 'on' : ''}`} onClick={() => set({ timerLayout: 'side' })}>{t('على الجانب', 'Side')}</button>
        </Row>
        <Row label={t('صورة خلفية مخصصة', 'Custom background image')} hint={t('المقاس المفضل: 1920×1080 (16:9) أو أكبر وبالعرض، JPG أو PNG. البرنامج بيصغّرها تلقائياً لحد 1920 بكسل.', 'Preferred size: 1920×1080 (16:9) or larger, landscape, JPG or PNG. It is downscaled automatically to 1920 px.')}>
          <label className="btn" style={{ cursor: 'pointer' }}>{st.bgImage ? t('تغيير الصورة', 'Change image') : t('اختر صورة', 'Choose image')}<input type="file" accept="image/*" hidden onChange={(e) => { pickBg(e.target.files?.[0]); e.target.value = '' }} /></label>
          {st.bgImage && <button className="btn sm danger" onClick={() => set({ bgImage: null })}>{t('إزالة', 'Remove')}</button>}
        </Row>
        {st.bgImage && (
          <>
            <Row label={t('تعتيم الخلفية', 'Background dimming')}><Slider min={0} max={0.95} value={st.bgDim} set={(v) => set({ bgDim: v })} /></Row>
            <Row label={t('تغبيش الخلفية', 'Background blur')}><Slider min={0} max={20} step={1} value={st.bgBlur} set={(v) => set({ bgBlur: v })} /></Row>
          </>
        )}
        <Row label={t('تقليل الحركة', 'Reduce motion')}><Toggle on={st.reduceMotion} set={(v) => set({ reduceMotion: v })} /></Row>
      </Card>

      <ThemeEditor />

      <Card>
        <h2>{t('النافذة', 'Window')}</h2>
        <Row label={t('النافذة المصغّرة (Compact)', 'Compact window')} hint={t('تايمر صغير فقط — ترجع للكبيرة بزرار تكبير', 'Tiny timer only — expand with the Expand button')}>
          <button className="btn" onClick={() => s.setCompact(true)}>{t('تصغير', 'Go compact')}</button>
        </Row>
        <Row label={t('فوق كل البرامج الأخرى (في الوضع المصغّر)', 'Always on top of other programs (compact mode)')} hint={t('بيخلي التايمر الصغير ظاهر دايماً فوق أي برنامج تاني بتشتغل عليه', 'Keeps the small timer visible above any other program you are using')}><Toggle on={st.alwaysOnTop} set={(v) => set({ alwaysOnTop: v })} /></Row>
      </Card>

      <Card>
        <h2>{t('البيانات', 'Data')}</h2>
        <div className="row">
          <button className="btn" onClick={exportData}>{t('تصدير نسخة احتياطية', 'Export backup')}</button>
          <label className="btn" style={{ cursor: 'pointer' }}>{t('استيراد', 'Import')}<input type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} /></label>
          <button className="btn danger" onClick={() => confirm(t('مسح كل المهام والجلسات؟', 'Delete all tasks and sessions?')) && s.resetData()}>{t('مسح كل البيانات', 'Erase all data')}</button>
          {msg && <span className="small">{msg}</span>}
        </div>
        <div className="small muted" style={{ marginTop: 10 }}>{t('قريباً: الربط مع Notion، وزرار تبرع (Donate)، ونسخ Linux وmacOS.', 'Planned: Notion integration, a donate button, Linux and macOS builds.')}</div>
      </Card>
    </>
  )
}
