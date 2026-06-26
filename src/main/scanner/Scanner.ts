import type { Target } from '../target/Target.js'
import { shellQuote } from '../target/Target.js'
import type { CategoryDefinition, CategoryResult, ScannedFile } from '../../shared/types.js'
import { CATEGORIES } from './categories.js'

const PREVIEW_LIMIT = 200 // cap the preview list so huge dirs stay responsive

/**
 * Enumerate the files under a category's roots on the given target.
 * Returns every file with size + mtime. Uses BSD `find` + `stat`, available on
 * any macOS host (local or remote).
 */
async function listFiles(
  target: Target,
  def: CategoryDefinition
): Promise<{ files: ScannedFile[]; error?: string }> {
  const files: ScannedFile[] = []
  let error: string | undefined

  for (const root of def.roots) {
    // Build a find that emits "size<TAB>mtime<TAB>path" lines. The %t in stat
    // format is a literal tab. Filter to category-relevant files where useful.
    let findExpr = `find ${quoteRoot(root)} -type f`
    if (def.id === 'dmgs') findExpr += ` \\( -iname '*.dmg' -o -iname '*.pkg' \\)`
    if (def.id === 'downloads') findExpr += ` -size +50M` // only "large" downloads

    const cmd = `${findExpr} -print0 2>/dev/null | xargs -0 stat -f '%z%t%m%t%N' 2>/dev/null`
    const res = await target.exec(cmd)

    if (res.code !== 0 && !res.stdout) {
      // Missing directory is fine (category simply empty); record other errors.
      if (res.stderr && !/No such file/i.test(res.stderr)) error = res.stderr.trim()
      continue
    }

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

  return { files, error }
}

/** Scan a single category on the target. */
export async function scanCategory(
  target: Target,
  def: CategoryDefinition
): Promise<CategoryResult> {
  let files: ScannedFile[] = []
  let error: string | undefined

  // Locked categories: we still report a size (awareness) but never expose a
  // cleanable file list. We only need the aggregate.
  try {
    const listed = await listFiles(target, def)
    files = listed.files
    error = listed.error
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const fileCount = files.length

  // Preview = largest entries first, bounded.
  const preview = [...files].sort((a, b) => b.size - a.size).slice(0, PREVIEW_LIMIT)

  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    description: def.description,
    locked: def.locked,
    lockReason: def.lockReason,
    reviewOnly: def.reviewOnly,
    reviewReason: def.reviewReason,
    totalSize,
    fileCount,
    // Locked (security) categories expose no file list; review-only categories
    // still list their files so the user can see what to review.
    preview: def.locked ? [] : preview,
    error
  }
}

/** Scan every known category. */
export async function scanAll(target: Target): Promise<CategoryResult[]> {
  // Run sequentially to avoid hammering a remote host with many SSH commands at
  // once; locally this is still fast.
  const results: CategoryResult[] = []
  for (const def of CATEGORIES) {
    results.push(await scanCategory(target, def))
  }
  return results
}

function quoteRoot(root: string): string {
  // Allow ~ expansion by the remote/local shell, but quote the rest.
  if (root === '~') return '"$HOME"'
  if (root.startsWith('~/')) return `"$HOME/${root.slice(2).replace(/"/g, '\\"')}"`
  return shellQuote(root)
}
