export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatCount(n: number): string {
  return n.toLocaleString()
}

export function shortPath(path: string, max = 56): string {
  if (path.length <= max) return path
  const head = path.slice(0, 18)
  const tail = path.slice(-(max - 21))
  return `${head}…${tail}`
}
