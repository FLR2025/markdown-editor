import { markdownToHtml } from './markdown'

// Preview and export share both normalization and the actual preview stylesheet rules.
export function previewContent(source: string, format: 'markdown' | 'html'): string {
  const doc = new DOMParser().parseFromString(format === 'markdown' ? markdownToHtml(source) : source, 'text/html')
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,base').forEach((el) => el.remove())
  doc.body.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach(({ name, value }) => {
      if (name.startsWith('on') || name === 'srcdoc' || (/^(href|src)$/i.test(name) && /^\s*javascript:/i.test(value))) el.removeAttribute(name)
    })
  })
  return doc.body.innerHTML
}

export function previewStyles(): string {
  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule.cssText.includes('.preview-body') && !rule.cssText.includes('preview-sync')) rules.push(rule.cssText)
      }
    } catch { /* External stylesheets are not part of the local preview theme. */ }
  }
  return `*{box-sizing:border-box}html{font-size:16px}body{margin:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}h1,h2,h3,h4,p,blockquote,pre,ul,ol{margin:0}h1,h2,h3,h4{font-size:inherit;font-weight:inherit}table{border-collapse:collapse}img{display:block}main{max-width:760px;margin:auto;padding:48px 40px}.preview-body{font-size:15px;line-height:1.7;color:#27272a}.preview-body> * + *{margin-top:.85em}${rules.join('\n')}@media print{main{max-width:none;padding:0}pre{white-space:pre-wrap}tr,img{break-inside:avoid}h1,h2,h3{break-after:avoid}}`
}
