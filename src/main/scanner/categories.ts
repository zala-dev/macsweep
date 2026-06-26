import type { CategoryDefinition } from '../../shared/types.js'

/**
 * The cleanup categories MacSweep knows about.
 *
 * `roots` are shell paths (~ allowed) relative to the *target's* home directory.
 * `locked: true` marks a security-sensitive category that the UI must render as
 * locked (greyed out, 🔒, no clean button). These are still scannable for size
 * awareness but never cleanable.
 *
 * `reviewOnly: true` marks a category that is the user's own data (e.g. large
 * downloads) rather than regenerable garbage. It is scanned for awareness but
 * never cleaned automatically — every *cleanable* category is pure garbage that
 * macOS/apps regenerate or that is otherwise disposable, so cleaning can never
 * break anything or lose something the user wanted.
 */
export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'system-caches',
    name: 'System Caches',
    icon: '🗄️',
    description: 'Reusable system-level cache data that macOS will regenerate.',
    locked: false,
    roots: ['~/Library/Caches'],
    contentsOnly: true
  },
  {
    id: 'app-caches',
    name: 'Application Caches',
    icon: '📦',
    description: 'Per-app caches under Application Support that apps rebuild on demand.',
    locked: false,
    roots: ['~/Library/Application Support/Caches'],
    contentsOnly: true
  },
  {
    id: 'logs',
    name: 'Logs',
    icon: '📝',
    description: 'Diagnostic and application logs.',
    locked: false,
    roots: ['~/Library/Logs'],
    contentsOnly: true
  },
  {
    id: 'trash',
    name: 'Trash',
    icon: '🗑️',
    description: 'Items already in the Trash, ready to be emptied.',
    locked: false,
    roots: ['~/.Trash'],
    contentsOnly: true
  },
  {
    id: 'downloads',
    name: 'Large Downloads',
    icon: '⬇️',
    description: 'Large files in your Downloads folder. Shown for review — these are your files, not garbage, so MacSweep never deletes them automatically.',
    locked: false,
    reviewOnly: true,
    reviewReason:
      'These are your personal downloads, not regenerable garbage. Review and remove them yourself in Finder.',
    roots: ['~/Downloads'],
    contentsOnly: true
  },
  {
    id: 'dmgs',
    name: 'Unused DMGs',
    icon: '💿',
    description: 'Disk image installers (.dmg) that can usually be removed after install.',
    locked: false,
    roots: ['~/Downloads', '~/Desktop'],
    contentsOnly: true
  },
  {
    id: 'xcode-derived',
    name: 'Xcode Derived Data',
    icon: '🔨',
    description: 'Build intermediates Xcode regenerates automatically.',
    locked: false,
    roots: ['~/Library/Developer/Xcode/DerivedData'],
    contentsOnly: true
  },
  {
    id: 'homebrew-cache',
    name: 'Homebrew Cache',
    icon: '🍺',
    description: 'Downloaded bottles and formula caches from Homebrew.',
    locked: false,
    roots: ['~/Library/Caches/Homebrew'],
    contentsOnly: true
  },
  {
    id: 'npm-cache',
    name: 'npm Cache',
    icon: '📕',
    description: 'The npm package download cache.',
    locked: false,
    roots: ['~/.npm/_cacache'],
    contentsOnly: true
  },
  {
    id: 'pip-cache',
    name: 'pip Cache',
    icon: '🐍',
    description: 'The pip wheel/download cache.',
    locked: false,
    roots: ['~/Library/Caches/pip'],
    contentsOnly: true
  },
  // ---- Security-locked categories (scannable, never cleanable) ----
  {
    id: 'keychains',
    name: 'Keychains & Credentials',
    icon: '🔐',
    description: 'Keychain databases. Permanently protected — never cleaned.',
    locked: true,
    lockReason: 'Keychains store your passwords and certificates. Deleting them is irreversible.',
    roots: ['~/Library/Keychains'],
    contentsOnly: true
  },
  {
    id: 'ssh-keys',
    name: 'SSH & GPG Keys',
    icon: '🗝️',
    description: 'Private keys for SSH and GPG. Permanently protected — never cleaned.',
    locked: true,
    lockReason: 'These are your private keys. Losing them locks you out of servers and signatures.',
    roots: ['~/.ssh', '~/.gnupg'],
    contentsOnly: true
  }
]

export function findCategory(id: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.id === id)
}
