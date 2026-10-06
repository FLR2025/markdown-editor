import { markdownToHtml, htmlToMarkdown } from './markdown'
import { previewContent, previewStyles } from './previewDocument'

export type ExportFormatId = 'markdown' | 'html' | 'txt' | 'json'
export type ExportSettings = {
  includeMetadata: boolean
  preserveMarkdown: boolean
  imageMode: 'link' | 'embed'
  keepTaskState: boolean
  keepCodeLanguage: boolean
  fileName: string
}
export type ExportContext = {
  sourceFormat: 'markdown' | 'html'
  fileName: string
  timestamp: string
  settings: ExportSettings
}
export type ExportFormat = {
  id: ExportFormatId
  label: string
  extension: string
  defaultBaseName: string
  extensions: string[]
  convert: (source: string, ctx: ExportContext) => string | Promise<string>
}

function plain(html: string): string {
  return html.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|section|article|h[1-6]|li|blockquote|pre|tr|table)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim()
}
function body(source: string, format: 'markdown' | 'html') { return previewContent(source, format) }
function markdown(source: string, format: 'markdown' | 'html') { return format === 'markdown' ? source : htmlToMarkdown(source) }
function esc(s: string) { return s.replace(/[<>&'\"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c) }
function htmlDocument(ctx: ExportContext, html: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(ctx.fileName)}</title><style>${previewStyles()}</style></head><body><main class="preview-body">${html}</main></body></html>`
}
function metadata(ctx: ExportContext) { return ctx.settings.includeMetadata ? { format: ctx.sourceFormat, fileName: ctx.fileName, exportedAt: ctx.timestamp } : {} }

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'markdown', label: 'Markdown', extension: 'md', defaultBaseName: '未命名', extensions: ['md', 'markdown', 'mdown', 'mdx'], convert: (s, c) => markdown(s, c.sourceFormat) },
  { id: 'html', label: 'HTML', extension: 'html', defaultBaseName: '未命名', extensions: ['html', 'htm'], convert: (s, c) => htmlDocument(c, body(s, c.sourceFormat)) },
  { id: 'txt', label: '纯文本', extension: 'txt', defaultBaseName: '未命名', extensions: ['txt', 'text'], convert: (s, c) => plain(body(s, c.sourceFormat)) },
  { id: 'json', label: 'JSON', extension: 'json', defaultBaseName: '未命名', extensions: ['json'], convert: (s, c) => JSON.stringify({ ...metadata(c), content: c.settings.preserveMarkdown ? s : markdown(s, c.sourceFormat) }, null, 2) }
]
export function getExportFormat(id: ExportFormatId): ExportFormat { const found = EXPORT_FORMATS.find((f) => f.id === id); if (!found) throw new Error(`未知导出格式: ${id}`); return found }
export { previewStyles as PREVIEW_EXPORT_CSS } from './previewDocument'
