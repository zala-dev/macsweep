import type { Target } from '../target/Target.js'
import type { SystemStats } from '../../shared/types.js'

/**
 * Collects disk / RAM / CPU stats from a target using only macOS-standard
 * shell tools (df, vm_stat, sysctl), so it works identically local and remote.
 */
export async function collectStats(target: Target): Promise<SystemStats> {
  const [disk, ram, cpu, hostname] = await Promise.all([
    collectDisk(target),
    collectRam(target),
    collectCpu(target),
    target.hostname()
  ])

  const optimisationScore = computeScore(disk, ram, cpu)

  return {
    optimisationScore,
    disk,
    ram,
    cpu,
    hostname,
    capturedAt: Date.now()
  }
}

async function collectDisk(target: Target): Promise<SystemStats['disk']> {
  // `df -k /` -> blocks of 1K. Parse the data row.
  const res = await target.exec('df -k / | tail -1')
  const parts = res.stdout.trim().split(/\s+/)
  // Filesystem  1K-blocks  Used  Available  Capacity ...
  const totalK = Number(parts[1]) || 0
  const usedK = Number(parts[2]) || 0
  const freeK = Number(parts[3]) || 0
  const total = totalK * 1024
  const used = usedK * 1024
  const free = freeK * 1024
  return {
    total,
    used,
    free,
    usedPercent: total > 0 ? Math.round((used / total) * 100) : 0
  }
}

async function collectRam(target: Target): Promise<SystemStats['ram']> {
  const [memRes, vmRes] = await Promise.all([
    target.exec('sysctl -n hw.memsize'),
    target.exec('vm_stat')
  ])
  const total = Number(memRes.stdout.trim()) || 0

  // Parse vm_stat to estimate used vs free.
  const pageSizeMatch = vmRes.stdout.match(/page size of (\d+) bytes/)
  const pageSize = pageSizeMatch ? Number(pageSizeMatch[1]) : 4096
  const get = (label: string): number => {
    const m = vmRes.stdout.match(new RegExp(`${label}:\\s+(\\d+)\\.`))
    return m ? Number(m[1]) : 0
  }
  const free = (get('Pages free') + get('Pages inactive')) * pageSize
  const active = get('Pages active') * pageSize
  const wired = get('Pages wired down') * pageSize
  const compressed = get('Pages occupied by compressor') * pageSize
  const used = active + wired + compressed
  const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0

  // Memory pressure heuristic: wired+compressed share of total scaled up.
  const pressure = total > 0 ? Math.min(100, Math.round(((wired + compressed) / total) * 200)) : 0

  return {
    total,
    used,
    free: total > 0 ? total - used : free,
    usedPercent,
    pressure
  }
}

async function collectCpu(target: Target): Promise<SystemStats['cpu']> {
  const [coresRes, loadRes] = await Promise.all([
    target.exec('sysctl -n hw.ncpu'),
    target.exec('sysctl -n vm.loadavg')
  ])
  const cores = Number(coresRes.stdout.trim()) || 1
  // vm.loadavg looks like: { 1.94 2.05 2.11 }
  const nums = loadRes.stdout.match(/[\d.]+/g) || []
  const loadAvg1 = Number(nums[0]) || 0
  const loadPercent = Math.min(100, Math.round((loadAvg1 / cores) * 100))
  return { cores, loadPercent, loadAvg1 }
}

/**
 * Optimisation score (0-100). Rewards free disk + low RAM/CPU pressure.
 * Weighted: disk 50%, RAM 30%, CPU 20%.
 */
function computeScore(
  disk: SystemStats['disk'],
  ram: SystemStats['ram'],
  cpu: SystemStats['cpu']
): number {
  const diskScore = 100 - disk.usedPercent // more free disk = better
  const ramScore = 100 - ram.usedPercent
  const cpuScore = 100 - cpu.loadPercent
  const score = diskScore * 0.5 + ramScore * 0.3 + cpuScore * 0.2
  return Math.max(0, Math.min(100, Math.round(score)))
}
