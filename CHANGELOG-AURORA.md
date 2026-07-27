# LX-N Music Aurora Changelog

## 1.8.85-aurora.4 - 2026-07-27

### 中文

- 恢复应用内更新检查与安装包下载，版本信息和通用 APK 均以 Aurora GitHub Releases 为准。
- 在“软件更新”页明确 Aurora 更新来源，并提供 Releases 入口。
- 在“关于 LX-N Music”页保留上游说明，同时补充 Aurora 发布链、独立签名和首次迁移说明。

### English

- Restores in-app update checks and APK downloads, using Aurora GitHub Releases
  for both version metadata and the universal APK.
- Documents the Aurora update source and adds a Releases entry point in the
  Update screen.
- Retains the upstream About copy while clarifying Aurora releases, its
  independent signing key, and first-time migration.

## 1.8.85-aurora.3 - 2026-07-22

### 中文

- 修复播放详情歌词在部分字号下，当前高亮行缩放后被左右可见边界截断的问题。
- 横屏和竖屏歌词行均预留缩放安全区，保持现有高亮、点击预览和滚动定位行为。

### English

- Fixes active lyrics being clipped by the left and right visible bounds at
  certain font sizes after the highlight scale animation.
- Reserves scale-safe horizontal space in both portrait and landscape lyric
  views while preserving highlighting, tap preview, and scroll positioning.

## 1.8.85-aurora.2 - 2026-07-22

### 中文

- 基于已验证的 LX-N Music 1.8.85 Aurora 功能源码发布正式下游版本。
- 播放和下载统一使用可选的“同源优先”或“同音质优先”链接回退策略。
- 播放详情增加当前实际音质显示与可用音质切换入口。
- 包含 QQ 音乐源搜索重试、QQ、酷我及其它音源的音质映射、候选 URL、下载空文件和歌词体验改进。
- 已关闭应用内更新检测；新版本统一通过 GitHub Releases 发布。
- 使用独立的 Release 签名并提供可长期维护的 <code>main</code> 上游跟踪与
  <code>aurora</code> 下游分支结构。

### English

- Publishes the verified LX-N Music 1.8.85 Aurora feature set as a formal
  downstream release.
- Unifies playback and download URL fallback through selectable source-first
  and quality-first strategies.
- Adds actual playback-quality display and per-track quality selection in the
  play detail screen.
- Includes QQ Music source search retries plus quality mapping, URL candidate,
  empty-download, and lyric improvements for QQ, Kuwo, and other sources.
- Disables in-app update checks; new versions are published through GitHub
  Releases.
- Uses an independent Release signing key and establishes a maintainable
  upstream-tracking <code>main</code> branch with a downstream
  <code>aurora</code> branch.
