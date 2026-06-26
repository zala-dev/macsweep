import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CleanRequest, type MacSweepAPI } from '../shared/ipc.js'
import type { RemoteProfile, TargetRef } from '../shared/types.js'

const api: MacSweepAPI = {
  getStats: (target: TargetRef) => ipcRenderer.invoke(IPC.getStats, target),
  scanAll: (target: TargetRef) => ipcRenderer.invoke(IPC.scanAll, target),
  buildPreview: (target: TargetRef, categoryId: string) =>
    ipcRenderer.invoke(IPC.buildPreview, target, categoryId),
  clean: (req: CleanRequest) => ipcRenderer.invoke(IPC.clean, req),
  listProfiles: () => ipcRenderer.invoke(IPC.listProfiles),
  addProfile: (input: Omit<RemoteProfile, 'id' | 'createdAt'>) =>
    ipcRenderer.invoke(IPC.addProfile, input),
  removeProfile: (id: string) => ipcRenderer.invoke(IPC.removeProfile, id),
  testConnection: (target: TargetRef) => ipcRenderer.invoke(IPC.testConnection, target),
  runSafetySmokeTest: () => ipcRenderer.invoke(IPC.runSafetySmokeTest)
}

contextBridge.exposeInMainWorld('macsweep', api)
