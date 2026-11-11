import type { HTMLAttributes, ReactNode } from 'react'

export const Card = ({ className = '', ...r }: HTMLAttributes<HTMLDivElement>) => <div className={`card ${className}`} {...r} />

export function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="track" />
      {label && <span>{label}</span>}
    </label>
  )
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="setrow">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
      <div className="row">{children}</div>
    </div>
  )
}

export function Slider({ value, min = 0, max = 1, step = 0.01, set, w = 160 }: { value: number; min?: number; max?: number; step?: number; set: (v: number) => void; w?: number | string }) {
  return <input type="range" style={{ width: w }} min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} />
}

export function Bars({ data, height = 150, fmt, color }: { data: { label: string; value: number; hi?: boolean; color?: string }[]; height?: number; fmt?: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const showVal = data.length <= 12
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-val">{showVal && d.value > 0 ? (fmt ? fmt(d.value) : d.value) : ''}</div>
          <div className="bar-area">
            <div className="bar" style={{ height: `${(d.value / max) * 100}%`, background: d.color ?? color, opacity: d.hi === false ? 0.55 : 1 }} />
          </div>
          <div className="bar-lab">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Line chart with a peak label and start/end labels so it can be read without guessing */
export function Spark({ values, h = 90, peak, startLabel, endLabel }: { values: number[]; h?: number; peak?: string; startLabel?: string; endLabel?: string }) {
  if (values.length < 2) return <div className="muted small">-</div>
  const max = Math.max(1, ...values)
  const w = 300
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 6 - (v / max) * (h - 14)}`).join(' ')
  return (
    <div>
      {peak && <div className="small muted" style={{ marginBottom: 4 }}>{peak}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1="0" y1={h - 1} x2={w} y2={h - 1} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill="color-mix(in srgb,var(--accent) 18%,transparent)" stroke="none" />
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row small muted" dir="ltr" style={{ marginTop: 4 }}><span>{startLabel}</span><span className="sp" /><span>{endLabel}</span></div>
    </div>
  )
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="5" />
      <path d="M32 14 A18 18 0 1 1 14 32" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 32 V23 M32 32 L38 36" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export const Progress = ({ value, color }: { value: number; color?: string }) => (
  <div className="bar-line">
    <div style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
  </div>
)

export function Ring({ size, frac, color, running, children }: { size: number; frac: number; color: string; running?: boolean; children?: ReactNode }) {
  const sw = Math.max(8, size * 0.04)
  const r = size / 2 - sw
  const c = 2 * Math.PI * r
  return (
    <div className={`ring ${running ? 'run' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface2)" strokeWidth={sw} fill="none" />
        <circle className="arc" cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  )
}
