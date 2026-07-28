# LX-N Music Aurora Changelog

## 1.8.85-aurora.7 - 2026-07-27

### 中文

- Aurora 已恢复应用内更新检查：更新通道以 <code>F111111shhh/lx-n-music-aurora</code> 的 GitHub Releases 为主来源，版本信息只会回退到本仓库 <code>aurora</code> 分支带 Aurora 通道标识的清单；安装包始终从对应 GitHub Release 下载并校验，不再使用原版 LX-N Music 的更新信息或分支 CDN 缓存返回的非 Aurora 版本。
- 修复应用内更新下载流程：使用版本独立的临时文件，检查 HTTP 状态、下载长度与 GitHub Release 提供的 SHA-256 后才安装。
- 清理旧的固定更新缓存，避免网络失败后误打开旧 APK、残缺文件或非 Aurora 安装包。
- 已于 2026-07-28 撤回 1.8.85-aurora.5 与 1.8.85-aurora.6 的 GitHub Release、下载资产及版本标签：两个版本的更新链路可能误识别非 Aurora 更新，或在下载失败后打开旧缓存 APK。原有变更记录保留以便审计；1.8.85-aurora.6 的正式 APK 签名未失效。已安装这两个版本的用户请先手动安装 <code>1.8.85-aurora.7</code>，之后可继续通过应用内更新获取后续 Aurora 版本。

### English

- Confirms that Aurora in-app update checks are restored. GitHub Releases for
  <code>F111111shhh/lx-n-music-aurora</code> are the primary update source;
  version information can fall back only to the channel-marked manifest on the
  same repository's <code>aurora</code> branch. The APK always comes from and
  is verified against the matching GitHub Release; upstream LX-N Music metadata
  and non-Aurora versions returned from branch-CDN caches are not accepted.
- Fixes the in-app update download flow: it uses a version-specific temporary
  file and installs only after HTTP status, byte length, and the GitHub Release
  SHA-256 digest all match.
- Clears the old fixed update cache so a failed network request cannot open a
  stale APK, partial file, or non-Aurora package.
- Withdraws the GitHub Releases, downloadable assets, and version tags for
  1.8.85-aurora.5 and 1.8.85-aurora.6 on 2026-07-28. Their update paths could
  misidentify a non-Aurora update or open a stale cached APK after a failed
  download. The original changelog records remain for audit; the formal
  1.8.85-aurora.6 APK signature was not invalid. Users of those versions
  should install 1.8.85-aurora.7 manually first; subsequent Aurora versions
  can use in-app updates.

## 1.8.85-aurora.6 - 2026-07-27

### 中文

- 更新检查优先使用 Aurora GitHub Releases API，并核验 Release tag 与 universal APK 资产，避免原始 GitHub 文件或分支 CDN 缓存导致版本信息错误。
- 保留带 Aurora 通道标识的版本清单作为后备来源；不符合 Aurora 格式的元数据仍会被拒绝。

### English

- Makes the Aurora GitHub Releases API the primary update source and verifies
  both the Release tag and universal APK asset, avoiding incorrect metadata
  from raw GitHub files or branch-CDN caches.
- Retains the channel-marked version manifest as a fallback; metadata outside
  the Aurora format remains rejected.

## 1.8.85-aurora.5 - 2026-07-27

### 中文

- 修复更新清单校验：仅接受带 Aurora 通道标识且版本号为
  `*-aurora.N` 的版本，避免原版 LX-N Music 或过期镜像缓存被误判为更新。
- 将 Aurora 更新清单、Release 标签和通用 APK 作为同一发布单元，确保应用内下载目标存在且与当前签名一致。

### English

- Validates update metadata as Aurora-only: it must carry the Aurora channel
  marker and a `*-aurora.N` version, preventing upstream LX-N Music metadata
  or stale mirror data from being reported as an update.
- Treats the Aurora manifest, Release tag, and universal APK as one release
  unit so the in-app download target exists and uses the current signing key.

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
