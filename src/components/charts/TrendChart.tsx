import { fromKey, monthName } from '../../lib/date'
import { rollingMean } from '../../lib/stats'
import { ChartHost, ChartTooltip, pct, useTooltip } from './chartkit'

interface TrendChartProps {
  dates: string[]
  /** Share of that day finished, 0-1, one per date. */
  series: number[]
  /** Habit hue for a single-habit chart; omitted means an all-habits chart in ink. */
  hue?: string
}

const H = 100
const W = 600
const PAD_TOP = 10
const PAD_BOTTOM = 18
const MEAN_WINDOW = 7

/**
 * Daily completion, with a seven-day mean laid over it.
 *
 * The bars alone are too noisy to read a direction from - one missed Tuesday
 * looks like a collapse. The mean is the line people actually want, and the bars
 * stay so a specific bad day is still findable.
 */
export function TrendChart({ dates, series, hue }: TrendChartProps) {
  const { tip, show, hide } = useTooltip()
  const paint = hue ?? 'var(--ink)'
  const plotH = H - PAD_TOP - PAD_BOTTOM

  const gap = dates.length > 120 ? 0.5 : 2
  const slot = W / dates.length
  const barW = Math.max(1, slot - gap)

  const mean = rollingMean(series, Math.min(MEAN_WINDOW, dates.length))
  const y = (share: number) => PAD_TOP + plotH - share * plotH

  // A single polyline, broken where the mean has no value yet.
  const meanPath = mean
    .map((m, i) => (m === null ? null : `${i * slot + slot / 2},${y(m)}`))
    .filter(Boolean)
    .join(' ')

  const first = fromKey(dates[0])
  const mid = fromKey(dates[Math.floor(dates.length / 2)])

  return (
    <ChartHost>
      <svg
        className="trend"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Daily completion across the last ${dates.length} days, with a ${MEAN_WINDOW}-day average`}
        onMouseLeave={hide}
      >
        {/* Recessive grid: a midpoint and a baseline, nothing more. */}
        <line x1="0" y1={y(0.5)} x2={W} y2={y(0.5)} stroke="var(--line)" strokeWidth="1"
          strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={y(0)} x2={W} y2={y(0)} stroke="var(--line-strong)" strokeWidth="1"
          vectorEffect="non-scaling-stroke" />

        {series.map((share, i) => {
          const h = share > 0 ? Math.max(2, share * plotH) : 1.5
          return (
            <rect
              key={dates[i]}
              x={i * slot + gap / 2}
              y={y(0) - h}
              width={barW}
              height={h}
              rx={Math.min(2, barW / 2)}
              fill={share > 0 ? paint : 'var(--miss)'}
              opacity={share > 0 ? 0.3 + share * 0.7 : 1}
            />
          )
        })}

        {meanPath && (
          <polyline
            points={meanPath}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Full-height hit targets: the bars are far too thin to aim at. */}
        {dates.map((date, i) => (
          <rect
            key={`hit-${date}`}
            x={i * slot}
            y={0}
            width={slot}
            height={H}
            fill="transparent"
            onMouseMove={(e) =>
              show(
                e,
                <>
                  <strong>
                    {fromKey(date).getDate()} {monthName(fromKey(date).getMonth())}
                  </strong>
                  <span>{pct(series[i])} finished</span>
                  {mean[i] !== null && <span className="muted">{pct(mean[i]!)} on average</span>}
                </>,
              )
            }
          >
            <title>{`${date}: ${pct(series[i])}`}</title>
          </rect>
        ))}
      </svg>

      <div className="axis-row">
        <span className="mono">
          {first.getDate()} {monthName(first.getMonth())}
        </span>
        <span className="mono">
          {mid.getDate()} {monthName(mid.getMonth())}
        </span>
        <span className="mono">Today</span>
      </div>
      <ChartTooltip tip={tip} />
    </ChartHost>
  )
}
