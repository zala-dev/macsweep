import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import type { RemoteProfile } from '../../shared/types.js'

/**
 * Persists remote Mac profiles to a JSON file in the app's userData dir.
 * NOTE: we store host/port/username/keyPath only — never a password or the key
 * material itself. SSH uses key auth exclusively.
 */
export class ProfileStore {
  private filePath: string
  private cache: RemoteProfile[] | null = null

  constructor() {
    this.filePath = join(app.getPath('userData'), 'remote-profiles.json')
  }

  private async load(): Promise<RemoteProfile[]> {
    if (this.cache) return this.cache
    try {
      const raw = await readFile(this.filePath, 'utf8')
      this.cache = JSON.parse(raw) as RemoteProfile[]
    } catch {
      this.cache = []
    }
    return this.cache
  }

  private async persist(): Promise<void> {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(this.cache ?? [], null, 2), 'utf8')
  }

  async list(): Promise<RemoteProfile[]> {
    return [...(await this.load())]
  }

  async get(id: string): Promise<RemoteProfile | undefined> {
    return (await this.load()).find((p) => p.id === id)
  }

  async add(input: Omit<RemoteProfile, 'id' | 'createdAt'>): Promise<RemoteProfile> {
    const profiles = await this.load()
    const profile: RemoteProfile = {
      ...input,
      id: randomUUID(),
      createdAt: Date.now()
    }
    profiles.push(profile)
    await this.persist()
    return profile
  }

  async remove(id: string): Promise<void> {
    const profiles = await this.load()
    this.cache = profiles.filter((p) => p.id !== id)
    await this.persist()
  }
}
