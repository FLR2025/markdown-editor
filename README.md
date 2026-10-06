# 付小付 md 编辑器

一款基于 **Tiptap** 和 **Electron** 构建的现代化 Markdown 编辑器，界面简洁美观，功能丰富实用。

![macOS](https://img.shields.io/badge/macOS-Supported-brightgreen)
![Windows](https://img.shields.io/badge/Windows-Supported-brightgreen)
![Electron](https://img.shields.io/badge/Electron-33.3.0-blue)
![React](https://img.shields.io/badge/React-18.3-blue)

## 主要功能

- 📝 **实时预览** - 支持编辑/分栏/预览三种视图，切换流畅
- 📁 **多格式支持** - 支持 Markdown、HTML、图片、音视频、ZIP 压缩包等多种文件格式
- 🔧 **富文本编辑** - 标题、列表、任务列表、表格、代码块、引用等
- 🎨 **样式工具** - 文字颜色、背景高亮、文本对齐
- 🔗 **快捷插入** - 输入 `/` 快速插入块元素，选中文本弹出格式化工具条
- 📑 **多标签页** - 支持多文件同时编辑，双击文件在新标签中打开
- 💾 **会话恢复** - 意外退出后可自动恢复工作状态
- 📤 **多格式导出** - 支持导出为 Markdown、HTML、DOCX、PDF 等格式

## 支持的平台

- macOS 10.12+ (arm64 / x64)
- Windows 10+ (x64)
- Linux (AppImage)

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘N / Ctrl+N` | 新建文件 |
| `⌘O / Ctrl+O` | 打开文件 |
| `⌘S / Ctrl+S` | 保存 |
| `⌘⇧S / Ctrl+Shift+S` | 另存为 |
| `⌘P / Ctrl+P` | 切换预览 |
| `⌘E / Ctrl+E` | 导出 |
| `⌘W / Ctrl+W` | 关闭标签 |

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React 18** - UI 库
- **Tiptap** - 基于 ProseMirror 的富文本编辑器
- **Tailwind CSS** - 原子化 CSS 框架
- **Vite** - 快速构建工具
- **TypeScript** - 类型安全

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建应用
pnpm build

# 构建所有平台
pnpm build:all

# 仅构建 macOS
pnpm build:mac

# 仅构建 Windows
pnpm build:win
```

## 下载

从 [Releases](https://github.com/FLR2025/markdown-editor/releases) 页面下载最新版本。

## 开源许可

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

本项目的开发离不开以下开源项目的支持：

- **[Tiptap](https://tiptap.dev/)** - 基于 ProseMirror 的富文本编辑器框架
- **[Electron](https://electronjs.org/)** - 使用 Web 技术构建跨平台桌面应用
- **[React](https://react.dev/)** - 用于构建用户界面的 JavaScript 库
- **[Tailwind CSS](https://tailwindcss.com/)** - 功能优先的 CSS 框架
- **[Vite](https://vitejs.dev/)** - 下一代前端构建工具
- **[marked](https://marked.js.org/)** - Markdown 解析和编译器
- **[Turndown](https://mixmark-io.github.io/turndown/)** - 将 HTML 转换为 Markdown
- **[Tippy.js](https://atomiks.github.io/tippyjs/)** - 轻量级 Tooltip 库
- **[fflate](https://101arrowz.github.io/fflate/)** - 高速 ZIP 压缩/解压库
- **[docx](https://docx.js.org/)** - 使用 JavaScript 生成 DOCX 文件
- **[electron-builder](https://www.electron.build/)** - Electron 应用打包工具

感谢所有开源社区的贡献者们！

---

**付小付网络科技工作室** © 2024-2026  
官网：[www.fuxiaoyu.cn](https://www.fuxiaoyu.cn)
