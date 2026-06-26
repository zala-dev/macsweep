import type { Target } from '../target/Target.js'
import { shellQuote } from '../target/Target.js'
import type {
  CategoryDefinition,
  CleanPreview,
  CleanResult,
  ScannedFile
} from '../../shared/types.js'
import { partition, assertSafe, SafetyViolation } from '../safety/SafetyGuard.js'

export interface CleanOptions {
  dryRun: boolean // default true — preview only
  permanent: boolean // default false — move to Trash, not permanent delete
}

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = { dryRun: true, permanent: false }

/**
 * Build a clean preview for a category: the exact files that WOULD be removed,
 * with anything security-sensitive split out into `blocked`. This is what the
 * confirmation modal renders. No filesystem mutation happens here.
 */
export async function buildPreview(
  target: Target,
  def: CategoryDefinition
): Promise<CleanPreview> {
  if (def.locked || def.reviewOnly) {
    // Locked (security) and review-only (user data) categories are never
    // cleanable — only regenerable/disposable garbage is ever removed.
    return {
      categoryId: def.id,
      files: [],
      totalSize: 0,
      fileCount: 0,
      blocked: [
        {
          path: def.roots.join(', '),
          reason: def.lockReason ?? def.reviewReason ?? 'Category is not cleanable'
        }
      ]
    }
  }

  const files = await enumerateFull(target, def)

  const { safe, blocked } = partition(files.map((f) => f.path))
  const safeSet = new Set(safe)
  const safeFiles = files.filter((f) => safeSet.has(f.path))

  return {
    categoryId: def.id,
    files: safeFiles,
    totalSize: safeFiles.reduce((s, f) => s + f.size, 0),
    fileCount: safeFiles.length,
    blocked
  }
}

/**
 * Execute (or dry-run) a clean for a category. Every single path is re-checked
 * by SafetyGuard.assertSafe immediately before deletion — there is no path to
 * the filesystem that bypasses this.
 */
export async function clean(
  target: Target,
  def: CategoryDefinition,
  options: CleanOptions = DEFAULT_CLEAN_OPTIONS
): Promise<CleanResult> {
  const removed: string[] = []
  const blocked: CleanResult['blocked'] = []
  const failed: CleanResult['failed'] = []
  let reclaimedBytes = 0

  if (def.locked || def.reviewOnly) {
    // Hard refusal: security-locked and review-only (user data) categories are
    // never deleted. Only regenerable/disposable garbage is ever cleaned.
    return {
      categoryId: def.id,
      dryRun: options.dryRun,
      removed: [],
      blocked: [
        {
          path: def.roots.join(', '),
          reason: def.lockReason ?? def.reviewReason ?? 'Category is not cleanable'
        }
      ],
      failed: [],
      reclaimedBytes: 0
    }
  }

  const files = await enumerateFull(target, def)

  for (const file of files) {
    // Hard gate: throws SafetyViolation for sensitive paths.
    try {
      assertSafe(file.path)
    } catch (e) {
      if (e instanceof SafetyViolation) {
        blocked.push({ path: file.path, reason: e.reason })
        continue
      }
      throw e
    }

    if (options.dryRun) {
      // Dry run: record what would happen, touch nothing.
      removed.push(file.path)
      reclaimedBytes += file.size
      continue
    }

    try {
      if (options.permanent) {
        await target.removeItem(file.path)
      } else {
        await target.trashItem(file.path)
      }
      removed.push(file.path)
      reclaimedBytes += file.size
    } catch (e) {
      failed.push({ path: file.path, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return {
    categoryId: def.id,
    dryRun: options.dryRun,
    removed,
    blocked,
    failed,
    reclaimedBytes
  }
}

/**
 * Full (uncapped) file listing for a category, used for cleaning. Returns every
 * file under the category roots with size + mtime, via BSD find + stat.
 */
async function enumerateFull(
  target: Target,
  def: CategoryDefinition
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = []
  for (const root of def.roots) {
    const rootExpr =
      root === '~'
        ? '"$HOME"'
        : root.startsWith('~/')
          ? `"$HOME/${root.slice(2).replace(/"/g, '\\"')}"`
          : shellQuote(root)
    let findExpr = `find ${rootExpr} -type f`
    if (def.id === 'dmgs') findExpr += ` \\( -iname '*.dmg' -o -iname '*.pkg' \\)`
    if (def.id === 'downloads') findExpr += ` -size +50M`
    const cmd = `${findExpr} -print0 2>/dev/null | xargs -0 stat -f '%z%t%m%t%N' 2>/dev/null`
    const res = await target.exec(cmd)
    for (const line of res.stdout.split('\n')) {
      if (!line) continue
      const tab1 = line.indexOf('\t')
      const tab2 = line.indexOf('\t', tab1 + 1)
      if (tab1 < 0 || tab2 < 0) continue
      const size = Number(line.slice(0, tab1))
      const mtime = Number(line.slice(tab1 + 1, tab2))
      const path = line.slice(tab2 + 1)
      if (!path || Number.isNaN(size)) continue
      files.push({ path, size, modified: (mtime || 0) * 1000 })
    }
  }
  return files
}
