import type { Target } from './Target.js'
import { LocalTarget } from './LocalTarget.js'
import { RemoteTarget } from './RemoteTarget.js'
import { ProfileStore } from '../remote/ProfileStore.js'
import type { TargetRef, ConnectionStatus } from '../../shared/types.js'

/**
 * Owns the lifecycle of targets. The local target is always available; remote
 * targets are created on demand from saved profiles and cached while connected.
 */
export class TargetManager {
  private local = new LocalTarget()
  private remotes = new Map<string, RemoteTarget>()
  private store: ProfileStore

  constructor(store: ProfileStore) {
    this.store = store
  }

  async resolve(ref: TargetRef): Promise<Target> {
    if (ref.kind === 'local') return this.local

    const existing = this.remotes.get(ref.profileId)
    if (existing) return existing

    const profile = await this.store.get(ref.profileId)
    if (!profile) throw new Error(`Unknown remote profile: ${ref.profileId}`)
    const remote = new RemoteTarget(profile)
    await remote.connect()
    this.remotes.set(ref.profileId, remote)
    return remote
  }

  async testConnection(ref: TargetRef): Promise<ConnectionStatus> {
    try {
      const target = await this.resolve(ref)
      const hostname = await target.hostname()
      return { target: ref, connected: true, hostname }
    } catch (e) {
      return {
        target: ref,
        connected: false,
        error: e instanceof Error ? e.message : String(e)
      }
    }
  }

  async disconnect(profileId: string): Promise<void> {
    const remote = this.remotes.get(profileId)
    if (remote) {
      await remote.dispose()
      this.remotes.delete(profileId)
    }
  }

  async disposeAll(): Promise<void> {
    for (const remote of this.remotes.values()) {
      await remote.dispose()
    }
    this.remotes.clear()
    await this.local.dispose()
  }
}
