import { useEffect, useState } from 'react'

interface Props {
  score: number // 0-100
  size?: number
}

/** Animated circular optimisation-score ring. */
export function ScoreRing({ score, size = 200 }: Props): JSX.Element {
  const [animated, setAnimated] = useState(0)
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    // Ease toward the target score for a smooth count-up + sweep.
    let raf: number
    const start = performance.now()
    const from = animated
    const duration = 900
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimated(from + (score - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  const pct = Math.max(0, Math.min(100, animated))
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 75 ? '#22d3ee' : pct >= 45 ? '#38bdf8' : '#f59e0b'
  const label = pct >= 75 ? 'Healthy' : pct >= 45 ? 'Fair' : 'Needs Attention'

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.45))' }}
        />
      </svg>
      <div className="score-ring-center">
        <div className="score-value" style={{ color }}>
          {Math.round(pct)}
        </div>
        <div className="score-sub">Optimisation</div>
        <div className="score-label" style={{ color }}>
          {label}
        </div>
      </div>
    </div>
  )
}
