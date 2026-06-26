import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { resolve } from 'path'
import { NodeSSH } from 'node-ssh'
import type { Target, ExecResult } from './Target.js'
import { shellQuote } from './Target.js'
import type { RemoteProfile } from '../../shared/types.js'

/**
 * A remote Mac reached over SSH (works transparently over Tailscale, since
 * Tailscale just gives you a reachable host/IP). Key-based auth only — we never
 * accept or store a password.
 */
export class RemoteTarget implements Target {
  readonly kind = 'remote' as const
  private ssh: NodeSSH
  private connected = false

  constructor(private profile: RemoteProfile) {
    this.ssh = new NodeSSH()
  }

  private expandKeyPath(p: string): string {
    if (p === '~') return homedir()
    if (p.startsWith('~/')) return resolve(homedir(), p.slice(2))
    return p
  }

  async connect(): Promise<void> {
    if (this.connected) return
    const keyPath = this.expandKeyPath(this.profile.privateKeyPath)
    const privateKey = await readFile(keyPath, 'utf8')
    await this.ssh.connect({
      host: this.profile.host,
      port: this.profile.port,
      username: this.profile.username,
      privateKey,
      // Hard guarantee: never fall back to password/keyboard-interactive auth.
      tryKeyboard: false,
      readyTimeout: 15_000
    })
    this.connected = true
  }

  async exec(command: string): Promise<ExecResult> {
    if (!this.connected) await this.connect()
    const result = await this.ssh.execCommand(command)
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: typeof result.code === 'number' ? result.code : 0
    }
  }

  async trashItem(path: string): Promise<void> {
    // No Electron trash on a remote box; emulate macOS "Move to Trash" by
    // relocating into ~/.Trash (with a timestamp to avoid collisions).
    const q = shellQuote(path)
    const cmd = `mkdir -p "$HOME/.Trash" && mv -f ${q} "$HOME/.Trash/$(basename ${q})-$(date +%s)" 2>&1`
    const res = await this.exec(cmd)
    if (res.code !== 0) throw new Error(res.stderr || `Failed to trash ${path}`)
  }

  async removeItem(path: string): Promise<void> {
    const res = await this.exec(`rm -rf ${shellQuote(path)} 2>&1`)
    if (res.code !== 0) throw new Error(res.stderr || `Failed to remove ${path}`)
  }

  async hostname(): Promise<string> {
    const res = await this.exec('hostname')
    return res.stdout.trim() || this.profile.host
  }

  async dispose(): Promise<void> {
    if (this.connected) {
      this.ssh.dispose()
      this.connected = false
    }
  }
}
