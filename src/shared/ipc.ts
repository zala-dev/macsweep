import type {
  SystemStats,
  CategoryResult,
  CleanPreview,
  CleanResult,
  RemoteProfile,
  TargetRef,
  ConnectionStatus
} from './types.js'

export const IPC = {
  getStats: 'macsweep:getStats',
  scanAll: 'macsweep:scanAll',
  buildPreview: 'macsweep:buildPreview',
  clean: 'macsweep:clean',
  listProfiles: 'macsweep:listProfiles',
  addProfile: 'macsweep:addProfile',
  removeProfile: 'macsweep:removeProfile',
  testConnection: 'macsweep:testConnection',
  runSafetySmokeTest: 'macsweep:runSafetySmokeTest'
} as const

export interface CleanRequest {
  target: TargetRef
  categoryId: string
  dryRun: boolean
  permanent: boolean
}

export interface SafetySmokeReport {
  passed: number
  failed: number
  failures: { label: string; path: string; expectedSafe: boolean; gotSafe: boolean }[]
}

/** The typed API surface exposed to the renderer via the preload bridge. */
export interface MacSweepAPI {
  getStats(target: TargetRef): Promise<SystemStats>
  scanAll(target: TargetRef): Promise<CategoryResult[]>
  buildPreview(target: TargetRef, categoryId: string): Promise<CleanPreview>
  clean(req: CleanRequest): Promise<CleanResult>
  listProfiles(): Promise<RemoteProfile[]>
  addProfile(input: Omit<RemoteProfile, 'id' | 'createdAt'>): Promise<RemoteProfile>
  removeProfile(id: string): Promise<void>
  testConnection(target: TargetRef): Promise<ConnectionStatus>
  runSafetySmokeTest(): Promise<SafetySmokeReport>
}
