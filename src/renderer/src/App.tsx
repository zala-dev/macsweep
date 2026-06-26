import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CategoryResult,
  CleanPreview,
  CleanResult,
  RemoteProfile,
  SystemStats,
  TargetRef
} from '../../shared/types'
import { TopBar } from './components/TopBar'
import { ScoreRing } from './components/ScoreRing'
import { StatCard } from './components/StatCard'
import { CategoryCard } from './components/CategoryCard'
import { ConfirmModal } from './components/ConfirmModal'
import { RemoteModal } from './components/RemoteModal'
import { formatBytes } from './util/format'

const api = window.macsweep

export default function App(): JSX.Element {
  const [target, setTarget] = useState<TargetRef>({ kind: 'local' })
  const [profiles, setProfiles] = useState<RemoteProfile[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [categories, setCategories] = useState<CategoryResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [connected, setConnected] = useState(false)
  const [hostname, setHostname] = useState<string | undefined>()
  const [connError, setConnError] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState<CategoryResult | null>(null)
  const [preview, setPreview] = useState<CleanPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null)

  const [remoteOpen, setRemoteOpen] = useState(false)
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadProfiles = useCallback(async () => {
    setProfiles(await api.listProfiles())
  }, [])

  const refreshStats = useCallback(
    async (t: TargetRef) => {
      try {
        const s = await api.getStats(t)
        setStats(s)
        setHostname(s.hostname)
        setConnected(true)
        setConnError(null)
      } catch (e) {
        setConnected(false)
        setConnError(e instanceof Error ? e.message : String(e))
      }
    },
    []
  )

  const runScan = useCallback(async (t: TargetRef) => {
    setScanning(true)
    try {
      const results = await api.scanAll(t)
      setCategories(results)
    } catch (e) {
      setConnError(e instanceof Error ? e.message : String(e))
    } finally {
      setScanning(false)
    }
  }, [])

  // On mount: load saved remote profiles.
  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Whenever the selected target changes: connect, pull stats, scan, and start
  // a periodic stats refresh.
  useEffect(() => {
    setStats(null)
    setCategories([])
    setConnected(false)
    refreshStats(target).then(() => runScan(target))

    if (statsTimer.current) clearInterval(statsTimer.current)
    statsTimer.current = setInterval(() => refreshStats(target), 5000)
    return () => {
      if (statsTimer.current) clearInterval(statsTimer.current)
    }
  }, [target, refreshStats, runScan])

  const openClean = useCallback(
    async (category: CategoryResult) => {
      setActiveCategory(category)
      setPreview(null)
      setCleanResult(null)
      setPreviewLoading(true)
      try {
        // Dry-run preview is the default before touching anything.
        const p = await api.buildPreview(target, category.id)
        setPreview(p)
      } finally {
        setPreviewLoading(false)
      }
    },
    [target]
  )

  const confirmClean = useCallback(
    async (permanent: boolean) => {
      if (!activeCategory) return
      const result = await api.clean({
        target,
        categoryId: activeCategory.id,
        dryRun: false,
        permanent
      })
      setCleanResult(result)
      // Refresh stats + the cleaned category afterwards.
      refreshStats(target)
      runScan(target)
    },
    [activeCategory, target, refreshStats, runScan]
  )

  const closeModal = useCallback(() => {
    setActiveCategory(null)
    setPreview(null)
    setCleanResult(null)
  }, [])

  const totalReclaimable = categories
    .filter((c) => !c.locked)
    .reduce((sum, c) => sum + c.totalSize, 0)

  return (
    <div className="app">
      <TopBar
        profiles={profiles}
        target={target}
        connected={connected}
        hostname={hostname}
        scanning={scanning}
        onSelectTarget={setTarget}
        onManageRemotes={() => setRemoteOpen(true)}
        onRescan={() => runScan(target)}
      />

      <main className="content">
        {connError && !connected && (
          <div className="conn-error-banner">
            ⚠ Couldn’t reach this target: {connError}
          </div>
        )}

        <section className="dashboard">
          <div className="dash-ring">
            <ScoreRing score={stats?.optimisationScore ?? 0} />
            <div className="reclaim-pill">
              <span className="reclaim-value">{formatBytes(totalReclaimable)}</span>
              <span className="reclaim-label">reclaimable</span>
            </div>
          </div>

          <div className="dash-stats">
            <StatCard
              icon="💾"
              label="Disk"
              value={stats ? `${formatBytes(stats.disk.free)} free` : '—'}
              sub={stats ? `${formatBytes(stats.disk.used)} of ${formatBytes(stats.disk.total)} used` : ''}
              percent={stats?.disk.usedPercent}
            />
            <StatCard
              icon="🧠"
              label="Memory"
              value={stats ? `${stats.ram.usedPercent}% used` : '—'}
              sub={stats ? `${formatBytes(stats.ram.used)} of ${formatBytes(stats.ram.total)}` : ''}
              percent={stats?.ram.usedPercent}
            />
            <StatCard
              icon="⚙️"
              label="CPU"
              value={stats ? `${stats.cpu.loadPercent}% load` : '—'}
              sub={stats ? `${stats.cpu.cores} cores · load ${stats.cpu.loadAvg1.toFixed(2)}` : ''}
              percent={stats?.cpu.loadPercent}
            />
          </div>
        </section>

        <section className="categories-section">
          <div className="section-head">
            <h2>Cleanup Categories</h2>
            <span className="section-sub">
              {scanning ? 'Scanning…' : `${categories.length} categories scanned`}
            </span>
          </div>

          <div className="category-grid">
            {(categories.length > 0 ? categories : placeholderCards()).map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                scanning={scanning && categories.length === 0}
                onClean={openClean}
              />
            ))}
          </div>
        </section>
      </main>

      {activeCategory && (
        <ConfirmModal
          category={activeCategory}
          preview={preview}
          loading={previewLoading}
          result={cleanResult}
          onConfirm={confirmClean}
          onClose={closeModal}
        />
      )}

      {remoteOpen && (
        <RemoteModal
          profiles={profiles}
          onAdd={async (input) => {
            await api.addProfile(input)
            await loadProfiles()
          }}
          onRemove={async (id) => {
            await api.removeProfile(id)
            await loadProfiles()
            if (target.kind === 'remote' && target.profileId === id) setTarget({ kind: 'local' })
          }}
          onTest={async (profileId) => {
            const status = await api.testConnection({ kind: 'remote', profileId })
            return {
              ok: status.connected,
              message: status.connected ? `Connected to ${status.hostname}` : status.error ?? 'Failed'
            }
          }}
          onClose={() => setRemoteOpen(false)}
        />
      )}
    </div>
  )
}

// Skeleton cards shown before the first scan completes.
function placeholderCards(): CategoryResult[] {
  const ids = [
    ['system-caches', 'System Caches', '🗄️'],
    ['app-caches', 'Application Caches', '📦'],
    ['logs', 'Logs', '📝'],
    ['trash', 'Trash', '🗑️'],
    ['downloads', 'Large Downloads', '⬇️'],
    ['dmgs', 'Unused DMGs', '💿'],
    ['xcode-derived', 'Xcode Derived Data', '🔨'],
    ['homebrew-cache', 'Homebrew Cache', '🍺'],
    ['npm-cache', 'npm Cache', '📕'],
    ['pip-cache', 'pip Cache', '🐍'],
    ['keychains', 'Keychains & Credentials', '🔐'],
    ['ssh-keys', 'SSH & GPG Keys', '🗝️']
  ]
  return ids.map(([id, name, icon]) => ({
    id,
    name,
    icon,
    description: 'Scanning…',
    locked: id === 'keychains' || id === 'ssh-keys',
    lockReason: 'Permanently protected.',
    reviewOnly: id === 'downloads',
    reviewReason: 'Your personal files — review manually.',
    totalSize: 0,
    fileCount: 0,
    preview: []
  }))
}
