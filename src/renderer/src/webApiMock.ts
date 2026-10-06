/**
 * Web 兼容层：为浏览器环境提供 mock 的 Electron API
 * 在 main.tsx 导入之前注入，使编辑器可以在纯 Web 环境运行
 */

// 检测是否在 Electron 环境
const isElectron = typeof window !== 'undefined' && 'electron' in window

// 如果已经有 api（Electron 环境），不覆盖
if (typeof window !== 'undefined' && !('api' in window)) {
  // 本地存储键名
  const SESSION_KEY = 'fuxiaoyu-md-session'

  // Web 环境：存储已选择的文件（key 为文件名，value 为文件内容）
  const fileStorage = new Map<string, { content: string; binary?: Blob }>()

  // 简单的 mock 实现
  const mockApi = {
    // 文件选择器 - 模拟打开文件
    // 注意：input 必须在 DOM 中且有正确的触发上下文才能弹出文件对话框
    openFile: (): Promise<{ filePath: string } | null> => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.markdown,.txt,.html,.htm,.svg'
        input.style.position = 'fixed'
        input.style.opacity = '0'
        input.style.pointerEvents = 'none'
        document.body.appendChild(input)
        input.onchange = async () => {
          const file = input.files?.[0]
          document.body.removeChild(input)
          if (file) {
            // 读取并存储文件内容
            const content = await file.text()
            fileStorage.set(file.name, { content })
            resolve({ filePath: file.name })
          } else {
            resolve(null)
          }
        }
        input.oncancel = () => {
          document.body.removeChild(input)
          resolve(null)
        }
        // 同步触发，确保在用户激活上下文中
        input.click()
      })
    },

    // 读取文件（带进度）- 从已存储的文件读取
    readFileWithProgress: (filePath: string): Promise<{ filePath: string; content: string; total?: number } | null> => {
      const stored = fileStorage.get(filePath)
      if (stored) {
        return Promise.resolve({ filePath, content: stored.content, total: stored.content.length })
      }
      return Promise.resolve(null)
    },

    // 读取二进制文件 - 从已存储的文件读取
    readFileBinary: (filePath: string): Promise<{ filePath: string; base64: string; bytes: number; mime: string }> => {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*,audio/*,video/*,.zip'
        input.style.position = 'fixed'
        input.style.opacity = '0'
        input.style.pointerEvents = 'none'
        document.body.appendChild(input)
        input.onchange = async () => {
          const file = input.files?.[0]
          document.body.removeChild(input)
          if (file) {
            const buffer = await file.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
            // 存储二进制文件供后续使用
            fileStorage.set(file.name, { content: '', binary: file })
            resolve({
              filePath: file.name,
              base64,
              bytes: file.size,
              mime: file.type || 'application/octet-stream'
            })
          } else {
            reject(new Error('No file selected'))
          }
        }
        input.oncancel = () => {
          document.body.removeChild(input)
          reject(new Error('No file selected'))
        }
        input.click()
      })
    },

    // ZIP 操作 - 简化实现
    zipList: async (filePath: string): Promise<{ filePath: string; entries: Array<{ name: string; size: number; isDir: boolean }>; totalBytes: number }> => {
      return { filePath, entries: [], totalBytes: 0 }
    },

    zipExtractEntry: async (payload: { filePath: string; entryName: string; destPath: string }) => {
      return { ok: true, path: payload.destPath, bytes: 0 }
    },

    zipExtractAll: async (payload: { filePath: string; destDir: string }) => {
      return { ok: true, destDir: payload.destDir }
    },

    zipSave: async (payload: { sourcePath: string; destPath: string; entries: Record<string, unknown> }) => {
      return { filePath: payload.destPath }
    },

    // 选择目录
    selectDir: async (): Promise<{ dirPath: string } | null> => {
      return null
    },

    // 文件读取进度事件
    onFileReadProgress: (handler: (p: { filePath: string; read: number; total: number }) => void) => {
      return () => {}
    },

    // 保存文件
    saveFile: async (content: string, defaultPath?: string): Promise<{ filePath: string } | null> => {
      return new Promise((resolve) => {
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultPath || 'untitled.md'
        a.onclick = () => {
          setTimeout(() => URL.revokeObjectURL(url), 100)
          resolve({ filePath: a.download })
        }
        a.click()
      })
    },

    // 导出专用保存
    saveExport: async (payload: { content: string; defaultBaseName: string; extensions: string[] }): Promise<{ filePath: string } | null> => {
      return new Promise((resolve) => {
        const ext = payload.extensions[0] || 'txt'
        const blob = new Blob([payload.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${payload.defaultBaseName}.${ext}`
        a.onclick = () => {
          setTimeout(() => URL.revokeObjectURL(url), 100)
          resolve({ filePath: a.download })
        }
        a.click()
      })
    },

    // 写入文件
    writeFile: async (filePath: string, content: string): Promise<{ filePath: string }> => {
      // Web 环境直接下载
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() || 'untitled.md'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
      return { filePath }
    },

    // 重命名文件
    renameFile: async (payload: { filePath: string; newName: string }): Promise<{ filePath: string }> => {
      const parts = payload.filePath.split('/')
      parts[parts.length - 1] = payload.newName
      return { filePath: parts.join('/') }
    },

    // 设置标题
    setTitle: (title: string) => {
      document.title = title
    },

    // 获取待打开文件
    takePendingFile: async (): Promise<{ filePath: string } | null> => {
      return null
    },

    // 监听打开文件事件
    onOpenFile: (handler: (payload: { filePath: string }) => void) => {
      return () => {}
    },

    // 监听应用错误
    onAppError: (handler: (payload: { title: string; message: string; detail?: string }) => void) => {
      return () => {}
    },

    // 保存会话
    saveSession: async (payload: {
      tabs: Array<{
        id: string
        filePath: string | null
        fileName: string
        content: string | null
        contentFormat: string | null
        kind: string
        meta?: Record<string, unknown>
        dirty: boolean
      }>
      activeId: string | null
    }) => {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
      } catch (e) {
        console.warn('Failed to save session:', e)
      }
    },

    // 加载会话
    loadSession: async () => {
      try {
        const data = localStorage.getItem(SESSION_KEY)
        return data ? JSON.parse(data) : null
      } catch (e) {
        return null
      }
    },

    // 清除会话
    clearSession: async () => {
      localStorage.removeItem(SESSION_KEY)
    },

    // 菜单事件
    onMenu: (channel: string, handler: () => void) => {
      // Web 环境使用键盘快捷键模拟菜单操作
      const keyMap: Record<string, string> = {
        'menu:new': 'n',
        'menu:open': 'o',
        'menu:save': 's',
        'menu:save-as': 'S',
        'menu:export': 'e',
        'menu:toggle-preview': 'p',
        'menu:about': ''
      }

      if (keyMap[channel]) {
        const key = keyMap[channel]
        const listener = (e: KeyboardEvent) => {
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
          const mod = isMac ? e.metaKey : e.ctrlKey
          if (mod && e.key.toLowerCase() === key && !e.shiftKey) {
            e.preventDefault()
            handler()
          }
        }
        window.addEventListener('keydown', listener)
        return () => window.removeEventListener('keydown', listener)
      }
      return () => {}
    }
  }

  // @ts-ignore
  window.api = mockApi
  console.log('[Web Mode] Electron API mock enabled')
}
