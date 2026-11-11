import { useStore, useT } from '../store'
import { AMBIENT, sfx, setSfxVolume, type SfxName } from '../audio'
import { Card, Row, Slider, Toggle } from '../ui'

export function SoundsPage() {
  const t = useT()
  const s = useStore()
  const st = s.settings
  const set = s.setSettings
  const lang = st.lang
  const toggle = (id: string) => {
    const a = { ...useStore.getState().settings.ambient }
    if (id in a) delete a[id]
    else a[id] = 0.6
    set({ ambient: a })
  }
  const SFX: [SfxName, string][] = [['start', t('بدء', 'Start')], ['pause', t('إيقاف', 'Pause')], ['focusEnd', t('نهاية التركيز', 'Focus end')], ['breakEnd', t('نهاية الاستراحة', 'Break end')], ['badge', t('شارة', 'Badge')], ['water', t('مياه', 'Water')]]
  return (
    <>
      <h1>{t('الأصوات', 'Sounds')}</h1>
      <div className="grid g2">
        <Card>
          <h2>{t('الأصوات المحيطة (Ambient)', 'Ambient sounds')}</h2>
          <Row label={t('تشغيل الأصوات المحيطة', 'Enable ambient')} hint={t('أصوات خلفية هادية (مطر، أمواج، ضوضاء بيضاء…) بتشتغل بصوت واطي وإنت بتشتغل علشان تغطي على الإزعاج وتساعدك تركز. ده المفتاح الرئيسي، واختار الأصوات من تحت.', 'Quiet background sounds (rain, waves, white noise...) that play while you work to mask distractions and help you focus. This is the master switch; choose sounds below.')}><Toggle on={st.ambientOn} set={(v) => set({ ambientOn: v })} /></Row>
          <Row label={t('الصوت', 'Volume')}><Slider value={st.ambientVol} set={(v) => set({ ambientVol: v })} /></Row>
          <Row label={t('تشتغل فقط أثناء عمل التايمر', 'Only while the timer runs')}><Toggle on={st.ambientOnlyRunning} set={(v) => set({ ambientOnlyRunning: v })} /></Row>
        </Card>
        <Card>
          <h2>{t('المؤثرات الصوتية (SFX)', 'Sound effects (SFX)')}</h2>
          <Row label={t('تشغيل المؤثرات', 'Enable SFX')} hint={t('تبدأ/إيقاف/شارات… (منفصلة عن الأصوات المحيطة)', 'start/pause/badges… (independent from ambient)')}><Toggle on={st.sfxOn} set={(v) => set({ sfxOn: v })} /></Row>
          <Row label={t('الصوت', 'Volume')}><Slider value={st.sfxVol} set={(v) => { set({ sfxVol: v }); setSfxVolume(v) }} /></Row>
          <div className="row" style={{ marginTop: 8 }}>{SFX.map(([k, l]) => <button key={k} className="btn sm" onClick={() => { setSfxVolume(st.sfxVol); sfx(k) }}>{l}</button>)}</div>
        </Card>
      </div>
      <Card>
        <h2>{t('اختار صوت (أو أكتر وامزجهم)', 'Pick sounds (mix as many as you like)')}</h2>
        <div className="grid g3">
          {AMBIENT.map((a) => {
            const on = a.id in st.ambient
            return (
              <div key={a.id} className={`theme ${on ? 'on' : ''}`} onClick={() => toggle(a.id)}>
                <div className="row"><b>{lang === 'ar' ? a.ar : a.en}</b><span className="sp" />{on && <span className="tag">{t('شغال', 'On')}</span>}</div>
                {on && <div onClick={(e) => e.stopPropagation()}><Slider w="100%" value={st.ambient[a.id]} set={(v) => set({ ambient: { ...st.ambient, [a.id]: v } })} /></div>}
              </div>
            )
          })}
        </div>
        {!st.ambientOn && <div className="small muted" style={{ marginTop: 8 }}>{t('الأصوات المحيطة مقفولة من الزرار فوق', 'Ambient is switched off above')}</div>}
      </Card>
    </>
  )
}
