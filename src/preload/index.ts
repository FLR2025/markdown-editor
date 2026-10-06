import { contextBridge, ipcRenderer } from 'electron'

export type FilePathResult = { filePath: string } | null
export type OpenResult = { filePath: string; content: string; total?: number } | null
export type SaveResult = { filePath: string } | null

export type FileProgress = {
  filePath: string
  read: number
  total: number
}

const api = {
  /** 弹文件选择器，只返回路径（不预读） */
  openFile: (): Promise<FilePathResult> => ipcRenderer.invoke('dialog:open'),
  readFile: (filePath: string): Promise<OpenResult> => ipcRenderer.invoke('file:read', filePath),
  /** 带进度的文件读取（流式 + 实时进度） */
  readFileWithProgress: (filePath: string): Promise<OpenResult> =>
    ipcRenderer.invoke('file:read-progress', filePath),
  /** 读取二进制文件，返回 base64 + mime（用于图片/音视频 viewer） */
  readFileBinary: (
    filePath: string
  ): Promise<{ filePath: string; base64: string; bytes: number; mime: string }> =>
    ipcRenderer.invoke('file:read-binary', filePath),
  /** ZIP 操作 */
  zipList: (
    filePath: string
  ): Promise<{
    filePath: string
    entries: Array<{ name: string; size: number; isDir: boolean }>
    totalBytes: number
  }> => ipcRenderer.invoke('zip:list', filePath),
  zipExtractEntry: (payload: {
    filePath: string
    entryName: string
    destPath: string
  }): Promise<{ ok: true; path: string; bytes: number }> =>
    ipcRenderer.invoke('zip:extract-entry', payload),
  zipExtractAll: (payload: { filePath: string; destDir: string }) =>
    ipcRenderer.invoke('zip:extract-all', payload),
  zipSave: (payload: {
    sourcePath: string
    destPath: string
    entries: Record<string, string | { base64: string }>
  }) => ipcRenderer.invoke('zip:save', payload),
  /** 选择目录 */
  selectDir: (): Promise<{ dirPath: string } | null> =>
    ipcRenderer.invoke('dialog:select-dir'),
  /** 订阅读取进度事件（返回退订函数） */
  onFileReadProgress: (handler: (p: FileProgress) => void) => {
    // 用独立通道 'file:read-progress:event'，避免 invoke('file:read-progress')
    // 的返回值被这条监听器误吃（返回值没有 read 字段，会算成 NaN%）
    const listener = (_e: unknown, payload: FileProgress) => handler(payload)
    ipcRenderer.on('file:read-progress:event', listener)
    return () => ipcRenderer.removeListener('file:read-progress:event', listener)
  },
  saveFile: (content: string, defaultPath?: string): Promise<SaveResult> =>
    ipcRenderer.invoke('dialog:save', { content, defaultPath }),
  savePdf: (payload: { html: string; defaultBaseName: string }): Promise<SaveResult> => ipcRenderer.invoke('dialog:save-pdf', payload),
  /** 导出专用 save dialog（按格式补扩展名 + 限定过滤器） */
  saveExport: (payload: {
    content: string
    defaultBaseName: string
    extensions: string[]
    encoding?: 'utf8' | 'base64'
  }): Promise<SaveResult> => ipcRenderer.invoke('dialog:save-export', payload),
  writeFile: (filePath: string, content: string): Promise<SaveResult> =>
    ipcRenderer.invoke('file:write', { filePath, content }),
  /** 重命名磁盘上的文件（仅改文件名，目录不变） */
  renameFile: (payload: {
    filePath: string
    newName: string
  }): Promise<{ filePath: string; oldFilePath: string } | { filePath: string }> =>
    ipcRenderer.invoke('file:rename', payload),
  setTitle: (title: string) => ipcRenderer.invoke('app:set-title', title),
  /** 询问主进程：启动时是否带了要打开的文件（只返回路径） */
  takePendingFile: (): Promise<FilePathResult> => ipcRenderer.invoke('app:pending-file'),
  /**
   * 监听“主进程文件：先打开再唤起”场景下送来的文件路径
   * （macOS 双击已运行的 app，或 Windows 二次启动）
   */
  onOpenFile: (handler: (payload: { filePath: string }) => void) => {
    const listener = (_e: unknown, payload: { filePath: string }) => handler(payload)
    ipcRenderer.on('app:open-file', listener)
    return () => ipcRenderer.removeListener('app:open-file', listener)
  },
  /** 监听主进程送来的错误提示（用于显示自定义错误对话框） */
  onAppError: (handler: (payload: { title: string; message: string; detail?: string }) => void) => {
    const listener = (_e: unknown, payload: { title: string; message: string; detail?: string }) =>
      handler(payload)
    ipcRenderer.on('app:show-error', listener)
    return () => ipcRenderer.removeListener('app:show-error', listener)
  },
  // ──── 会话状态持久化（用于崩溃恢复 / 优雅退出） ────
  saveSession: (payload: {
    tabs: Array<{
      id: string
      filePath: string | null
      fileName: string
      content: string | null
      contentFormat: 'markdown' | 'html' | null
      kind: string
      meta?: Record<string, unknown>
      dirty: boolean
    }>
    activeId: string | null
  }) => ipcRenderer.invoke('state:save', payload),
  loadSession: () => ipcRenderer.invoke('state:load'),
  clearSession: () => ipcRenderer.invoke('state:clear'),
  onMenu: (channel: string, handler: () => void) => {
    const listener = () => handler()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore fallback
  window.api = api
}

export type Api = typeof api