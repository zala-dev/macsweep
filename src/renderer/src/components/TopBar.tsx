import type { RemoteProfile, TargetRef } from '../../../shared/types'

interface Props {
  profiles: RemoteProfile[]
  target: TargetRef
  connected: boolean
  hostname?: string
  scanning: boolean
  onSelectTarget: (target: TargetRef) => void
  onManageRemotes: () => void
  onRescan: () => void
}

export function TopBar({
  profiles,
  target,
  connected,
  hostname,
  scanning,
  onSelectTarget,
  onManageRemotes,
  onRescan
}: Props): JSX.Element {
  const value = target.kind === 'local' ? 'local' : `remote:${target.profileId}`

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⚡</span>
        <span className="brand-name">MacSweep</span>
        <span className="brand-by">by ZALA</span>
      </div>

      <div className="topbar-right">
        <div className={`conn-dot ${connected ? 'online' : 'offline'}`} title={hostname} />
        <span className="conn-host">{hostname ?? (connected ? 'Connected' : 'Connecting…')}</span>

        <select
          className="target-select"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'local') onSelectTarget({ kind: 'local' })
            else onSelectTarget({ kind: 'remote', profileId: v.replace('remote:', '') })
          }}
        >
          <option value="local">💻 This Mac</option>
          {profiles.map((p) => (
            <option key={p.id} value={`remote:${p.id}`}>
              🖥️ {p.label}
            </option>
          ))}
        </select>

        <button className="ghost-btn" onClick={onManageRemotes}>
          Remote Macs
        </button>
        <button className="primary-btn" onClick={onRescan} disabled={scanning}>
          {scanning ? 'Scanning…' : '↻ Rescan'}
        </button>
      </div>
    </header>
  )
}
