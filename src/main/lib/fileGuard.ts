import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

// ────────────────────────────────────────────
// 1) 编辑器支持的「viewer」分类
// ────────────────────────────────────────────
//
// 3.0 起策略反转：文件一定能打开；不同类型走不同 viewer。
// 这里只定义分类，不再做白名单拦截。

export type FileKind =
  | 'text'      // md / html / txt / json / 代码 等可编辑文本
  | 'image'     // png / jpg / gif / webp / bmp / ico
  | 'svg'       // svg（文本但是矢量）
  | 'pdf'       // pdf（暂未实现专用 viewer，但可识别）
  | 'audio'     // mp3 / wav / flac / ogg / m4a
  | 'video'     // mp4 / mov / mkv / webm
  | 'archive'   // zip / rar / 7z / tar / gz（zip 已实现 viewer）
  | 'unsupported'

export const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx',
  'html', 'htm', 'xhtml',
  'txt', 'text', 'log',
  'json', 'jsonc', 'json5',
  'css', 'scss', 'less', 'sass',
  'js', 'jsx', 'mjs', 'cjs',
  'ts', 'tsx',
  'vue', 'svelte',
  'xml', 'yml', 'yaml', 'toml',
  'ini', 'conf', 'cfg',
  'sh', 'bash', 'zsh',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h',
  'cpp', 'hpp', 'cc', 'cxx',
  'sql', 'graphql', 'gql'
])

export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'
])

export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'
])

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mov', 'mkv', 'webm', 'avi', 'flv', 'wmv'
])

export const ARCHIVE_EXTENSIONS = new Set([
  'zip'  // 先只支持 zip；rar/7z/tar 走 unsupported
])

export function classifyFile(filePath: string): FileKind {
  const lower = filePath.toLowerCase()
  const dotIdx = lower.lastIndexOf('.')
  const ext = dotIdx >= 0 ? lower.slice(dotIdx + 1) : ''
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (ext === 'svg') return 'svg'
  if (ext === 'pdf') return 'pdf'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archive'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  return 'unsupported'
}

// ────────────────────────────────────────────
// 2) 二进制嗅探：判断内容是不是二进制（用于「扩展名缺失/可疑」时降级到 binary viewer）
// ────────────────────────────────────────────

export function looksBinary(buf: Buffer): boolean {
  if (!buf || buf.length === 0) return false
  const sample = buf.subarray(0, Math.min(4096, buf.length))
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true
  }
  let ctrl = 0
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i]
    if (b < 32 && b !== 10 && b !== 13 && b !== 9) ctrl++
    if (b === 127) ctrl++
  }
  return ctrl / sample.length > 0.1
}

// ────────────────────────────────────────────
// 3) 会话状态持久化（崩溃恢复用）
// ────────────────────────────────────────────

const STATE_VERSION = 3
const STATE_FILE = 'session.json'

export type PersistedTab = {
  id: string
  filePath: string | null
  fileName: string
  /** text/svg 时是字符串；image/audio/video 是 dataUrl；zip 是 null + meta */
  content: string | null
  contentFormat: 'markdown' | 'html' | null
  kind: FileKind
  /** zip / image / video 等不适合内联到 session.json 的，存元数据（文件大小、entry 列表等） */
  meta?: Record<string, unknown>
  dirty: boolean
}

export type PersistedSession = {
  version: number
  savedAt: string
  tabs: PersistedTab[]
  activeId: string | null
}

function statePath(): string {
  return join(app.getPath('userData'), STATE_FILE)
}

export async function saveSession(
  session: Omit<PersistedSession, 'version' | 'savedAt'>
): Promise<void> {
  const payload: PersistedSession = {
    version: STATE_VERSION,
    savedAt: new Date().toISOString(),
    tabs: session.tabs,
    activeId: session.activeId
  }
  const tmp = statePath() + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(payload), 'utf-8')
  await fs.rename(tmp, statePath())
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const raw = await fs.readFile(statePath(), 'utf-8')
    const parsed = JSON.parse(raw) as PersistedSession
    if (parsed.version !== STATE_VERSION) return null
    if (!Array.isArray(parsed.tabs)) return null
    return parsed
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try {
    await fs.unlink(statePath())
  } catch {
    // 文件不存在无所谓
  }
}