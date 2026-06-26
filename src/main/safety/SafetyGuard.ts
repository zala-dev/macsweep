import { homedir } from 'os'
import { resolve, normalize, sep } from 'path'

/**
 * SafetyGuard — the single chokepoint every deletion must pass through.
 *
 * Philosophy: deny by default reasoning. A path is only deletable if it is NOT
 * matched by any blocklist rule. When a path is security-sensitive we throw a
 * {@link SafetyViolation}; callers must never swallow this to delete anyway.
 *
 * This module has no side effects and never touches the filesystem, so it is
 * trivially testable (see smokeTest.ts) and identical in behaviour for local
 * and remote targets.
 */

export class SafetyViolation extends Error {
  readonly path: string
  readonly reason: string
  constructor(path: string, reason: string) {
    super(`SafetyGuard blocked "${path}": ${reason}`)
    this.name = 'SafetyViolation'
    this.path = path
    this.reason = reason
  }
}

// Absolute system roots that must never be touched. A path is blocked if it is
// equal to, or nested beneath, any of these.
const PROTECTED_SYSTEM_ROOTS = [
  '/System',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/var/db',
  '/private/etc',
  '/private/var/db',
  '/Library/Keychains',
  '/Applications' // never delete installed apps wholesale
]

// Path segments (case-insensitive) that hard-block a path anywhere they appear.
const FORBIDDEN_SEGMENTS = [
  '.ssh',
  '.gnupg',
  'keychains',
  'keychain',
  'login.keychain',
  'cookies',
  'cookies.binarycookies'
]

// Substrings (case-insensitive) that hard-block a path anywhere they appear.
// These cover credentials/secrets in arbitrary filenames.
const FORBIDDEN_SUBSTRINGS = [
  'password',
  'passwd',
  'credential',
  'token',
  'secret',
  'certificate',
  'private key',
  'privatekey',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'id_dsa',
  '.pem',
  '.p12',
  '.pfx',
  '.keychain',
  'gpg',
  'aws/credentials',
  '.aws',
  'saved passwords',
  'web data',
  'login data'
]

// File extensions that indicate keys/certs/credential material.
const FORBIDDEN_EXTENSIONS = ['.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.gpg', '.asc']

// macOS .app bundles are opaque — never delete anything *inside* one.
const APP_BUNDLE_PATTERN = /\.app(\/|$)/i

function normaliseAbsolute(inputPath: string): string {
  // Expand a leading ~ to the home directory, then make absolute + normalised.
  let p = inputPath.trim()
  if (p === '~') p = homedir()
  else if (p.startsWith('~/')) p = resolve(homedir(), p.slice(2))
  if (!p.startsWith('/')) {
    // Anything that can't be made absolute is inherently untrusted.
    throw new SafetyViolation(inputPath, 'path is not absolute and cannot be resolved safely')
  }
  return normalize(resolve(p))
}

function isWithin(child: string, parent: string): boolean {
  const c = child.endsWith(sep) ? child : child + sep
  const p = parent.endsWith(sep) ? parent : parent + sep
  return c === p || c.startsWith(p)
}

/**
 * Returns the reason a path is blocked, or null if it is safe to delete.
 * Pure function — does no I/O.
 */
export function inspect(inputPath: string): string | null {
  if (!inputPath || typeof inputPath !== 'string') {
    return 'empty or non-string path'
  }

  // Reject path traversal attempts before normalisation hides them.
  if (inputPath.includes('\0')) return 'null byte in path'

  let abs: string
  try {
    abs = normaliseAbsolute(inputPath)
  } catch (err) {
    return err instanceof SafetyViolation ? err.reason : 'unresolvable path'
  }

  const lower = abs.toLowerCase()
  const home = normalize(homedir())

  // Never allow deleting the home directory or filesystem root themselves.
  if (abs === '/' ) return 'filesystem root'
  if (abs === home) return 'home directory root'

  // Protected absolute system roots.
  for (const root of PROTECTED_SYSTEM_ROOTS) {
    if (isWithin(abs, normalize(root))) {
      return `protected system location (${root})`
    }
  }

  // Inside a .app bundle.
  if (APP_BUNDLE_PATTERN.test(abs)) {
    return '.app bundle internals are protected'
  }

  // Forbidden path segments.
  const segments = lower.split('/').filter(Boolean)
  for (const seg of segments) {
    if (FORBIDDEN_SEGMENTS.includes(seg)) {
      return `security-sensitive path segment "${seg}"`
    }
  }

  // Forbidden substrings anywhere in the path.
  for (const sub of FORBIDDEN_SUBSTRINGS) {
    if (lower.includes(sub)) {
      return `security-sensitive keyword "${sub}"`
    }
  }

  // Forbidden extensions.
  for (const ext of FORBIDDEN_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return `security-sensitive file type "${ext}"`
    }
  }

  return null
}

/** Returns true when the path is safe to delete. Never throws. */
export function isSafe(inputPath: string): boolean {
  return inspect(inputPath) === null
}

/**
 * Asserts a path is safe to delete. Throws {@link SafetyViolation} otherwise.
 * This is the function the cleaner MUST call immediately before any delete.
 */
export function assertSafe(inputPath: string): void {
  const reason = inspect(inputPath)
  if (reason !== null) {
    throw new SafetyViolation(inputPath, reason)
  }
}

/**
 * Partition a list of paths into those safe to delete and those blocked.
 * Used to build clean previews without throwing on the first bad path.
 */
export function partition(paths: string[]): {
  safe: string[]
  blocked: { path: string; reason: string }[]
} {
  const safe: string[] = []
  const blocked: { path: string; reason: string }[] = []
  for (const p of paths) {
    const reason = inspect(p)
    if (reason === null) safe.push(p)
    else blocked.push({ path: p, reason })
  }
  return { safe, blocked }
}
