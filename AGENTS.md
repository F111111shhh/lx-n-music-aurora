# LX-N Music Aurora Agent Guide

## Project Scope

- This repository is the Aurora maintenance fork of LX-N Music.
- The Android package id remains `com.lxnetease.music.mobile`.
- The app is React Native 0.73 with Android native code under `android/`.
- Treat the current working tree and Git history as the source of truth. Chat
  history and project memory are only supporting context.

## Branch Rules

- `main` tracks `souvenp/lx-netease-music-mobile` upstream and must not carry
  Aurora-only work.
- `aurora` is the integration and release branch. Do not make unrelated or
  unverified changes directly on it.
- Start a user-visible feature or isolated bug fix from `aurora` on a branch
  named `feature/<short-name>` or `fix/<short-name>`.
- `backup/aurora-local-before-sync` and
  `backup/aurora-remote-before-sync` are temporary recovery refs from the
  initial Aurora synchronization. Never merge them as part of normal work.
  Delete them only after explicit user approval.

## Before Editing

1. Run `git status --short --branch` and `git log -1 --oneline`.
2. Read this file and the files closest to the requested behavior.
3. Check for existing patterns before adding a new abstraction or setting.
4. Preserve user changes and never reset, clean, or discard work without
   explicit approval.

## Aurora Behavior To Preserve

- Keep original LX-N Music sources, playlists, downloads, sync, settings, and
  common workflows unless a change is strictly necessary for the request.
- Playback and downloads support the selectable source-first and quality-first
  fallback strategies. Maintain the same behavior for all supported sources.
- QQ Music search, URL resolution, quality fallback, empty-download protection,
  and equivalent cross-source safeguards are deliberate Aurora compatibility
  changes. Do not revert them incidentally.
- The player detail view shows actual quality and allows choosing another
  available quality for the current track.
- Lyric highlighting, scaling, tap preview, and scroll timing are tuned
  user-facing behavior. Verify them together when lyric code changes.
- In-app update checks are intentionally disabled. Releases are distributed
  through GitHub Releases; do not restore forced or automatic update behavior
  without an explicit request.
- Never commit release keystores, `android/keystore.properties`, APKs, or other
  generated signing material.

## Release Conventions

- GitHub Release titles, bodies, and their source files under
  `.github/release-notes/` use Simplified Chinese only unless the user
  explicitly asks for another language. Update the local source first, then
  use it unchanged when creating or editing the corresponding GitHub Release.
  This does not change the bilingual README or `CHANGELOG-AURORA.md` policy.
- Keep README release information version-neutral. Preserve the package id,
  display name, and upstream details, then link to `CHANGELOG-AURORA.md` and
  GitHub Releases. Put a specific version or tag only in package metadata, the
  Aurora changelog, and its matching release note.

## Code Map

- `src/core/init/player/`: player lifecycle, playback state, preload, and lyric
  synchronization.
- `src/core/download.ts`, `src/core/music/download.ts`, `src/store/download/`:
  download resolution and state.
- `src/utils/musicSdk/`: per-source search, quality, lyric, and URL behavior.
- `src/screens/PlayDetail/`: play detail UI, lyrics, and current-quality UI.
- `src/screens/Home/Views/Setting/settings/`: settings UI and player/download
  configuration.
- `android/`: native Android integration and Gradle configuration.

## Verification

- Always run `git diff --check` for edited files.
- For TypeScript changes, use `npx tsc --noEmit` when practical. Distinguish
  pre-existing diagnostics from newly introduced ones.
- For JavaScript or React Native changes, use the narrowest relevant check
  first; `npm run build-test` is the lightweight Android bundle check.
- Run `npm run pack:android:debug` when Android build coverage is needed.
- Run the signed release build only when requested and never commit generated
  build artifacts.
- Report changed files, validation performed, unverified behavior, and any
  known risk before considering a task complete.

## Handoffs

For work that spans conversations or pauses before completion, create a copy of
[`doc/handoffs/TEMPLATE.md`](doc/handoffs/TEMPLATE.md). Keep it short and
current. Remove an obsolete handoff or mark it completed when the task lands so
that later agents are not guided by stale status.
