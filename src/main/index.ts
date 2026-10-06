import { app, BrowserWindow, shell, ipcMain, dialog, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { promises as fs, createReadStream, statSync } from 'node:fs'
import http from 'node:http'
import * as fflate from 'fflate'
import {
  classifyFile,
  saveSession,
  loadSession,
  clearSession,
  type PersistedSession
} from './lib/fileGuard'

const isDev = !app.isPackaged

const APP_ICON_PATH = join(__dirname, '../renderer/app-icon.png')

// 优先用 package.json 里的 productName（Electron 会自动读取），兜底用硬编码字符串
const APP_NAME = app.getName() // 内部已返回 productName 或 name

// 模块级待打开文件路径：渲染端未 ready 时由主进程缓存，等 takePendingFile 取走
let pendingFilePath: string | null = null

// 单实例锁：第二个进程会立即退出并把文件路径交给已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  bootstrap()
}

/** 应用所有启动入口共用的引导流程 */
function bootstrap(): void {
  // macOS：在 app ready 之前注册 open-file 事件，否则会丢失启动文件
  pendingFilePath = extractFilePathFromArgv(process.argv)
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (app.isReady()) {
      forwardOpenFile(filePath)
    } else {
      pendingFilePath = filePath
    }
  })

  // Windows / Linux：第二个实例启动时，把它的文件路径交给已有窗口
  app.on('second-instance', (_event, argv) => {
    const filePath = extractFilePathFromArgv(argv)
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
    if (filePath) forwardOpenFile(filePath)
  })

  app.whenReady().then(() => {
    // macOS dev 模式：把 dock 图标也换掉
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(nativeImage.createFromPath(APP_ICON_PATH))
    }

    let mainWindow: BrowserWindow | null = null

        // 仅返回路径，不在主进程预读（让渲染端用 readFileWithProgress 走流式 + 进度）
    ipcMain.handle('dialog:open', async () => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        properties: ['openFile'],
        // 不限制类型，支持打开任意文件
        filters: [{ name: '所有文件', extensions: ['*'] }]
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return { filePath: result.filePaths[0] }
    })

    ipcMain.handle('file:read', async (_e, filePath: string) => {
      const content = await fs.readFile(filePath, 'utf-8')
      return { filePath, content }
    })

    /**
     * 带进度的「文本」文件读取：流式分块读取，通过 file:read-progress:event 事件回传进度。
     * 解决双击大文件直接白屏的问题。
     *
     * 3.0 起策略：不再白名单/黑名单拦截。所有文件都能进，由 viewer 层决定怎么显示。
     * 仍然保留 256MB 上限（V8 字符串上限 + 编辑器内存考量）。
     */
    const MAX_READ_BYTES = 256 * 1024 * 1024
    ipcMain.handle(
      'file:read-progress',
      async (event, filePath: string): Promise<{ filePath: string; content: string; total: number }> => {
        const stat = statSync(filePath)
        const total = stat.size
        if (total > MAX_READ_BYTES) {
          const sizeMB = (total / 1024 / 1024).toFixed(1)
          throw new Error(
            `文件过大（${sizeMB} MB），超过 256 MB 限制。\n请使用更专业的工具打开此文件。`
          )
        }

        const stream = createReadStream(filePath)
        const chunks: Buffer[] = []
        let read = 0
        let lastEmit = 0
        for await (const chunk of stream) {
          const buf = chunk as Buffer
          chunks.push(buf)
          read += buf.length
          const now = Date.now()
          if (now - lastEmit > 60 || read === total) {
            lastEmit = now
            event.sender.send('file:read-progress:event', {
              filePath,
              read,
              total
            })
          }
        }
        const buffer = Buffer.concat(chunks)
        return { filePath, content: buffer.toString('utf-8'), total }
      }
    )

    /**
     * 「二进制」文件读取：返回 base64 + mime + size，由 viewer 自己消费。
     * 同样 256MB 上限。
     */
    ipcMain.handle(
      'file:read-binary',
      async (
        _e,
        filePath: string
      ): Promise<{ filePath: string; base64: string; bytes: number; mime: string }> => {
        const stat = statSync(filePath)
        const total = stat.size
        if (total > MAX_READ_BYTES) {
          const sizeMB = (total / 1024 / 1024).toFixed(1)
          throw new Error(`文件过大（${sizeMB} MB），超过 256 MB 限制。`)
        }
        const buf = await fs.readFile(filePath)
        return {
          filePath,
          base64: buf.toString('base64'),
          bytes: total,
          mime: guessMime(filePath)
        }
      }
    )

    /**
     * ZIP 列表：返回内部每个 entry 的元信息（不下载内容）。
     */
    ipcMain.handle('zip:list', async (_e, filePath: string) => {
      const buf = await fs.readFile(filePath)
      // 用 unzipSync 拿全部 entries；如果不是 zip，会抛 EOCD not found
      const entries: fflate.Unzipped = fflate.unzipSync(new Uint8Array(buf))
      const list = Object.keys(entries)
        .sort()
        .map((name) => {
          const data = entries[name]
          // fflate 用末尾 '/' 标记目录
          if (name.endsWith('/') || data.length === 0) {
            return { name, size: 0, isDir: true }
          }
          return { name, size: data.length, isDir: false }
        })
      return { filePath, entries: list, totalBytes: buf.length }
    })

    /**
     * ZIP 抽取单个文件到磁盘
     */
    ipcMain.handle(
      'zip:extract-entry',
      async (
        _e,
        payload: { filePath: string; entryName: string; destPath: string }
      ) => {
        const buf = await fs.readFile(payload.filePath)
        const entries: fflate.Unzipped = fflate.unzipSync(new Uint8Array(buf))
        const data = entries[payload.entryName]
        if (!data) throw new Error(`ZIP 内不存在条目：${payload.entryName}`)
        // 自动创建父目录
        await fs.mkdir(join(payload.destPath, '..'), { recursive: true })
        await fs.writeFile(payload.destPath, Buffer.from(data))
        return { ok: true, path: payload.destPath, bytes: data.length }
      }
    )

    /**
     * ZIP 抽取全部文件到指定目录
     */
    ipcMain.handle(
      'zip:extract-all',
      async (_e, payload: { filePath: string; destDir: string }) => {
        const buf = await fs.readFile(payload.filePath)
        const entries: fflate.Unzipped = fflate.unzipSync(new Uint8Array(buf))
        await fs.mkdir(payload.destDir, { recursive: true })
        let count = 0
        for (const [name, data] of Object.entries(entries)) {
          if (name.endsWith('/')) continue
          const out = join(payload.destDir, name)
          await fs.mkdir(join(out, '..'), { recursive: true })
          await fs.writeFile(out, Buffer.from(data))
          count++
        }
        return { ok: true, count, destDir: payload.destDir }
      }
    )

    /**
     * ZIP 另存为：把新的 entry 映射写回成一个新 zip
     *   entries: { [name]: Uint8Array | string }
     * 调用方在 renderer 里维护「当前 zip 内部状态」，要保存时调这里
     */
    ipcMain.handle(
      'zip:save',
      async (
        _e,
        payload: { sourcePath: string; destPath: string; entries: Record<string, string | { base64: string }> }
      ) => {
        const files: Record<string, Uint8Array> = {}
        for (const [name, val] of Object.entries(payload.entries)) {
          if (typeof val === 'string') {
            files[name] = fflate.strToU8(val)
          } else {
            files[name] = Uint8Array.from(Buffer.from(val.base64, 'base64'))
          }
        }
        const zipped = fflate.zipSync(files, { level: 6 })
        await fs.writeFile(payload.destPath, Buffer.from(zipped))
        return { ok: true, path: payload.destPath, bytes: zipped.length }
      }
    )

    /**
     * 选择目录（用于 zip 抽取目标）
     */
    ipcMain.handle('dialog:select-dir', async () => {
      const win = BrowserWindow.getFocusedWindow()
      const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
      if (r.canceled || r.filePaths.length === 0) return null
      return { dirPath: r.filePaths[0] }
    })

    /**
     * 会话状态持久化（崩溃恢复 / 优雅退出都用）
     */
    ipcMain.handle('state:save', async (_e, payload: Omit<PersistedSession, 'version' | 'savedAt'>) => {
      await saveSession(payload)
      return { ok: true }
    })
    ipcMain.handle('state:load', async () => {
      const s = await loadSession()
      return s
    })
    ipcMain.handle('state:clear', async () => {
      await clearSession()
      return { ok: true }
    })

    ipcMain.handle(
      'dialog:save',
      async (_e, { content, defaultPath }: { content: string; defaultPath?: string }) => {
        const win = BrowserWindow.getFocusedWindow()
        const result = await dialog.showSaveDialog(win!, {
          defaultPath: defaultPath ?? '未命名.md',
          // 不限制类型
          filters: [{ name: '所有文件', extensions: ['*'] }]
        })
        if (result.canceled || !result.filePath) return null
        await fs.writeFile(result.filePath, content, 'utf-8')
        return { filePath: result.filePath }
      }
    )

    /**
     * 导出专用 save 对话框：
     * - 渲染端传入已转换好的最终内容 + 默认文件名 + 扩展名过滤器
     * - 主进程弹 save dialog → 写入磁盘
     * - 默认文件名若没有扩展名，自动补上第一个过滤器中的扩展名
     */
    ipcMain.handle('dialog:save-pdf', async (_e, payload: { html: string; defaultBaseName: string }) => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showSaveDialog(win!, { defaultPath: `${payload.defaultBaseName}.pdf`, filters: [{ name: 'PDF 文件', extensions: ['pdf'] }] })
      if (result.canceled || !result.filePath) return null
      if (!win) throw new Error('没有可用的导出窗口')
      const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
      try {
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`)
        const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
        await fs.writeFile(result.filePath, pdf)
        return { filePath: result.filePath }
      } finally {
        printWindow.destroy()
      }
    })

    ipcMain.handle(
      'dialog:save-export',
      async (
        _e,
        payload: {
          content: string
          defaultBaseName: string
          extensions: string[]
          encoding?: 'utf8' | 'base64'
        }
      ) => {
        const win = BrowserWindow.getFocusedWindow()
        // macOS 上 filter 用「格式说明」+ extensions 列表更直观
        const filters = [
          {
            name: '所有支持的文件',
            extensions: payload.extensions
          },
          { name: '所有文件', extensions: ['*'] }
        ]
        // 智能补全扩展名
        let defaultPath = payload.defaultBaseName
        const lower = defaultPath.toLowerCase()
        const hasExt = payload.extensions.some((e) => lower.endsWith('.' + e))
        if (!hasExt && payload.extensions.length > 0) {
          defaultPath = `${defaultPath}.${payload.extensions[0]}`
        }
        const result = await dialog.showSaveDialog(win!, {
          defaultPath,
          filters
        })
        if (result.canceled || !result.filePath) return null
        await fs.writeFile(result.filePath, payload.encoding === 'base64' ? Buffer.from(payload.content, 'base64') : payload.content)
        return { filePath: result.filePath }
      }
    )

    ipcMain.handle(
      'file:write',
      async (_e, { filePath, content }: { filePath: string; content: string }) => {
        await fs.writeFile(filePath, content, 'utf-8')
        return { filePath }
      }
    )

    /**
     * 文件重命名：只改文件名（保留目录），不修改内容。
     * 渲染端在 TitleBar 点击文件名触发；自动补回原扩展名。
     */
    ipcMain.handle(
      'file:rename',
      async (_e, payload: { filePath: string; newName: string }) => {
        const { filePath, newName } = payload
        if (!filePath) throw new Error('文件尚未保存到磁盘，无法重命名')
        if (!newName || !newName.trim()) throw new Error('新文件名不能为空')
        // 构造新路径：dirname 保留，basename 用 newName
        const sep = filePath.includes('\\') ? '\\' : '/'
        const idx = filePath.lastIndexOf(sep)
        const dir = idx >= 0 ? filePath.slice(0, idx) : ''
        const newPath = dir ? `${dir}${sep}${newName}` : newName
        if (newPath === filePath) return { filePath }
        // 如果目标已存在 → 报错
        try {
          await fs.access(newPath)
          throw new Error(`目标文件已存在：${newName}`)
        } catch (err) {
          // ENOENT 表示不存在 → 可以继续
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
        }
        await fs.rename(filePath, newPath)
        return { filePath: newPath, oldFilePath: filePath }
      }
    )

    ipcMain.handle('app:set-title', (_e, title: string) => {
      const win = BrowserWindow.getFocusedWindow()
      if (win) win.setTitle(title)
    })

    // 渲染端主动询问启动时是否有待打开的文件——只返回路径，不预读
    ipcMain.handle('app:pending-file', async () => {
      if (!pendingFilePath) return null
      const filePath = pendingFilePath
      pendingFilePath = null
      return { filePath }
    })

    createWindow()
    mainWindow = BrowserWindow.getAllWindows()[0]
    buildMenu(() => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        mainWindow = BrowserWindow.getAllWindows()[0]
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

/** 从 argv 中提取要打开的文件路径（支持任意文件类型） */
function extractFilePathFromArgv(argv: string[]): string | null {
  // 跳过 electron / electron.exe / 脚本路径，看起来像文件路径的就是
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue
    // 任意看起来像文件路径（带盘符或以 / 开头的绝对路径，或当前目录下能 stat 成功的）
    if (/^[a-zA-Z]:[\\/]/.test(arg) || arg.startsWith('/') || arg.startsWith('./') || arg.startsWith('..')) {
      return arg
    }
  }
  return null
}

/** 把文件路径交给当前渲染进程（不预读，让渲染端走带进度的 read） */
function forwardOpenFile(filePath: string): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('app:open-file', { filePath })
  } else {
    // 渲染端还没准备好，存到 pendingFilePath，等 takePendingFile 时取走
    pendingFilePath = filePath
  }
}

/** 等待 URL 可达（用于 dev 模式下 Vite 冷启动） */
function waitForUrl(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    let aborted = false
    const tick = () => {
      if (aborted) return
      const req = http
        .get(url, () => {
          req.destroy()
          if (!aborted) resolve()
        })
        .on('error', () => {
          req.destroy()
          if (aborted) return
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Dev server 在 ${timeoutMs}ms 内未就绪: ${url}`))
          } else {
            setTimeout(tick, 400)
          }
        })
    }
    tick()
  })
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    // dev 模式立即显示，避免 Vite 冷启动期间窗口一直不出现
    // 生产模式仍 hide，等首帧 ready-to-show 消除白闪
    show: !isDev,
    autoHideMenuBar: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    icon: nativeImage.createFromPath(APP_ICON_PATH),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 生产模式：替换掉 index.html 里偏宽松的 CSP，换成更严格的策略
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com data:; " +
              "img-src 'self' data: https: blob:; " +
              "connect-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com;"
          ]
        }
      })
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // dev 模式保险：Vite 真的卡死时，2s 后强制显示（背景已经是白的，不会闪）
  let devShowFallback: ReturnType<typeof setTimeout> | null = null
  if (isDev) {
    devShowFallback = setTimeout(() => {
      if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show()
      }
    }, 2000)
  }

  // dev 模式：URL 不可达时无限重试 + 友好提示（避免 ERR_CONNECTION_REFUSED 白屏）
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL']
    void waitForUrl(url)
      .then(() => {
        if (mainWindow.isDestroyed()) return
        return mainWindow.loadURL(url)
      })
      .catch((err) => {
        if (mainWindow.isDestroyed()) return
        const msg = `无法连接到 Vite dev server:\n${url}\n\n${String(err)}`
        dialog.showErrorBox('Dev Server 启动失败', msg)
      })
  } else if (isDev) {
    // 兜底：env 未注入时按 5173 试一下
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // dev 模式：渲染端加载失败时自动重试（解决中途重启 dev server 后白屏）
  if (isDev) {
    let retries = 0
    mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
      // 忽略用户主动 reload (errorCode -3 = ERR_ABORTED)
      if (errorCode === -3) return
      console.warn(`[dev] did-fail-load #${retries + 1}:`, errorCode, errorDescription, validatedURL)
      if (retries++ >= 5 || !process.env['ELECTRON_RENDERER_URL']) return
      setTimeout(() => {
        if (mainWindow.isDestroyed()) return
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!).catch(() => {})
      }, 800)
    })

    mainWindow.webContents.on('did-finish-load', () => {
      retries = 0
      if (devShowFallback) {
        clearTimeout(devShowFallback)
        devShowFallback = null
      }
    })
  }

  // ════════════════════════════════════════════
  // 渲染进程自恢复（崩了 / 卡了都要能救回来）
  // ════════════════════════════════════════════
  attachRecoveryHandlers(mainWindow)

  return mainWindow
}

