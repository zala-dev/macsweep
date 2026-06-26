import { useState } from 'react'
import type { CategoryResult, CleanPreview, CleanResult } from '../../../shared/types'
import { formatBytes, formatCount, shortPath } from '../util/format'

interface Props {
  category: CategoryResult
  preview: CleanPreview | null
  loading: boolean
  result: CleanResult | null
  onConfirm: (permanent: boolean) => void
  onClose: () => void
}

export function ConfirmModal({
  category,
  preview,
  loading,
  result,
  onConfirm,
  onClose
}: Props): JSX.Element {
  const [permanent, setPermanent] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const fileList = preview?.files ?? []
  const shown = fileList.slice(0, 100)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-icon">{category.icon}</span>
          <div>
            <h2>{category.name}</h2>
            <p className="modal-sub">
              {result
                ? result.dryRun
                  ? 'Dry-run preview complete'
                  : 'Cleanup complete'
                : 'Review exactly what will be removed'}
            </p>
          </div>
          <button className="modal-x" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Result view */}
        {result ? (
          <div className="modal-body">
            <div className="result-summary">
              <div className="result-stat">
                <span className="rs-value">{formatBytes(result.reclaimedBytes)}</span>
                <span className="rs-label">{result.dryRun ? 'would reclaim' : 'reclaimed'}</span>
              </div>
              <div className="result-stat">
                <span className="rs-value">{formatCount(result.removed.length)}</span>
                <span className="rs-label">{result.dryRun ? 'would remove' : 'removed'}</span>
              </div>
              {result.blocked.length > 0 && (
                <div className="result-stat">
                  <span className="rs-value blocked">{result.blocked.length}</span>
                  <span className="rs-label">blocked by SafetyGuard</span>
                </div>
              )}
              {result.failed.length > 0 && (
                <div className="result-stat">
                  <span className="rs-value blocked">{result.failed.length}</span>
                  <span className="rs-label">failed</span>
                </div>
              )}
            </div>
            {!result.dryRun && (
              <p className="result-note">
                {permanent
                  ? 'Files were permanently deleted.'
                  : 'Files were moved to the Trash — you can still restore them.'}
              </p>
            )}
            <button className="confirm-btn" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          /* Preview + confirm view */
          <div className="modal-body">
            {loading || !preview ? (
              <div className="modal-loading">Building dry-run preview…</div>
            ) : (
              <>
                <div className="preview-summary">
                  <span>
                    <strong>{formatBytes(preview.totalSize)}</strong> across{' '}
                    <strong>{formatCount(preview.fileCount)}</strong> files
                  </span>
                  {preview.blocked.length > 0 && (
                    <span className="preview-blocked">
                      🛡 {preview.blocked.length} path(s) blocked by SafetyGuard
                    </span>
                  )}
                </div>

                <div className="file-list">
                  {fileList.length === 0 ? (
                    <div className="file-empty">Nothing safe to remove here.</div>
                  ) : (
                    shown.map((f) => (
                      <div className="file-row" key={f.path} title={f.path}>
                        <span className="file-path">{shortPath(f.path)}</span>
                        <span className="file-size">{formatBytes(f.size)}</span>
                      </div>
                    ))
                  )}
                  {fileList.length > shown.length && (
                    <div className="file-more">
                      + {formatCount(fileList.length - shown.length)} more files…
                    </div>
                  )}
                </div>

                <label className="permanent-toggle">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                  />
                  Permanently delete instead of moving to Trash
                </label>

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={onClose} disabled={confirming}>
                    Cancel
                  </button>
                  <button
                    className={`confirm-btn${permanent ? ' danger' : ''}${
                      confirming ? ' loading' : ''
                    }`}
                    disabled={confirming || fileList.length === 0}
                    onClick={() => {
                      // Guard against double-clicks: once confirming, ignore.
                      if (confirming) return
                      setConfirming(true)
                      onConfirm(permanent)
                    }}
                  >
                    {confirming ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        Cleaning…
                      </>
                    ) : permanent ? (
                      `Permanently delete ${formatBytes(preview.totalSize)}`
                    ) : (
                      `Move ${formatBytes(preview.totalSize)} to Trash`
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
