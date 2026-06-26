interface Props {
  icon: string
  label: string
  value: string
  sub?: string
  percent?: number // 0-100 for the mini meter
}

export function StatCard({ icon, label, value, sub, percent }: Props): JSX.Element {
  const meterColor =
    percent === undefined
      ? '#22d3ee'
      : percent >= 85
        ? '#f87171'
        : percent >= 65
          ? '#f59e0b'
          : '#22d3ee'
  return (
    <div className="stat-card">
      <div className="stat-head">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {percent !== undefined && (
        <div className="stat-meter">
          <div
            className="stat-meter-fill"
            style={{ width: `${Math.min(100, percent)}%`, background: meterColor }}
          />
        </div>
      )}
    </div>
  )
}