/**
 * 给一个 BrowserWindow 装上「崩了/卡了自己救回来」的全套保护：
 * 1) render-process-gone：渲染进程意外崩溃 → 1s 后 reload，靠 state.json 恢复
 * 2) unresponsive：渲染进程无响应 → 等 8s 还没恢复 → reload
 * 3) 健康检查 watchdog：主进程主动 ping 渲染进程，连续 3 次 ping 不回 → reload
 *
 * 关键前提：渲染端必须把当前 tabs 持续存到 state.json，reload 之后从 state.json 拉回来
 */
function attachRecoveryHandlers(win: BrowserWindow): void {
  const wc = win.webContents

  // 1) 渲染进程崩了
  wc.on('render-process-gone', (_event, details) => {
    console.error('[recovery] render-process-gone:', details)
    // 告诉用户：正在恢复（通过对话框，因为渲染端已经死了没法 IPC）
    if (details.reason !== 'clean-exit') {
      dialog.showMessageBox({
        type: 'warning',
        title: '渲染进程已自动重启',
        message: '编辑器窗口刚刚意外停止，已自动恢复。',
        detail: `原因：${details.reason}\n未保存的修改已尽力保留。`,
        buttons: ['知道了']
      })
    }
    // 等用户看完对话框再 reload
    setTimeout(() => {
      if (!win.isDestroyed()) wc.reload()
    }, 500)
  })

  // 2) 渲染进程无响应（卡死）
  let unresponsiveTimer: ReturnType<typeof setTimeout> | null = null
  wc.on('unresponsive', () => {
    console.warn('[recovery] render-process-gone-unresponsive')
    if (unresponsiveTimer) return // 已经在等用户确认了，别重复弹
    unresponsiveTimer = setTimeout(() => {
      unresponsiveTimer = null
      if (!win.isDestroyed()) wc.reload()
    }, 8000)
    // 给用户一个「立刻重启」的机会（按钮 = 立即重启；默认 8s 后也会自动重启）
    dialog.showMessageBox({
      type: 'warning',
      title: '渲染进程无响应',
      message: '编辑器窗口似乎卡住了。',
      detail: '将在 8 秒后自动重启，或点击「立即重启」马上恢复。',
      buttons: ['立即重启', '再等等'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    }).then(({ response }) => {
      if (unresponsiveTimer) {
        clearTimeout(unresponsiveTimer)
        unresponsiveTimer = null
      }
      if (response === 0 && !win.isDestroyed()) wc.reload()
    })
  })

  wc.on('responsive', () => {
    // 又活过来了，把定时器收掉
    if (unresponsiveTimer) {
      clearTimeout(unresponsiveTimer)
      unresponsiveTimer = null
    }
  })

  // 3) 主进程主动 ping 渲染进程（防止 unresponsive 事件没触发的极端情况）
  let pingFailCount = 0
  const watchdog = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(watchdog)
      return
    }
    let answered = false
    const timer = setTimeout(() => {
      if (answered) return
      answered = true
      pingFailCount++
      console.warn(`[recovery] watchdog ping fail #${pingFailCount}`)
      if (pingFailCount >= 3) {
        console.error('[recovery] watchdog: 3 consecutive ping failures, reloading')
        wc.reload()
        pingFailCount = 0
      }
    }, 3000)
    try {
      wc.executeJavaScript('true', true).then(() => {
        if (answered) return
        answered = true
        clearTimeout(timer)
        if (pingFailCount > 0) pingFailCount = 0
      }).catch(() => {
        // 渲染端崩溃时 executeJavaScript 会 reject → 算失败
        if (answered) return
        answered = true
        clearTimeout(timer)
        pingFailCount++
        if (pingFailCount >= 3) {
          wc.reload()
          pingFailCount = 0
        }
      })
    } catch {
      clearTimeout(timer)
      pingFailCount++
    }
  }, 5000)
}

