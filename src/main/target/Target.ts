export interface ExecResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * A Target is a Mac we operate on — either the local machine or a remote Mac
 * reached over SSH. Everything (stats, scanning, cleaning) is expressed in
 * terms of a small shell surface so local and remote behave identically.
 */
export interface Target {
  readonly kind: 'local' | 'remote'
  /** Run a shell command on the target. Never rejects on non-zero exit. */
  exec(command: string): Promise<ExecResult>
  /** Move a single path to the macOS Trash. */
  trashItem(path: string): Promise<void>
  /** Permanently remove a single path. */
  removeItem(path: string): Promise<void>
  /** The target's hostname. */
  hostname(): Promise<string>
  /** Release any resources (SSH connections etc.). */
  dispose(): Promise<void>
}

/** Quote a path for safe use inside a single-quoted shell argument. */
export function shellQuote(p: string): string {
  return `'${p.replace(/'/g, `'\\''`)}'`
}
