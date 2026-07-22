# LX-N Music Aurora

<p align="right"><a href="./README.md">简体中文</a> | <a href="./README.en.md">English</a></p>

LX-N Music Aurora is an unofficial maintenance fork of
[souvenp/lx-netease-music-mobile](https://github.com/souvenp/lx-netease-music-mobile).
It retains the main LX-N Music feature set while packaging the current Aurora
improvements for playback, downloads, source fallback, and lyrics.

> This project is not officially affiliated with LX Music, LX-N Music, or any
> music service provider.

## Release Information

- Current version: <code>1.8.85-aurora.2</code>
- Release tag: <code>v1.8.85-aurora.2</code>
- Android package id: <code>com.lxnetease.music.mobile</code>
- Android display name: <code>LX-N Music Aurora</code>
- Upstream: <code>souvenp/lx-netease-music-mobile</code>
- License: upstream [Apache License 2.0](LICENSE)

Branch convention:

- <code>main</code> tracks upstream <code>main</code> and contains no
  Aurora-specific changes.
- <code>aurora</code> is the downstream development and release branch.

## Aurora Functionality

- Playback and downloads share configurable URL fallback strategies:
  - **Source first** tries the current source through its available qualities
    before considering other sources.
  - **Quality first** tries the requested quality across all candidate sources,
    then progressively lowers the quality.
- Handles quality aliases and URL candidates used by QQ Music, Kuwo, and other
  sources to reduce unnecessary source switching, expired URLs, and empty downloads.
- Shows the actual playback quality below the progress bar; tap it to inspect
  and select an available quality for the current track.
- Includes Aurora lyric improvements for active-line highlighting, scaling,
  tap preview, and scroll synchronization.
- Does not intentionally remove existing sources, playlists, downloads, sync,
  settings, or other common LX-N Music features.

## Installation

Download the universal APK from
[GitHub Releases](https://github.com/F111111shhh/lx-n-music-aurora/releases).

This release uses a new private Release signing key. Android cannot install it
over an older Aurora build, stock LX-N Music build, or another same-package
build signed with a different key. Export important settings, playlists, and
data before uninstalling the older build for this one-time migration. Future
Aurora releases will use the same key and can update in place.

## Build And Upstream Sync

Local builds use Node.js, Android SDK, and Gradle:

~~~powershell
npm run pack:android
~~~

The Release key and <code>android/keystore.properties</code> stay local and
must never be committed to Git.

For upstream updates, update <code>main</code> first, validate it, then merge
it into <code>aurora</code>:

~~~powershell
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
git checkout aurora
git merge main
~~~

## Notice

This is a personally maintained compatibility branch. External source scripts,
network playback, and downloads may be governed by service terms, regional
restrictions, and copyright law. Confirm that your use is compliant.
