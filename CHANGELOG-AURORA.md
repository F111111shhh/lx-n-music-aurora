# LX-N Music Aurora Changelog

## 1.8.85-aurora.9 - 2026-07-30

### 中文

- 改进歌曲缓存的使用：从列表再次播放、切换下一首，或重新打开应用后手动继续播放时，都会优先使用已缓存的可播放版本。即使偏好较高音质但已经缓存了较低音质，也会先尽快播放，减少等待。
- 在播放详情中手动选择音质时，会优先按照所选音质播放，不会因为已有较低音质缓存而改变你的选择。
- 下一首准备播放时会优先检查已有缓存，避免重复获取链接和不必要的网络检查；不会额外下载整首下一首歌曲。
- 成功换源后的候选歌曲会保存 7 天，最多保留 100 条；之后再次遇到同一首歌时更容易直接恢复播放。设置里的“换源歌曲信息数量”和清理按钮现在会反映实际保存的内容。
- 已保存的旧链接没有对应的歌曲缓存时，会先检查是否仍可用；失效后会及时重新获取，避免长时间卡在加载中。

### English

- Gives cached playable versions priority when replaying a song from a list, moving to the next track, or manually resuming after reopening the app. A lower-quality cached version can start promptly even when a higher quality is preferred.
- Keeps a manually selected quality in the play-detail view as the priority, so a lower-quality cache does not replace that choice.
- Checks existing cache first while preparing the next track, avoiding repeated link requests and unnecessary network checks without downloading the entire next song.
- Keeps successful source-change candidates for seven days, up to 100 entries, so the same song can be recovered more easily later. The source-change cache count and clear button now reflect stored data.
- Checks saved links without matching audio cache before use and refreshes invalid links promptly instead of remaining on a loading state.

## 1.8.85-aurora.8 - 2026-07-28

### 中文

- 修复 QQ 音乐部分公开歌单无法加载的问题：详情接口在返回成功状态时仍可能不给出歌单数据，现已改用 QQ 音乐当前网页使用的歌单详情接口。
- 修正 QQ 歌单详情的分页参数处理，并按 100 首歌曲获取详情后由应用本地分页展示，避免加载重试参数与页码混用。
- 核对网易云音乐、酷狗音乐、酷我音乐和咪咕音乐的歌单详情路径，未发现与 QQ 音乐相同的缺失详情数据问题。

### English

- Fixes certain public QQ Music playlists failing to load when the old detail
  endpoint returned a success status without playlist data. The app now uses
  the playlist-detail endpoint used by QQ Music's current web client.
- Corrects QQ playlist pagination handling and fetches up to 100 tracks for
  local pagination, preventing the retry parameter from being confused with a
  page number.
- Reviewed the playlist-detail paths for NetEase Cloud Music, Kugou, Kuwo, and
  Migu. No matching missing-detail-data issue was found.

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
