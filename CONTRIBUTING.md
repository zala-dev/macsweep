# Contributing to MacSweep

Thanks for your interest in improving MacSweep! This guide covers how to get set
up and the conventions to follow.

## Development setup

```bash
npm install
npm run dev        # launch the app with hot reload
```

## Before opening a pull request

Please make sure the following all pass:

```bash
npm run typecheck  # zero TypeScript errors across main + renderer
npm run smoke      # build + SafetyGuard smoke test (33 cases)
```

## Ground rules

- **All deletion logic must route through `SafetyGuard`.** There is exactly one
  deletion chokepoint ([`src/main/safety/SafetyGuard.ts`](src/main/safety/SafetyGuard.ts)).
  Never bypass it, and never delete a path that hasn't been cleared by the guard.
- **Only disposable garbage is cleanable.** New cleanable categories must be
  regenerable/disposable data (caches, logs, derived data, etc.). Anything that
  holds the user's own data must be `reviewOnly` or `locked`.
- **Add smoke-test cases** when you change safety behaviour or add categories,
  so the guarantees stay verifiable.
- **Keep the IPC contract typed.** Changes to the main↔renderer surface go
  through [`src/shared/ipc.ts`](src/shared/ipc.ts).
- **Match the existing code style** — naming, comments, and structure.

## Reporting security issues

Please open a private security advisory rather than a public issue for anything
that could expose user data or bypass the SafetyGuard.

## Commit & PR conventions

- Keep commits focused and descriptive.
- Describe what changed and why in the PR body, and note any safety implications.
