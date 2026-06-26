import { ipcMain } from 'electron'
import { IPC, type CleanRequest } from '../shared/ipc.js'
import type { RemoteProfile, TargetRef } from '../shared/types.js'
import { ProfileStore } from './remote/ProfileStore.js'
import { TargetManager } from './target/TargetManager.js'
import { collectStats } from './stats/SystemStats.js'
import { scanAll } from './scanner/Scanner.js'
import { buildPreview, clean } from './cleaner/Cleaner.js'
import { findCategory } from './scanner/categories.js'
import { runSafetySmokeTest } from './safety/smokeTest.js'

/** Wire up every IPC handler. Called once after the app is ready. */
export function registerIpcHandlers(): TargetManager {
  const store = new ProfileStore()
  const manager = new TargetManager(store)

  ipcMain.handle(IPC.getStats, async (_e, target: TargetRef) => {
    const t = await manager.resolve(target)
    return collectStats(t)
  })

  ipcMain.handle(IPC.scanAll, async (_e, target: TargetRef) => {
    const t = await manager.resolve(target)
    return scanAll(t)
  })

  ipcMain.handle(IPC.buildPreview, async (_e, target: TargetRef, categoryId: string) => {
    const def = findCategory(categoryId)
    if (!def) throw new Error(`Unknown category: ${categoryId}`)
    const t = await manager.resolve(target)
    return buildPreview(t, def)
  })

  ipcMain.handle(IPC.clean, async (_e, req: CleanRequest) => {
    const def = findCategory(req.categoryId)
    if (!def) throw new Error(`Unknown category: ${req.categoryId}`)
    const t = await manager.resolve(req.target)
    return clean(t, def, { dryRun: req.dryRun, permanent: req.permanent })
  })

  ipcMain.handle(IPC.listProfiles, async () => store.list())

  ipcMain.handle(
    IPC.addProfile,
    async (_e, input: Omit<RemoteProfile, 'id' | 'createdAt'>) => store.add(input)
  )

  ipcMain.handle(IPC.removeProfile, async (_e, id: string) => {
    await manager.disconnect(id)
    return store.remove(id)
  })

  ipcMain.handle(IPC.testConnection, async (_e, target: TargetRef) =>
    manager.testConnection(target)
  )

  ipcMain.handle(IPC.runSafetySmokeTest, async () => runSafetySmokeTest())

  return manager
}
