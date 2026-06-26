import { useState } from 'react'
import type { RemoteProfile } from '../../../shared/types'

interface Props {
  profiles: RemoteProfile[]
  onAdd: (input: Omit<RemoteProfile, 'id' | 'createdAt'>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onTest: (profileId: string) => Promise<{ ok: boolean; message: string }>
  onClose: () => void
}

export function RemoteModal({ profiles, onAdd, onRemove, onTest, onClose }: Props): JSX.Element {
  const [label, setLabel] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [privateKeyPath, setPrivateKeyPath] = useState('~/.ssh/id_ed25519')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testState, setTestState] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    if (!host || !username || !privateKeyPath) {
      setError('Host, username and SSH key path are required.')
      return
    }
    setBusy(true)
    try {
      await onAdd({
        label: label || host,
        host,
        port: Number(port) || 22,
        username,
        privateKeyPath
      })
      setLabel('')
      setHost('')
      setUsername('')
      setPort('22')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal remote-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-icon">🖥️</span>
          <div>
            <h2>Remote Macs</h2>
            <p className="modal-sub">Connect over SSH / Tailscale — key auth only, no passwords.</p>
          </div>
          <button className="modal-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {profiles.length > 0 && (
            <div className="profile-list">
              {profiles.map((p) => (
                <div className="profile-row" key={p.id}>
                  <div className="profile-info">
                    <span className="profile-label">{p.label}</span>
                    <span className="profile-detail">
                      {p.username}@{p.host}:{p.port}
                    </span>
                    {testState[p.id] && (
                      <span className="profile-test">{testState[p.id]}</span>
                    )}
                  </div>
                  <div className="profile-actions">
                    <button
                      className="mini-btn"
                      onClick={async () => {
                        setTestState((s) => ({ ...s, [p.id]: 'Testing…' }))
                        const r = await onTest(p.id)
                        setTestState((s) => ({
                          ...s,
                          [p.id]: r.ok ? `✓ ${r.message}` : `✗ ${r.message}`
                        }))
                      }}
                    >
                      Test
                    </button>
                    <button className="mini-btn danger" onClick={() => onRemove(p.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="remote-form" onSubmit={submit}>
            <h3>Add a Mac</h3>
            <div className="form-grid">
              <label>
                Label
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Studio Mac" />
              </label>
              <label>
                Host / Tailscale name
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="100.x.y.z or mac.tailnet.ts.net"
                />
              </label>
              <label>
                Port
                <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="22" />
              </label>
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="zala"
                />
              </label>
              <label className="full">
                SSH private key path
                <input
                  value={privateKeyPath}
                  onChange={(e) => setPrivateKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_ed25519"
                />
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="confirm-btn" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
