import { homedir } from 'os'
import { isSafe, assertSafe, SafetyViolation } from './SafetyGuard.js'

interface Case {
  path: string
  expectSafe: boolean
  label: string
}

const home = homedir()

const CASES: Case[] = [
  // --- Must be BLOCKED ---
  { path: '/System/Library/Caches', expectSafe: false, label: '/System' },
  { path: '/usr/bin/ssh', expectSafe: false, label: '/usr' },
  { path: '/bin/bash', expectSafe: false, label: '/bin' },
  { path: '/sbin/fsck', expectSafe: false, label: '/sbin' },
  { path: '/etc/hosts', expectSafe: false, label: '/etc' },
  { path: '/private/etc/passwd', expectSafe: false, label: '/private/etc' },
  { path: `${home}/.ssh/id_rsa`, expectSafe: false, label: 'SSH private key' },
  { path: `${home}/.ssh/known_hosts`, expectSafe: false, label: '.ssh dir' },
  { path: `${home}/.gnupg/secring.gpg`, expectSafe: false, label: 'GPG keyring' },
  { path: `${home}/Library/Keychains/login.keychain-db`, expectSafe: false, label: 'Keychain' },
  {
    path: `${home}/Library/Application Support/Google/Chrome/Default/Cookies`,
    expectSafe: false,
    label: 'Browser cookies'
  },
  {
    path: `${home}/Library/Application Support/Google/Chrome/Default/Login Data`,
    expectSafe: false,
    label: 'Browser saved passwords'
  },
  { path: `${home}/Documents/my-password-list.txt`, expectSafe: false, label: 'password keyword' },
  { path: `${home}/Downloads/aws-secret.json`, expectSafe: false, label: 'secret keyword' },
  { path: `${home}/Desktop/api-token.txt`, expectSafe: false, label: 'token keyword' },
  { path: `${home}/Desktop/server.pem`, expectSafe: false, label: '.pem cert' },
  { path: `${home}/Desktop/cert.p12`, expectSafe: false, label: '.p12' },
  { path: `${home}/.aws/credentials`, expectSafe: false, label: 'aws credentials' },
  {
    path: '/Applications/Safari.app/Contents/MacOS/Safari',
    expectSafe: false,
    label: '.app internals'
  },
  { path: '/Applications/Some.app', expectSafe: false, label: '/Applications app' },
  { path: '/', expectSafe: false, label: 'filesystem root' },
  { path: home, expectSafe: false, label: 'home root' },
  { path: 'relative/path', expectSafe: false, label: 'relative path' },

  // --- Must be ALLOWED ---
  { path: `${home}/Library/Caches/com.apple.Safari/fsCachedData/x`, expectSafe: true, label: 'app cache' },
  { path: `${home}/Library/Logs/foo.log`, expectSafe: true, label: 'log file' },
  { path: `${home}/.Trash/old.zip`, expectSafe: true, label: 'trash item' },
  { path: `${home}/Downloads/big-video.mp4`, expectSafe: true, label: 'download' },
  { path: `${home}/Downloads/Installer.dmg`, expectSafe: true, label: 'DMG' },
  {
    path: `${home}/Library/Developer/Xcode/DerivedData/App-abc/Build`,
    expectSafe: true,
    label: 'Xcode derived data'
  },
  { path: `${home}/Library/Caches/Homebrew/downloads/x.tar.gz`, expectSafe: true, label: 'brew cache' },
  { path: `${home}/.npm/_cacache/index-v5/aa`, expectSafe: true, label: 'npm cache' },
  { path: `${home}/Library/Caches/pip/wheels/aa`, expectSafe: true, label: 'pip cache' }
]

export interface SmokeReport {
  passed: number
  failed: number
  failures: { label: string; path: string; expectedSafe: boolean; gotSafe: boolean }[]
}

export function runSafetySmokeTest(): SmokeReport {
  const failures: SmokeReport['failures'] = []
  let passed = 0

  for (const c of CASES) {
    const gotSafe = isSafe(c.path)
    if (gotSafe === c.expectSafe) {
      passed++
    } else {
      failures.push({ label: c.label, path: c.path, expectedSafe: c.expectSafe, gotSafe })
    }
  }

  // Also verify assertSafe throws SafetyViolation for a known-bad path.
  let threw = false
  try {
    assertSafe('/System/x')
  } catch (e) {
    threw = e instanceof SafetyViolation
  }
  if (!threw) {
    failures.push({
      label: 'assertSafe throws SafetyViolation',
      path: '/System/x',
      expectedSafe: false,
      gotSafe: true
    })
  } else {
    passed++
  }

  return { passed, failed: failures.length, failures }
}

/** Pretty-prints the smoke test result and returns the exit code (0 = pass). */
export function reportSafetySmokeTest(): number {
  const r = runSafetySmokeTest()
  /* eslint-disable no-console */
  console.log('\n=== MacSweep SafetyGuard smoke test ===')
  console.log(`Passed: ${r.passed}`)
  console.log(`Failed: ${r.failed}`)
  for (const f of r.failures) {
    console.log(
      `  ✗ ${f.label} [${f.path}] expected ${f.expectedSafe ? 'SAFE' : 'BLOCKED'}, got ${
        f.gotSafe ? 'SAFE' : 'BLOCKED'
      }`
    )
  }
  if (r.failed === 0) console.log('✓ All safety checks passed.\n')
  else console.log('✗ Safety checks FAILED — refusing to proceed.\n')
  /* eslint-enable no-console */
  return r.failed === 0 ? 0 : 1
}
