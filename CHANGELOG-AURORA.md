# LX-N Music Aurora Changelog

## 1.8.85-aurora.1 - 2026-07-07

### 中文

- 基于 `souvenp/lx-netease-music-mobile` 的 LX-N Music `1.8.85` 正式源码提交 `ab08729`。
- 修复 QQ 音源搜索偶发加载失败：增加重试、退避等待、空结果重试和缺字段保护。
- 修复 QQ 音源播放容易自动切到其它来源的问题：QQ 歌曲优先在 QQ 同源内按音质降级尝试。
- 修复 QQ 音源下载可能产生 0B 文件的问题：下载空文件会删除并继续尝试可用 QQ 音质。
- 修复 QQ URL 缓存复用过期链接、被其它来源结果污染的问题。
- 调整播放入口、列表播放和下一首预加载逻辑，减少 QQ 音源被错误切源。
- 保留原 LX-N Music 主要功能、界面和使用习惯。

### English

- Based on upstream LX-N Music `1.8.85` commit `ab08729` from
  `souvenp/lx-netease-music-mobile`.
- Improved QQ source search stability with retry, backoff, empty-result retry,
  and defensive field handling.
- Kept QQ playback on the QQ source first, with same-source quality fallback.
- Improved QQ downloads by removing 0-byte files and retrying available QQ
  qualities.
- Avoided stale QQ URL reuse and prevented cross-source cache pollution.
- Adjusted playback entry points, list playback, and next-track preloading to
  reduce unintended source switching.
- Preserved the main LX-N Music feature set, interface, and usage patterns.
