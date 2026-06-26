import type { CategoryResult } from '../../../shared/types'
import { formatBytes, formatCount } from '../util/format'

interface Props {
  category: CategoryResult
  scanning: boolean
  onClean: (category: CategoryResult) => void
}

export function CategoryCard({ category, scanning, onClean }: Props): JSX.Element {
  const locked = category.locked
  const reviewOnly = !!category.reviewOnly
  const empty = category.fileCount === 0
  return (
    <div className={`category-card${locked ? ' locked' : ''}${reviewOnly ? ' review' : ''}`}>
      <div className="category-top">
        <span className="category-icon">{category.icon}</span>
        <div className="category-title">
          <span className="category-name">{category.name}</span>
          {locked && (
            <span className="lock-badge" title={category.lockReason}>
              🔒 Locked
            </span>
          )}
          {reviewOnly && (
            <span className="review-badge" title={category.reviewReason}>
              👤 Your files
            </span>
          )}
        </div>
      </div>

      <p className="category-desc">{category.description}</p>

      <div className="category-stats">
        <div>
          <span className="cs-value">{scanning ? '—' : formatBytes(category.totalSize)}</span>
          <span className="cs-label">reclaimable</span>
        </div>
        <div>
          <span className="cs-value">{scanning ? '—' : formatCount(category.fileCount)}</span>
          <span className="cs-label">files</span>
        </div>
      </div>

      {category.error && !locked && <div className="category-error">⚠ {category.error}</div>}

      {locked ? (
        <button className="clean-btn locked-btn" disabled title={category.lockReason}>
          🔒 Protected
        </button>
      ) : reviewOnly ? (
        <button className="clean-btn review-btn" disabled title={category.reviewReason}>
          👤 Review manually
        </button>
      ) : (
        <button
          className="clean-btn"
          disabled={scanning || empty}
          onClick={() => onClean(category)}
        >
          {scanning ? 'Scanning…' : empty ? 'Nothing to clean' : 'Preview & Clean'}
        </button>
      )}
    </div>
  )
}
