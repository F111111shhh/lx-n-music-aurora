# LX-N Music Aurora

[中文](README.md)

LX-N Music Aurora is an unofficial maintenance fork of
[`souvenp/lx-netease-music-mobile`](https://github.com/souvenp/lx-netease-music-mobile),
focused on QQ Music source stability fixes for the LX-N Music 1.8.85 code line.

> This project is not officially affiliated with LX Music, LX-N Music, QQ Music,
> NetEase Cloud Music, or any music service provider.

## Project Scope

- Project name: LX-N Music Aurora
- Release version: `1.8.85-aurora.1`
- Git tag: `v1.8.85-aurora.1`
- Upstream: `souvenp/lx-netease-music-mobile`
- Baseline: upstream commit `ab08729`, matching LX-N Music `1.8.85`
- License: inherited from upstream, `Apache-2.0`

Aurora only packages the QQ Music source fixes while keeping the original LX-N Music features, interface, and usage patterns as intact as possible.

## Fixes

- Adds retry, backoff, and empty-result guards for QQ source search.
- Keeps QQ playback on the QQ source first, with same-source quality fallback to reduce unintended switching to other sources.
- Applies the same QQ quality fallback strategy to downloads and removes 0-byte files before retrying.
- Avoids reusing stale QQ URLs and prevents cross-source fallback results from polluting QQ URL cache entries.
- Preserves same-source behavior for list playback, next-track preloading, and manual playback actions.
- Adds defensive parsing for QQ search result fields that may be absent in some responses.

## Preserved Behavior

- Android package id remains `com.lxnetease.music.mobile`, so the original app data directory and system associations can still be used.
- Existing LX-N Music features are intentionally kept.
- GitHub source metadata, Release title, APK display name, and APK version name all use the Aurora identity.

## Install

Download the APK from GitHub Releases. After installation, Android should show the app as `LX-N Music Aurora` with version name `1.8.85-aurora.1`.

The APK is signed with a debug certificate. If another LX-N Music build signed with a different certificate is already installed, Android may reject an in-place upgrade. Back up your app data before uninstalling an existing build.

## Verification

- APK asset: `LX-N-Music-Aurora_1.8.85-aurora.1.apk`
- Package id: `com.lxnetease.music.mobile`
- Display name: `LX-N Music Aurora`
- Version name: `1.8.85-aurora.1`
- versionCode: `70004`
- SHA-256: `2F0D17C5BD137C0C2E9BEC8A148C77AC76208BF69D0B0F3D5FBF665BF816A125`
- APK signature: v1 / v2 / v3 verified
- No phone or emulator was connected in this environment, so no automated on-device playback/download regression test was run

## Legal Notice

This repository is provided for personal study, maintenance, and compatibility fixes. External source scripts, playback, and downloads may be governed by third-party service terms, regional law, and copyright rules. Use responsibly.
