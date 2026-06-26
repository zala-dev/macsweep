<div align="center">

# MacSweep ⚡

**A real-time macOS optimisation dashboard with safe, single-click cleanup — local or remote.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-000000?logo=apple&logoColor=white)](#requirements)

</div>

---

MacSweep scans your Mac — or any remote Mac over SSH/Tailscale — categorises the
disk space being wasted by regenerable junk, and reclaims it safely with one
click. Every deletion is routed through a single, auditable safety chokepoint,
defaults to a dry-run preview, and moves files to the Trash before any permanent
removal.

Built with **Electron + React + TypeScript**.

## Table of contents

- [Why MacSweep](#why-macsweep)
- [Features](#features)
- [Safety model](#safety-model)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Remote Macs (SSH / Tailscale)](#remote-macs-ssh--tailscale)
- [Cleanup categories](#cleanup-categories)
- [Development](#development)
- [Project layout](#project-layout)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Why MacSweep

Most "Mac cleaner" tools are opaque: they ask for full-disk access, delete on
your behalf, and give you no way to verify what they touched. MacSweep takes the
opposite stance:

- **Auditable by design.** A single module — [`SafetyGuard`](src/main/safety/SafetyGuard.ts) — decides whether any path may be deleted. There is no second code path.
- **Preview before you commit.** Dry-run is the default; you always see the exact file list and reclaimable size first.
- **Only ever cleans disposable garbage.** Caches, logs, Trash, derived data, package-manager caches, installer DMGs — all regenerable. Your own files are scanned for awareness but never deleted automatically.
- **Same engine, local or remote.** Manage a fleet of Macs over SSH/Tailscale with identical behaviour and identical safety guarantees.

## Features

- 📊 **Live system dashboard** — disk, RAM (with memory-pressure), CPU load, and a composite optimisation score (0–100).
- 🧹 **Categorised cleanup** — caches, logs, Trash, Xcode derived data, Homebrew/npm/pip caches, DMGs, and more, each with size and file count.
- 🔍 **Dry-run preview** — inspect the largest entries and total reclaimable size before anything is touched.
- 🗑️ **Trash-first deletion** — files go to the Trash by default; permanent delete is explicit, per-clean opt-in.
- 🔒 **Security-locked categories** — keychains, SSH/GPG keys and other sensitive paths are scannable but rendered locked, with no clean action.
- 👤 **Review-only categories** — your personal data (e.g. large Downloads) is surfaced for awareness but never auto-deleted.
- 🌐 **Remote Macs** — scan and clean any reachable Mac over SSH or Tailscale, using key-based auth only.
- ✅ **Self-verifying safety** — a built-in smoke test asserts the SafetyGuard's behaviour across 33 cases.

## Safety model

Every deletion routes through [`SafetyGuard`](src/main/safety/SafetyGuard.ts).
It is **deny-by-reasoning**: a path is deletable only if *no* blocklist rule
matches. Sensitive paths raise a `SafetyViolation` and are **never** deleted.

**Permanently blocked**

- Keychains, SSH/GPG keys, browser cookies and saved passwords
- `/System`, `/usr`, `/bin`, `/sbin`, `/etc`, `/Applications`
- `.app` bundle internals
- Any path containing `password`, `credential`, `token`, `secret`, `certificate`, `private key`, or key/cert file extensions

**Operational guarantees**

| Guarantee | Behaviour |
| --- | --- |
| **Dry-run default** | You always preview the exact file list and size before anything is deleted. |
| **Trash first** | Deletions use Electron's `shell.trashItem` locally and `mv` to `~/.Trash` remotely. Permanent delete is opt-in per clean. |
| **Locked categories** | Security-sensitive categories render greyed out with a 🔒 badge, no clean button, and a tooltip explaining why. |
| **Garbage only** | Only regenerable/disposable data is ever cleanable. macOS and apps simply rebuild it. |
| **Review-only data** | Categories holding your own files are marked **👤 Review manually** and are never deleted automatically. |
| **Key-auth only** | Remote connections use SSH key auth exclusively — passwords are never stored or prompted for. |

Verify the guard yourself:

```bash
npm run smoke      # builds, then runs the SafetyGuard smoke test (33 cases)
```

## Architecture

MacSweep is a standard Electron three-process app with a strict, context-isolated
bridge between the privileged main process and the renderer.

```
┌──────────────────────────────────────────────────────────────┐
│  Renderer (React)                                              │
│  Dashboard UI · category cards · confirm/remote modals        │
└───────────────▲──────────────────────────────────────────────┘
                │  window.macsweep  (typed, context-isolated)
┌───────────────┴──────────────────────────────────────────────┐
│  Preload bridge                                                │
└───────────────▲──────────────────────────────────────────────┘
                │  IPC (typed contract in src/shared/ipc.ts)
┌───────────────┴──────────────────────────────────────────────┐
│  Main process                                                  │
│                                                                │
│   TargetManager ──► LocalTarget  / RemoteTarget (SSH)          │
│                          │                                     │
│        ┌─────────────────┼───────────────────┐                │
│     Scanner          SystemStats          Cleaner             │
│        │                                      │                │
│        └──────────── SafetyGuard ◄────────────┘                │
│                   (single deletion chokepoint)                 │
└──────────────────────────────────────────────────────────────┘
```

Local and remote targets share one shell surface (`find`, `stat`, `df`,
`vm_stat`, `sysctl`), so scanning and cleaning behave identically on either —
the same `Cleaner`, the same `SafetyGuard`, the same results.

## Requirements

- **macOS** (the cleanup categories and stats are macOS-specific)
- **Node.js 18+** and npm
- For remote Macs: an SSH-reachable host (directly or via Tailscale) with key-based auth configured

## Getting started

```bash
git clone https://github.com/zala-dev/macsweep.git
cd macsweep
npm install
npm run dev        # launch the app with hot reload
```

To produce a production build:

```bash
npm run build      # build into out/
npm run start      # preview the production build
```

## Usage

1. Launch the app — the dashboard shows live disk, RAM, CPU and your optimisation score.
2. MacSweep scans all categories and shows the reclaimable size for each.
3. Pick a category and review the **dry-run preview** (largest entries + total size).
4. Click **Clean** to move items to the Trash, or opt into **permanent delete** for that clean.
5. Locked (🔒) and review-only (👤) categories are shown for awareness but never cleaned automatically.

## Remote Macs (SSH / Tailscale)

Open **Remote Macs** in the top bar and add a profile:

| Field | Description |
| --- | --- |
| Label | A friendly name for the machine |
| Host | Hostname, IP, or Tailscale machine name |
| Port | SSH port (default `22`) |
| Username | SSH user on the remote Mac |
| Private key path | Path to your local SSH private key |

Then pick the profile from the target selector to scan/clean that machine. Because
it only needs a reachable host, it works seamlessly over Tailscale. Connections
use **SSH key auth only** — passwords are never stored or prompted for.

## Cleanup categories

| Category | What it cleans | Status |
| --- | --- | --- |
| 🗄️ System Caches | `~/Library/Caches` — regenerated by macOS | Cleanable |
| 📦 Application Caches | Per-app caches under Application Support | Cleanable |
| 📝 Logs | Diagnostic and application logs | Cleanable |
| 🗑️ Trash | Items already in `~/.Trash` | Cleanable |
| 💿 Unused DMGs | `.dmg` installers in Downloads/Desktop | Cleanable |
| 🔨 Xcode Derived Data | Build intermediates Xcode regenerates | Cleanable |
| 🍺 Homebrew Cache | Downloaded bottles and formula caches | Cleanable |
| 📕 npm Cache | The npm package download cache | Cleanable |
| 🐍 pip Cache | The pip wheel/download cache | Cleanable |
| ⬇️ Large Downloads | Large files in `~/Downloads` | 👤 Review only |
| 🔐 Keychains & Credentials | Keychain databases | 🔒 Locked |
| 🗝️ SSH & GPG Keys | Private keys for SSH/GPG | 🔒 Locked |

## Development

```bash
npm install
npm run dev          # launch with hot reload
npm run typecheck    # zero TypeScript errors across main + renderer
npm run build        # production build into out/
npm run smoke        # build + run the SafetyGuard smoke test (33 cases)
```

| Script | Purpose |
| --- | --- |
| `dev` | Run the app in development with hot reload |
| `build` | Build main, preload and renderer into `out/` |
| `start` | Preview the production build |
| `typecheck` | Type-check both the Node (main/preload) and web (renderer) projects |
| `smoke` | Build, then run the SafetyGuard smoke test |

## Project layout

```
src/
  shared/        types + IPC contract shared by main & renderer
  main/
    safety/      SafetyGuard + smoke test  (the deletion chokepoint)
    target/      Target abstraction → LocalTarget / RemoteTarget (SSH)
    scanner/     category definitions + scanner
    cleaner/     preview builder + cleaner (calls SafetyGuard per path)
    stats/       disk / RAM / CPU + optimisation score
    remote/      saved remote-Mac profile store
    ipc.ts       IPC handlers
  preload/       context-isolated bridge (window.macsweep)
  renderer/      React dashboard UI
```

## Security

- All deletions pass through a single auditable [`SafetyGuard`](src/main/safety/SafetyGuard.ts).
- Sensitive paths are blocked permanently and verified by an automated smoke test.
- Remote access is SSH key-only; no credentials are stored or transmitted by MacSweep.
- The renderer is context-isolated and communicates only through a typed preload bridge.

Found a vulnerability? Please open a private security advisory rather than a
public issue.

## Contributing

Contributions are welcome. Please run `npm run typecheck` and `npm run smoke`
before opening a pull request, and keep all deletion logic routed through
`SafetyGuard`. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Released under the [MIT License](LICENSE).

<div align="center">
<sub>Built with ⚡ by ZALA</sub>
</div>
