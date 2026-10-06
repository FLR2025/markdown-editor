// 共享的 FileKind 类型，与主进程 src/main/lib/fileGuard.ts 保持一致
export type FileKind =
  | 'text'
  | 'image'
  | 'svg'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'archive'
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

export const ARCHIVE_EXTENSIONS = new Set(['zip'])

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

export function extOf(filePath: string): string {
  const lower = filePath.toLowerCase()
  const dotIdx = lower.lastIndexOf('.')
  return dotIdx >= 0 ? lower.slice(dotIdx + 1) : ''
}