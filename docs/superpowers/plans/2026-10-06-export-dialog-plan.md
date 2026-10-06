# 导出对话框实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将导出对话框改为 B 侧栏工厂风格，支持可用的扩展导出格式、格式相关设置和统一预览内容转换。

**Architecture:** 保留现有 `ExportFormat` 转换注册表和主进程保存 IPC，在渲染层把导出流程从“点击格式立即保存”改为“选择格式、调整设置、开始导出”。面向呈现的格式继续使用统一 HTML 片段，新增格式先实现浏览器/文本可可靠生成的格式，PDF、DOCX、ODT 不伪装为已实现，若依赖不足则在界面中禁用并给出明确错误。

**Tech Stack:** React 18, TypeScript, Electron IPC, Tiptap, marked, turndown, Tailwind CSS

---

### Task 1: 扩展导出类型与转换上下文

**Files:**
- Modify: `src/renderer/src/lib/exportFormats.ts`
- Modify: `src/renderer/src/App.tsx`

- [ ] 将 `ExportFormatId` 增加 `yaml`、`csv`、`xml`，保留现有四种格式；暂不把没有可靠转换器的 `pdf`、`docx`、`odt` 注册为可用格式。
- [ ] 将 `ExportContext` 增加 `settings` 字段，定义通用设置类型：`includeMetadata`、`preserveMarkdown`、`imageMode`、`keepTaskState`、`keepCodeLanguage`、`fileName`。
- [ ] 为 YAML、CSV、XML 实现真实转换函数：
  - YAML 输出 `format`、`fileName`、`exportedAt`、`content`，按设置决定是否包含元数据。
  - CSV 将预览 HTML 中的第一个表格转换为首行表头和后续数据行；没有表格时输出 `content` 列，正确转义双引号和换行。
  - XML 输出合法 XML，转义文本节点，按设置决定是否包含元数据。
- [ ] 将 JSON 转换改为读取 `ctx.settings.includeMetadata`，避免界面设置无效。
- [ ] 在 `App.tsx` 构造默认设置，并将其传给 `format.convert`。

### Task 2: 重做导出对话框

**Files:**
- Modify: `src/renderer/src/components/ExportDialog.tsx`

- [ ] 删除搜索框、格式卡片和介绍文案，改为固定宽度的侧栏工位布局。
- [ ] 左侧只显示“导出格式”和“导出设置”两个导航项。
- [ ] 右侧格式列表显示格式名、扩展名和可用状态，默认选中源格式。
- [ ] 右侧设置页面根据所选格式显示真实可用控件：文件名、元数据、Markdown 标记、图片模式、任务状态、代码语言；CSV 额外显示表格转换提示。
- [ ] 底部固定显示“取消”和“开始导出”，开始按钮在格式未选择时禁用。
- [ ] 保留 `onPick(format)` 兼容入口，改为传出 `{ format, settings }`，同步更新 `App.tsx` 类型。
- [ ] 采用灰白背景、深灰标题栏、细边框、低圆角，删除渐变、阴影卡片和营销式文字。

### Task 3: 接入开始导出流程

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/ExportDialog.tsx`

- [ ] 将现有 `handleExportPick(format)` 改为接收 `{ format, settings }`。
- [ ] 在调用 `format.convert` 时传入完整 `ExportContext` 和设置。
- [ ] 保持现有 `saveExport` IPC，使用导出设置中的文件名作为 `defaultBaseName`，格式注册表中的扩展名作为过滤器。
- [ ] 转换失败时不关闭对话框，调用现有对话框错误机制显示具体原因。
- [ ] 导出成功后关闭导出对话框并显示简短成功提示，不增加额外介绍文本。

### Task 4: 样式与类型验证

**Files:**
- Modify: `src/renderer/src/index.css`（仅在 Tailwind 类不足时增加导出对话框专用类）

- [ ] 运行 `pnpm typecheck`，修复 renderer 和 main 类型错误。
- [ ] 运行 `pnpm build`，确认 Electron 构建成功。
- [ ] 手动验证 Markdown、HTML、TXT、JSON、YAML、CSV、XML 的导出文件扩展名和内容。
- [ ] 使用包含标题、任务列表、表格、代码块、图片和链接的文档验证 HTML/TXT/结构化导出不会丢失核心内容。
- [ ] 验证窄窗口下左侧导航、设置区和底部按钮仍可操作。
