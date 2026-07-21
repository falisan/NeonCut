export function secToClock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`
}

export function clockToSec(clock: string): number | null {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/)
  if (!m) return null
  const [, h, mi, s] = m
  return Number(h) * 3600 + Number(mi) * 60 + Number(s)
}
