# LX-N Music Aurora

[English](README.en.md)

LX-N Music Aurora 是基于
[`souvenp/lx-netease-music-mobile`](https://github.com/souvenp/lx-netease-music-mobile)
的非官方维护 fork，重点整理 LX-N Music 1.8.85 代码线中的 QQ 音源稳定性修复。

> 本项目与 LX Music、LX-N Music、QQ 音乐、网易云音乐或任何音乐服务提供方没有官方关联。

## 项目定位

- 项目名称：LX-N Music Aurora
- 发行版本：`1.8.85-aurora.1`
- Git 标签：`v1.8.85-aurora.1`
- 上游来源：`souvenp/lx-netease-music-mobile`
- 源码基线：上游提交 `ab08729`，对应 LX-N Music `1.8.85`
- 许可证：沿用上游 `Apache-2.0`

Aurora 版只整理并发布 QQ 音乐音源相关修复，目标是尽量保持 LX-N Music 原有功能、界面和使用习惯不变。

## 本版修复内容

- QQ 音源搜索增加重试、退避等待和空结果保护，降低偶发“加载失败，点击尝试重新加载”的概率。
- QQ 音源播放时优先在 QQ 同源内部按音质降级尝试，减少误跳到其它来源。
- QQ 音源下载时同样在 QQ 同源内部尝试可用音质，并对 0B 空文件进行删除和重试。
- QQ 歌曲链接缓存不再直接复用可能过期的旧链接，也避免其它来源的切源结果污染 QQ 缓存。
- 播放列表、下一首预加载和手动播放入口对 QQ 音源保持同源策略，减少“尝试切换到其他来源”的误触发。
- 搜索结果解析补充字段保护，避免 QQ 返回结构缺字段时直接报错。

## 保留内容

- 保留原 LX-N Music 的 Android 包名：`com.lxnetease.music.mobile`，方便沿用原数据目录和系统关联。
- 保留原有主要功能，不移除其它音源、列表、下载、同步、设置等功能。
- GitHub 源码、Release 名称、APK 显示名和 APK 版本名统一使用 Aurora 标识。

## 安装说明

请从本仓库的 GitHub Release 下载 APK。安装后应用显示名为 `LX-N Music Aurora`，版本名为 `1.8.85-aurora.1`。

APK 使用调试证书签名。如果手机上已经安装其它签名的 LX-N Music，Android 可能不允许直接覆盖安装。建议先备份应用数据，再卸载旧版后安装 Aurora。

## 校验信息

- APK 文件名：`LX-N-Music-Aurora_1.8.85-aurora.1.apk`
- 包名：`com.lxnetease.music.mobile`
- 显示名：`LX-N Music Aurora`
- 版本名：`1.8.85-aurora.1`
- versionCode：`70004`
- SHA-256：`2F0D17C5BD137C0C2E9BEC8A148C77AC76208BF69D0B0F3D5FBF665BF816A125`
- APK 签名：v1 / v2 / v3 校验通过
- 当前环境未连接手机或模拟器，因此未做本机自动化播放/下载回归测试

## 法律与使用提醒

本仓库仅用于个人学习、维护和兼容性修复。外部音源脚本、音乐服务访问、下载和播放行为可能受到对应服务条款、地区法律法规或版权规则限制；请自行确认并承担使用责任。
