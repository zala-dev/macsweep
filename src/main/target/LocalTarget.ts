import { exec as cpExec } from 'child_process'
import { promisify } from 'util'
import { rm } from 'fs/promises'
import { shell } from 'electron'
import { hostname as osHostname } from 'os'
import type { Target, ExecResult } from './Target.js'

const execAsync = promisify(cpExec)

/** The local Mac. Uses Node + Electron APIs directly. */
export class LocalTarget implements Target {
  readonly kind = 'local' as const

  async exec(command: string): Promise<ExecResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        shell: '/bin/zsh',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 120_000
      })
      return { stdout, stderr, code: 0 }
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string }
      return {
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? '',
        code: typeof e.code === 'number' ? e.code : 1
      }
    }
  }

  async trashItem(path: string): Promise<void> {
    // Electron's shell.trashItem performs a proper macOS "Move to Trash"
    // (with Put Back support), which is exactly the safe default we want.
    await shell.trashItem(path)
  }

  async removeItem(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true })
  }

  async hostname(): Promise<string> {
    return osHostname()
  }

  async dispose(): Promise<void> {
    // Nothing to release for the local target.
  }
}
