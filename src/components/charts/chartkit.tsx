import { useCallback, useState, type ReactNode } from 'react'

/**
 * Shared chart pieces.
 *
 * Colour rule for every chart in this app: a chart about ONE habit is drawn as a
 * sequential ramp in that habit's own hue, and a chart about ALL habits is drawn
 * in monochrome ink. Nothing plots habits against each other as competing
 * coloured series, so no chart depends on telling palette colours apart - which
 * is what keeps the five-colour limit in lib/colors.ts from ever being load
 * bearing. Where per-habit identity matters, the answer is small multiples: one
 * row per habit, each in its own hue, never overlaid.
 */

/** Steps of a sequential ramp, light to dark, mixed toward the chart surface. */
export function ramp(hue: string, share: number): string {
  if (share <= 0) return 'var(--surface-2)'
  // Floor the mix so the faintest step still separates from the empty cell.
  const pct = Math.round(22 + Math.min(1, share) * 78)
  return `color-mix(in srgb, ${hue} ${pct}%, var(--surface-2))`
}

export interface TooltipState {
  x: number
  y: number
  content: ReactNode
}

/**
 * A hover layer for charts. An SVG chart is interactive by default in this app;
 * a bare `<title>` alone is a fallback, not the experience.
 */
export function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null)

  const show = useCallback((e: { clientX: number; clientY: number; currentTarget: Element }, content: ReactNode) => {
    const host = e.currentTarget.closest('.chart-host')
    if (!host) return
    const box = host.getBoundingClientRect()
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content })
  }, [])

  const hide = useCallback(() => setTip(null), [])

  return { tip, show, hide }
}

export function ChartTooltip({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null
  return (
    <div
      className="chart-tip"
      role="presentation"
      style={{
        left: tip.x,
        top: tip.y,
        // Flip to the left near the right edge so the tip never leaves the panel.
        transform: `translate(${tip.x > 200 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      {tip.content}
    </div>
  )
}

/** Wraps a chart so the tooltip can position against it. */
export function ChartHost({ children }: { children: ReactNode }) {
  return <div className="chart-host">{children}</div>
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}
