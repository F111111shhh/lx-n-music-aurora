# LX-N Music Aurora

<p align="right"><a href="./README.md">简体中文</a> | <a href="./README.en.md">English</a></p>

LX-N Music Aurora 是基于
[souvenp/lx-netease-music-mobile](https://github.com/souvenp/lx-netease-music-mobile)
的非官方维护 Fork。它保留 LX-N Music 的主要功能与使用习惯，并整理当前 Aurora 分支的
播放、下载、音源回退和歌词体验改进。

> 本项目与 LX Music、LX-N Music 及任何音乐服务提供方均无官方关联。

## 发布信息

- 当前版本：<code>1.8.85-aurora.3</code>
- 发布标签：<code>v1.8.85-aurora.3</code>
- Android 包名：<code>com.lxnetease.music.mobile</code>
- Android 显示名：<code>LX-N Music Aurora</code>
- 上游：<code>souvenp/lx-netease-music-mobile</code>
- 许可证：沿用上游 [Apache License 2.0](LICENSE)
- 变更记录：[CHANGELOG-AURORA.md](CHANGELOG-AURORA.md)

## Aurora 功能

- 播放和下载共用可在“播放设置”中选择的链接回退策略：
  - **同源优先**：当前音源按可用音质从高到低尝试，再考虑其它音源。
  - **同音质优先**：先在全部候选音源上尝试目标音质，再逐级降低音质。
- 改进 QQ 音乐源搜索的重试与结果校验，并对 QQ、酷我等音源的音质别名和候选链接做兼容处理，减少不必要的切源、过期 URL 和空文件下载。
- 播放详情进度条下方显示当前实际音质；点击可查看并切换这首歌可用的音质。
- 歌词页包含当前句高亮、缩放、点击预览和滚动同步方面的 Aurora 改进。
- 已关闭应用内更新检测；后续版本通过 [GitHub Releases](https://github.com/F111111shhh/lx-n-music-aurora/releases) 发布。
- 不移除原有音源、列表、下载、同步、设置或其它常用功能。

## 安装

请从 [GitHub Releases](https://github.com/F111111shhh/lx-n-music-aurora/releases)
下载通用 APK。

本版本使用新的私有 Release 签名。若设备安装的是旧 Aurora、原版 LX-N Music 或任何使用
不同签名的同包名版本，Android 不能直接覆盖安装。首次迁移前请导出重要设置、歌单和数据，
然后卸载旧版并安装本版本。之后的 Aurora Release 会继续使用同一把签名密钥，可正常覆盖升级。

## 说明

这是个人维护的兼容性分支。外部音源脚本、联网播放和下载可能受服务条款、地区限制和版权法律
影响，请自行确认使用方式的合规性。
