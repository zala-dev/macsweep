/// <reference types="vite/client" />
import type { MacSweepAPI } from '../../shared/ipc'

declare global {
  interface Window {
    macsweep: MacSweepAPI
  }
}

export {}
