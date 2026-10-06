import { marked, Marked, type Tokens } from 'marked'
import TurndownService from 'turndown'

// ────────────────────────────────────────────
// marked config: markdown → HTML (GFM flavored, GitHub-style)
// ────────────────────────────────────────────
//
// 注意：marked v15 用 `new marked.Renderer()` + `marked.use({ renderer })`
// 这个组合会破坏内部的 parseInline，触发
// `Cannot read properties of undefined (reading 'parseInline')`。
// 这里改用对象式 renderer + 独立的 Marked 实例，既安全也避免污染全局。

const md = new Marked()

md.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false
})

md.use({
  renderer: {
    // GitHub 风格：新标签 + noopener
    link(token: Tokens.Link) {
      const titleAttr = token.title ? ` title="${escapeAttr(token.title)}"` : ''
      return (
        `<a href="${escapeAttr(token.href)}"${titleAttr} ` +
        `target="_blank" rel="noopener noreferrer">${token.text}</a>`
      )
    },
    // 用简单的 <pre><code> 结构，方便 highlight 库接管
    code(token: Tokens.Code) {
      const lang = (token.lang ?? '').trim().split(/\s+/)[0]
      const langAttr = lang ? ` class="language-${lang}"` : ''
      return `<pre><code${langAttr}>${escapeHtml(token.text)}</code></pre>`
    }
  }
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}

// ────────────────────────────────────────────
// turndown config: HTML → markdown
// ────────────────────────────────────────────
const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined'
})

// Task list checkboxes
turndown.addRule('taskListItem', {
  filter: (node) => {
    return (
      node.nodeName === 'LI' &&
      (node.parentNode as HTMLElement | null)?.getAttribute('data-type') === 'taskList'
    )
  },
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute('data-checked') === 'true'
    return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`
  }
})

// Image with title
turndown.addRule('image', {
  filter: 'img',
  replacement: (_content, node) => {
    const el = node as HTMLImageElement
    const src = el.getAttribute('src') ?? ''
    const alt = el.getAttribute('alt') ?? ''
    const title = el.getAttribute('title')
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`
  }
})

// Tables
turndown.addRule('tiptapTable', {
  filter: 'table',
  replacement: (_content, node) => {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return ''

    const headRow = rows[0]
    const isHead = !!headRow.querySelector('th')
    const headers = Array.from(headRow.querySelectorAll('th,td')).map((c) => c.textContent?.trim() ?? '')
    const bodyRows = (isHead ? rows.slice(1) : rows).map((r) =>
      Array.from(r.querySelectorAll('td,th')).map((c) => c.textContent?.trim() ?? '')
    )

    const headerLine = `| ${headers.join(' | ')} |`
    const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`
    const bodyLines = bodyRows.map((cells) => `| ${cells.join(' | ')} |`)

    return [headerLine, dividerLine, ...bodyLines].join('\n') + '\n\n'
  }
})

// Strikethrough
turndown.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`
})

// Fenced code block (preserve language)
turndown.addRule('fencedCodeBlock', {
  filter: (node) => {
    return node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE'
  },
  replacement: (_content, node) => {
    const codeEl = (node as HTMLElement).firstChild as HTMLElement
    const className = codeEl.getAttribute('class') ?? ''
    const langMatch = /language-([\w-]+)/.exec(className)
    const lang = langMatch ? langMatch[1] : ''
    const text = codeEl.textContent ?? ''
    return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`
  }
})

// Horizontal rule
turndown.addRule('hr', {
  filter: 'hr',
  replacement: () => '\n\n---\n\n'
})

// ────────────────────────────────────────────
// public API
// ────────────────────────────────────────────
export function markdownToHtml(mdStr: string): string {
  if (!mdStr) return '<p></p>'
  return md.parse(mdStr) as string
}

export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return ''
  return turndown.turndown(html)
}
