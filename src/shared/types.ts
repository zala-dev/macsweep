// Shared types used by both the Electron main process and the React renderer.

export interface SystemStats {
  optimisationScore: number // 0-100
  disk: {
    total: number // bytes
    used: number
    free: number
    usedPercent: number
  }
  ram: {
    total: number
    used: number
    free: number
    usedPercent: number
    pressure: number // 0-100, higher = more pressure
  }
  cpu: {
    cores: number
    loadPercent: number // approximate utilisation 0-100
    loadAvg1: number
  }
  hostname: string
  capturedAt: number
}

export interface ScannedFile {
  path: string
  size: number // bytes
  modified: number // epoch ms
}

export interface CategoryResult {
  id: string
  name: string
  icon: string
  description: string
  locked: boolean
  lockReason?: string
  // reviewOnly: these are the user's own files (not regenerable garbage). They
  // are scanned for awareness but never cleanable — review them manually.
  reviewOnly?: boolean
  reviewReason?: string
  totalSize: number // bytes
  fileCount: number
  // A bounded preview of the largest entries (never the full tree for huge dirs).
  preview: ScannedFile[]
  error?: string
}

export interface CategoryDefinition {
  id: string
  name: string
  icon: string
  description: string
  locked: boolean
  lockReason?: string
  // reviewOnly: user data, not garbage — scannable but never cleanable.
  reviewOnly?: boolean
  reviewReason?: string
  // Shell-expandable roots (relative to home unless absolute).
  roots: string[]
  // If true, contents of the roots are removed but the root dirs themselves kept.
  contentsOnly: boolean
}

export interface CleanPreview {
  categoryId: string
  files: ScannedFile[]
  totalSize: number
  fileCount: number
  blocked: BlockedPath[]
}

export interface BlockedPath {
  path: string
  reason: string
}

export interface CleanResult {
  categoryId: string
  dryRun: boolean
  removed: string[]
  blocked: BlockedPath[]
  failed: { path: string; error: string }[]
  reclaimedBytes: number
}

export interface RemoteProfile {
  id: string
  label: string
  host: string
  port: number
  username: string
  privateKeyPath: string
  createdAt: number
}

export type TargetRef =
  | { kind: 'local' }
  | { kind: 'remote'; profileId: string }

export interface ConnectionStatus {
  target: TargetRef
  connected: boolean
  hostname?: string
  error?: string
}

export interface SafetyCheck {
  path: string
  safe: boolean
  reason?: string
}
