# Changelog

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本号采用[语义化版本](https://semver.org/lang/zh-CN/)。

记录对使用者有意义的功能与行为变更，按版本倒序排列；后续版本按 `Added`、`Changed`、`Deprecated`、`Removed`、`Fixed`、`Security` 分类，仅保留有内容的分类。未发布变更放在 `Unreleased`，发布时使用 `## [版本号] - YYYY-MM-DD` 标题。

## [1.0.0] - 2026-09-30

### Added

- 单 HTML 中文甘特图，支持离线使用及窄屏布局。
- 项目增删改、日期与进度校验、预设及自定义配色、拖拽和按钮排序、删除后 7 秒内撤销。
- 月份与周时间轴、“今天”标记，以及 65%、80%、100%、125%、150% 五档缩放。
- localStorage 自动保存合法数据，支持 JSON 配置导入与导出。
- 完整 SVG / PNG 导出，保留当前缩放与“今天”设置；长图 PNG 自动调整倍率。
