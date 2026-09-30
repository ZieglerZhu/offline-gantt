# 离线项目甘特图

**v1.0** · 用 Chrome 或 Edge 打开 [project-gantt.html](project-gantt.html)，无需安装、服务器或网络。版本记录见 [CHANGELOG](CHANGELOG.md)。

## 使用

- 填写项目名称、起止日期、0～100 的整数进度及配色；支持拖拽、上下移动和删除后 7 秒内撤销。
- 使用“今天”标记和五档缩放调整时间轴；SVG / PNG 导出完整图表，保留当前显示设置。
- 导出 JSON 备份，导入时校验并确认替换当前计划。可导入 [示例配置](tests/fixtures/demo.json) 体验。

合法数据自动保存到浏览器 localStorage；未完成的新项目和非法输入不保存，图表保留最后一次合法状态。移动或重命名 HTML、换浏览器或清理数据可能影响恢复，建议定期备份 JSON。SVG / PNG 用于分享，恢复编辑需要 JSON。

项目包含起止当天，整体跨度最多两个日历年。极短项目可悬停查看详情；PNG 默认按 2 倍尺寸生成，长图自动降低倍率。使用系统字体。

## 开发

需要 Node.js 22 或更新版本。源码位于 `src/`，模块职责与加载顺序见 [构建脚本](scripts/build.mjs)。修改源码后构建成品，无需安装第三方包：

```bash
node scripts/build.mjs
```

核心测试和只读成品检查：

```bash
node --test tests/core.test.mjs
node scripts/build.mjs --check
```

`--check` 只比较、不写文件；检查现有成品时不要先重建。

浏览器测试使用 Playwright 及配套 Chromium：

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

安装后可直接运行 `npm run test:browser`，截图、导出样例和报告写入 `tests/artifacts/`。[GitHub Actions](.github/workflows/ci.yml) 在 push 和 pull request 时运行核心检查与浏览器回归，并保存浏览器输出。

## 许可证

Copyright (c) 2026 ZieglerZhu · [GNU GPL v3，仅此版本](LICENSE)（`GPL-3.0-only`）。

重新分发时请附带 LICENSE 并提供对应源码。