/** 用扩展名猜一个常用的 mime，方便 image/audio/video 直接喂给 <img>/<video> */
function guessMime(filePath: string): string {
  const lower = filePath.toLowerCase()
  const dotIdx = lower.lastIndexOf('.')
  const ext = dotIdx >= 0 ? lower.slice(dotIdx + 1) : ''
  const m: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    pdf: 'application/pdf',
    json: 'application/json',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript'
  }
  return m[ext] ?? 'application/octet-stream'
}

function buildMenu(getWin: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: `关于 ${APP_NAME}`,
                click: () => getWin()?.webContents.send('menu:about')
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { label: `隐藏 ${APP_NAME}`, role: 'hide' as const },
              { label: '隐藏其他', role: 'hideOthers' as const },
              { label: '全部显示', role: 'unhide' as const },
              { type: 'separator' as const },
              { label: `退出 ${APP_NAME}`, role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => getWin()?.webContents.send('menu:new')
        },
        {
          label: '打开…',
          accelerator: 'CmdOrCtrl+O',
          click: () => getWin()?.webContents.send('menu:open')
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => getWin()?.webContents.send('menu:save')
        },
        {
          label: '另存为…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => getWin()?.webContents.send('menu:save-as')
        },
        {
          label: '导出…',
          accelerator: 'CmdOrCtrl+E',
          click: () => getWin()?.webContents.send('menu:export')
        },
        { type: 'separator' },
        isMac ? { label: '关闭', role: 'close' } : { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '切换预览',
          accelerator: 'CmdOrCtrl+P',
          click: () => getWin()?.webContents.send('menu:toggle-preview')
        },
        { type: 'separator' },
        { label: '重新加载', role: 'reload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [{ label: '最小化', role: 'minimize' }, { label: '关闭', role: 'close' }]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}