// All sounds are synthesized with WebAudio, so the app needs no audio files.
let ctx: AudioContext | null = null
let ambBus: GainNode
let sfxBus: GainNode

function ac() {
  if (!ctx) {
    ctx = new AudioContext()
    ambBus = ctx.createGain()
    sfxBus = ctx.createGain()
    ambBus.connect(ctx.destination)
    sfxBus.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/* ---------- noise ---------- */
const bufCache: Record<string, AudioBuffer> = {}
function noise(kind: 'white' | 'pink' | 'brown') {
  const c = ac()
  if (bufCache[kind]) return bufCache[kind]
  const len = c.sampleRate * 4
  const b = c.createBuffer(1, len, c.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w
    else if (kind === 'brown') {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else {
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return (bufCache[kind] = b)
}
function loopNoise(kind: 'white' | 'pink' | 'brown') {
  const c = ac()
  const s = c.createBufferSource()
  s.buffer = noise(kind)
  s.loop = true
  s.start()
  return s
}
function lfo(freq: number, depth: number, target: AudioParam) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.value = freq
  g.gain.value = depth
  o.connect(g).connect(target)
  o.start()
  return o
}

/* ---------- ambient sounds ---------- */
type Builder = (out: AudioNode) => () => void
export interface AmbientDef {
  id: string
  ar: string
  en: string
  build: Builder
}

const filt = (type: BiquadFilterType, f: number, q = 0.7) => {
  const x = ac().createBiquadFilter()
  x.type = type
  x.frequency.value = f
  x.Q.value = q
  return x
}

export const AMBIENT: AmbientDef[] = [
  { id: 'rain', ar: 'مطر', en: 'Rain', build: (out) => {
    const s = loopNoise('white')
    s.connect(filt('highpass', 700)).connect(filt('lowpass', 7500)).connect(out)
    return () => s.stop()
  } },
  { id: 'ocean', ar: 'أمواج', en: 'Ocean', build: (out) => {
    const c = ac()
    const s = loopNoise('brown')
    const g = c.createGain()
    g.gain.value = 0.55
    const l = lfo(0.11, 0.4, g.gain)
    s.connect(filt('lowpass', 1000)).connect(g).connect(out)
    return () => { s.stop(); l.stop() }
  } },
  { id: 'wind', ar: 'رياح', en: 'Wind', build: (out) => {
    const s = loopNoise('pink')
    const f = filt('bandpass', 500, 0.9)
    const l = lfo(0.07, 280, f.frequency)
    s.connect(f).connect(out)
    return () => { s.stop(); l.stop() }
  } },
  { id: 'fire', ar: 'مدفأة', en: 'Fireplace', build: (out) => {
    const c = ac()
    const s = loopNoise('brown')
    s.connect(filt('lowpass', 420)).connect(out)
    const t = setInterval(() => {
      if (Math.random() > 0.4) return
      const n = c.createBufferSource()
      n.buffer = noise('white')
      const g = c.createGain()
      g.gain.setValueAtTime(0.5 + Math.random() * 0.6, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04 + Math.random() * 0.05)
      n.connect(filt('highpass', 1500)).connect(g).connect(out)
      n.start(c.currentTime, Math.random() * 3, 0.12)
    }, 110)
    return () => { s.stop(); clearInterval(t) }
  } },
  { id: 'birds', ar: 'طيور', en: 'Birds', build: (out) => {
    const c = ac()
    const t = setInterval(() => {
      if (Math.random() > 0.55) return
      const reps = 2 + Math.floor(Math.random() * 3)
      const base = 2400 + Math.random() * 1800
      for (let i = 0; i < reps; i++) {
        const o = c.createOscillator()
        const g = c.createGain()
        const st = c.currentTime + i * 0.13
        o.frequency.setValueAtTime(base, st)
        o.frequency.exponentialRampToValueAtTime(base * 1.5, st + 0.08)
        g.gain.setValueAtTime(0, st)
        g.gain.linearRampToValueAtTime(0.18, st + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.1)
        o.connect(g).connect(out)
        o.start(st)
        o.stop(st + 0.12)
      }
    }, 1500)
    return () => clearInterval(t)
  } },
  { id: 'white', ar: 'ضوضاء بيضاء', en: 'White noise', build: (out) => {
    const s = loopNoise('white')
    s.connect(filt('lowpass', 9000)).connect(out)
    return () => s.stop()
  } },
  { id: 'pink', ar: 'ضوضاء وردية', en: 'Pink noise', build: (out) => {
    const s = loopNoise('pink')
    s.connect(out)
    return () => s.stop()
  } },
  { id: 'brown', ar: 'ضوضاء بنية', en: 'Brown noise', build: (out) => {
    const s = loopNoise('brown')
    s.connect(out)
    return () => s.stop()
  } },
  { id: 'pad', ar: 'أجواء هادئة', en: 'Calm pad', build: (out) => {
    const c = ac()
    const g = c.createGain()
    g.gain.value = 0.25
    const l = lfo(0.08, 0.12, g.gain)
    const f = filt('lowpass', 900)
    g.connect(f).connect(out)
    const oscs = [110, 164.81, 220, 329.63, 392].map((fr, i) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = fr
      o.detune.value = (i - 2) * 4
      o.connect(g)
      o.start()
      return o
    })
    return () => { oscs.forEach((o) => o.stop()); l.stop() }
  } },
]

const running = new Map<string, { gain: GainNode; stop: () => void }>()

/** active: id -> volume (0..1). Starts/stops/fades sounds so that they match. */
export function setAmbient(active: Record<string, number>, master: number) {
  const c = ac()
  ambBus.gain.setTargetAtTime(master, c.currentTime, 0.05)
  for (const [id, r] of [...running]) {
    if (!(id in active)) {
      r.gain.gain.setTargetAtTime(0, c.currentTime, 0.15)
      setTimeout(() => { r.stop(); r.gain.disconnect() }, 700)
      running.delete(id)
    }
  }
  for (const [id, vol] of Object.entries(active)) {
    const r = running.get(id)
    if (r) r.gain.gain.setTargetAtTime(vol, c.currentTime, 0.05)
    else {
      const def = AMBIENT.find((a) => a.id === id)
      if (!def) continue
      const g = c.createGain()
      g.gain.value = 0
      g.connect(ambBus)
      const stop = def.build(g)
      g.gain.setTargetAtTime(vol, c.currentTime, 0.4)
      running.set(id, { gain: g, stop })
    }
  }
}
export const stopAllAmbient = () => { if (ctx) setAmbient({}, 0) }

/* ---------- SFX ---------- */
export type SfxName = 'click' | 'start' | 'pause' | 'reset' | 'focusEnd' | 'breakEnd' | 'badge' | 'water'

function tone(f: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.4, f2?: number) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime + at
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(sfxBus)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export function setSfxVolume(v: number) { ac(); sfxBus.gain.value = v }

export function sfx(n: SfxName) {
  switch (n) {
    case 'click': tone(900, 0, 0.05, 'square', 0.12); break
    case 'start': tone(523, 0, 0.14); tone(784, 0.1, 0.22); break
    case 'pause': tone(520, 0, 0.12); tone(390, 0.1, 0.18); break
    case 'reset': tone(400, 0, 0.1, 'triangle'); tone(260, 0.09, 0.16, 'triangle'); break
    case 'focusEnd': [523, 659, 784, 1047].forEach((f, i) => { tone(f, i * 0.16, 1.2); tone(f * 2, i * 0.16, 0.8, 'sine', 0.12) }); break
    case 'breakEnd': tone(392, 0, 0.5); tone(523, 0.3, 0.8); break
    case 'badge': [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.3)); break
    case 'water': tone(420, 0, 0.09, 'sine', 0.35, 900); tone(520, 0.14, 0.09, 'sine', 0.3, 1100); break
  }
}
