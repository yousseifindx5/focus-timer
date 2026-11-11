import type { CustomTheme, Settings, ThemeVars } from './types'

const T = (bg: string, surface: string, text: string, accent: string, work: string, short: string, long: string, dark: boolean): ThemeVars =>
  ({ bg, surface, text, accent, work, short, long, dark })

export interface ThemeDef {
  ar: string
  en: string
  v: ThemeVars
  grad?: string
}

export const THEMES: Record<string, ThemeDef> = {
  light: { ar: 'فاتح', en: 'Light', v: T('#f4f5f7', '#ffffff', '#1d2330', '#4f46e5', '#ef4444', '#10b981', '#3b82f6', false) },
  dark: { ar: 'داكن', en: 'Dark', v: T('#0f1115', '#181b21', '#e8eaee', '#818cf8', '#f87171', '#34d399', '#60a5fa', true) },
  sand: { ar: 'رملي', en: 'Sand', v: T('#f3ead8', '#fbf5e8', '#3b3226', '#b7791f', '#c2410c', '#65a30d', '#0f766e', false) },
  midnight: { ar: 'منتصف الليل', en: 'Midnight', v: T('#070b1a', '#0e1530', '#dbe4ff', '#6d8bff', '#ff6b8b', '#4ade80', '#38bdf8', true) },
  colorful: { ar: 'ملوّن', en: 'Colorful', v: T('#fff7fb', '#ffffff', '#2b1b3d', '#ec4899', '#f43f5e', '#22c55e', '#3b82f6', false), grad: 'linear-gradient(135deg,#ffe0f0,#e0efff 50%,#e6ffe0)' },
  forest: { ar: 'غابة', en: 'Forest', v: T('#0f1f16', '#162a1e', '#dff5e3', '#4ade80', '#fb923c', '#a3e635', '#2dd4bf', true) },
  ocean: { ar: 'محيط', en: 'Ocean', v: T('#08202e', '#0d2f42', '#dff3ff', '#22d3ee', '#fb7185', '#34d399', '#60a5fa', true), grad: 'linear-gradient(160deg,#06202e,#0a3a55)' },
  sunset: { ar: 'غروب', en: 'Sunset', v: T('#2a1233', '#3a1a45', '#ffe9dc', '#ff8a4c', '#ff5d73', '#ffd166', '#c084fc', true), grad: 'linear-gradient(160deg,#3a1247,#7a2a4a 60%,#c2543a)' },
  monochrome: { ar: 'أحادي اللون', en: 'Monochrome', v: T('#111111', '#1b1b1b', '#f2f2f2', '#ffffff', '#e5e5e5', '#a3a3a3', '#737373', true) },
  cyberpunk: { ar: 'سايبربانك', en: 'Cyberpunk', v: T('#0b0614', '#140a24', '#f4e9ff', '#ff2bd6', '#ff2bd6', '#00f0ff', '#fcee09', true), grad: 'linear-gradient(135deg,#0b0614,#1a0838 60%,#08202e)' },
  rose: { ar: 'وردي', en: 'Rose', v: T('#fff1f3', '#ffffff', '#3a1f26', '#e11d48', '#e11d48', '#16a34a', '#2563eb', false) },
  lavender: { ar: 'لافندر', en: 'Lavender', v: T('#f5f2ff', '#ffffff', '#2a2145', '#7c3aed', '#db2777', '#0d9488', '#6366f1', false) },
  nord: { ar: 'نورد', en: 'Nord', v: T('#2e3440', '#3b4252', '#eceff4', '#88c0d0', '#bf616a', '#a3be8c', '#81a1c1', true) },
  coffee: { ar: 'قهوة', en: 'Coffee', v: T('#1c1410', '#2a1f18', '#f1e6da', '#d9a066', '#e07a5f', '#9cc5a1', '#8ab4c9', true) },
}

export const FONTS = ['Segoe UI', 'Tahoma', 'Arial', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Consolas', 'Cairo', 'Tajawal', 'system-ui']

export function resolveTheme(s: Settings): { v: ThemeVars; grad?: string; font?: string } {
  const c = s.customThemes.find((x: CustomTheme) => x.id === s.theme)
  if (c) return { v: c.v, font: c.font }
  const t = THEMES[s.theme] ?? THEMES.dark
  return { v: t.v, grad: t.grad }
}

export function applyTheme(s: Settings) {
  const { v, grad, font } = resolveTheme(s)
  const r = document.documentElement.style
  r.setProperty('--bg', v.bg)
  r.setProperty('--surface', v.surface)
  r.setProperty('--surface2', `color-mix(in srgb, ${v.surface} 88%, ${v.text})`)
  r.setProperty('--text', v.text)
  r.setProperty('--muted', `color-mix(in srgb, ${v.text} 55%, ${v.bg})`)
  r.setProperty('--border', `color-mix(in srgb, ${v.surface} 82%, ${v.text})`)
  r.setProperty('--accent', v.accent)
  r.setProperty('--work', v.work)
  r.setProperty('--short', v.short)
  r.setProperty('--long', v.long)
  r.setProperty('--bggrad', grad ?? 'none')
  r.setProperty('--font', `${font || s.font}, 'Segoe UI', Tahoma, system-ui, sans-serif`)
  r.setProperty('colorScheme', v.dark ? 'dark' : 'light')
  document.documentElement.classList.toggle('reduce-motion', s.reduceMotion)
}

/* random theme generator */
function hsl(h: number, s: number, l: number) {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const x = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, '0')
  return `#${x(0)}${x(8)}${x(4)}`
}
export function randomThemeVars(): ThemeVars {
  const h = Math.floor(Math.random() * 360)
  const dark = Math.random() < 0.6
  return {
    dark,
    bg: hsl(h, 25, dark ? 9 : 95),
    surface: hsl(h, 22, dark ? 14 : 100),
    text: hsl(h, 20, dark ? 92 : 14),
    accent: hsl((h + 40) % 360, 75, dark ? 65 : 48),
    work: hsl((h + 180) % 360, 75, dark ? 65 : 50),
    short: hsl((h + 110) % 360, 60, dark ? 58 : 40),
    long: hsl((h + 250) % 360, 70, dark ? 66 : 52),
  }
}
