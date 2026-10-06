import { zipSync, strToU8 } from 'fflate'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, ExternalHyperlink, ImageRun, Footer, Header, PageNumber, AlignmentType, PageOrientation } from 'docx'
import type { ExportSettings } from './exportFormats'

type OfficeSettings = ExportSettings & { pageSize?: 'A4' | 'Letter'; landscape?: boolean; marginMm?: number; headerFooter?: boolean; pageNumbers?: boolean }

const xml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)
export function base64(bytes: Uint8Array): string {
  let text = ''; for (const b of bytes) text += String.fromCharCode(b)
  return btoa(text)
}
const imageData = (src: string) => {
  const match = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/s.exec(src)
  if (!match) throw new Error('办公文档嵌入图片仅支持 PNG、JPEG、GIF；请转换图片或选择保留原链接。')
  return { type: (match[1] === 'jpeg' ? 'jpg' : match[1]) as 'png' | 'jpg' | 'gif', data: Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)) }
}

export async function officeDocument(html: string, format: 'docx' | 'odt', settings: OfficeSettings): Promise<string> {
  const root = new DOMParser().parseFromString(html, 'text/html').body
  if (format === 'odt') return base64(odt(root, settings))
  const inline = (node: Node, style: { bold?: boolean; italics?: boolean; strike?: boolean; font?: string } = {}): Array<TextRun | ExternalHyperlink | ImageRun> => {
    if (node.nodeType === 3) return [new TextRun({ text: node.textContent ?? '', ...style })]
    if (!(node instanceof Element)) return []
    if (node.tagName === 'BR') return [new TextRun({ break: 1 })]
    if (node.tagName === 'INPUT') return [new TextRun(node.hasAttribute('checked') ? '[x] ' : '[ ] ')]
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? ''
      if (settings.imageMode === 'link') return [new ExternalHyperlink({ link: src, children: [new TextRun({ text: node.getAttribute('alt') || src, style: 'Hyperlink' })] })]
      return [new ImageRun({ ...imageData(src), transformation: { width: Math.min(Number(node.getAttribute('width')) || 480, 600), height: Number(node.getAttribute('height')) || 320 } })]
    }
    const next = { ...style, bold: style.bold || /^(B|STRONG|TH)$/.test(node.tagName), italics: style.italics || /^(I|EM)$/.test(node.tagName), strike: style.strike || /^(S|DEL)$/.test(node.tagName), font: /^(CODE|PRE)$/.test(node.tagName) ? 'Courier New' : style.font }
    const children = Array.from(node.childNodes).flatMap((n) => inline(n, next))
    if (node.tagName === 'A') return [new ExternalHyperlink({ link: node.getAttribute('href') || '', children })]
    return children
  }
  const blocks = (parent: Element): Array<Paragraph | Table> => Array.from(parent.childNodes).flatMap((node): Array<Paragraph | Table> => {
    if (!(node instanceof Element)) return node.textContent?.trim() ? [new Paragraph(node.textContent)] : []
    const tag = node.tagName
    if (tag === 'TABLE') return [new Table({ rows: Array.from(node.querySelectorAll('tr')).map((row) => new TableRow({ children: Array.from(row.children).filter((c) => /^(TD|TH)$/.test(c.tagName)).map((cell) => new TableCell({ children: [new Paragraph({ children: inline(cell) })] })) })) })]
    if (/^(UL|OL)$/.test(tag)) return Array.from(node.children).flatMap((li, i) => {
      const copy = li.cloneNode(true) as Element
      copy.querySelectorAll('ul,ol').forEach((n) => n.remove())
      return [new Paragraph({ children: [new TextRun(tag === 'OL' ? `${i + Number(node.getAttribute('start') || 1)}. ` : '• '), ...inline(copy)] }), ...Array.from(li.children).filter((el) => /^(UL|OL)$/.test(el.tagName)).flatMap((el) => blocksWrapper(el))]
    })
    if (/^(DIV|SECTION|ARTICLE|MAIN)$/.test(tag)) return blocks(node)
    const heading = /^H([1-6])$/.exec(tag)
    const language = node.querySelector('code')?.className.match(/language-([^\s]+)/)?.[1]
    return [new Paragraph({ children: [...(language ? [new TextRun({ text: `${language}\n`, bold: true })] : []), ...inline(node)], heading: heading ? HeadingLevel[`HEADING_${heading[1]}` as keyof typeof HeadingLevel] : undefined, border: tag === 'HR' ? { bottom: { color: 'AAAAAA', size: 6, style: 'single' } } : undefined })]
  })
  const blocksWrapper = (el: Element) => { const wrapper = document.createElement('div'); wrapper.append(el.cloneNode(true)); return blocks(wrapper) }
  const size = settings.pageSize === 'Letter' ? [12240, 15840] : [11906, 16838]
  const margin = Math.round((settings.marginMm ?? 20) * 1440 / 25.4)
  const doc = new Document({ sections: [{ properties: { page: { size: { width: size[0], height: size[1], orientation: settings.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: margin, bottom: margin, left: margin, right: margin } } }, headers: settings.headerFooter ? { default: new Header({ children: [new Paragraph(settings.fileName)] }) } : undefined, footers: settings.pageNumbers ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) } : undefined, children: blocks(root) }] })
  return base64(new Uint8Array(await Packer.toArrayBuffer(doc)))
}

function odt(root: Element, settings: OfficeSettings): Uint8Array {
  const files: Record<string, Uint8Array> = {}; const images: string[] = []
  const convert = (node: Node): string => {
    if (node.nodeType === 3) return xml(node.textContent ?? '').replace(/\n/g, '<text:line-break/>').replace(/ {2,}/g, (s) => `<text:s text:c="${s.length}"/>`)
    if (!(node instanceof Element)) return ''
    const tag = node.tagName; const inner = () => Array.from(node.childNodes).map(convert).join('')
    if (/^H[1-6]$/.test(tag)) return `<text:h text:outline-level="${tag[1]}">${inner()}</text:h>`
    if (/^(P|PRE|BLOCKQUOTE)$/.test(tag)) return `<text:p${tag === 'PRE' ? ' text:style-name="Code"' : ''}>${inner()}</text:p>`
    if (/^(B|STRONG|I|EM|CODE|S|DEL)$/.test(tag)) return `<text:span text:style-name="${/^(B|STRONG)$/.test(tag) ? 'Bold' : /^(S|DEL)$/.test(tag) ? 'Strike' : /^(CODE)$/.test(tag) ? 'CodeText' : 'Italic'}">${inner()}</text:span>`
    if (tag === 'A') return `<text:a xlink:href="${xml(node.getAttribute('href') || '')}">${inner()}</text:a>`
    if (tag === 'BR') return '<text:line-break/>'
    if (tag === 'INPUT') return node.hasAttribute('checked') ? '[x] ' : '[ ] '
    if (tag === 'HR') return '<text:p>────────────────</text:p>'
    if (/^(UL|OL)$/.test(tag)) return `<text:list text:style-name="${tag === 'OL' ? 'Numbered' : 'Bullets'}">${inner()}</text:list>`
    if (tag === 'LI') return `<text:list-item><text:p>${Array.from(node.childNodes).filter((n) => !(n instanceof Element) || !/^(UL|OL|P|DIV)$/.test(n.tagName)).map(convert).join('')}</text:p>${Array.from(node.children).filter((n) => /^(UL|OL|P|DIV)$/.test(n.tagName)).map(convert).join('')}</text:list-item>`
    if (tag === 'TABLE') return `<table:table>${inner()}</table:table>`
    if (tag === 'TR') return `<table:table-row>${inner()}</table:table-row>`
    if (/^(TH|TD)$/.test(tag)) return `<table:table-cell office:value-type="string"><text:p>${inner()}</text:p></table:table-cell>`
    if (tag === 'IMG') {
      let src = node.getAttribute('src') || ''
      if (settings.imageMode === 'embed') { const image = imageData(src); src = `Pictures/image${images.length}.${image.type}`; files[src] = image.data; images.push(src) }
      return `<draw:frame draw:name="Image${images.length}" text:anchor-type="as-char" svg:width="12cm" svg:height="8cm"><draw:image xlink:href="${xml(src)}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`
    }
    return inner()
  }
  const namespaces = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"'
  const content = Array.from(root.childNodes).map(convert).join('')
  const sizes = settings.pageSize === 'Letter' ? [215.9, 279.4] : [210, 297]; if (settings.landscape) sizes.reverse()
  files['content.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><office:document-content ${namespaces} office:version="1.2"><office:body><office:text>${content}</office:text></office:body></office:document-content>`)
  files['styles.xml'] = strToU8(`<?xml version="1.0"?><office:document-styles ${namespaces} office:version="1.2"><office:styles><style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style><style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style><style:style style:name="Strike" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style><style:style style:name="CodeText" style:family="text"><style:text-properties fo:font-family="monospace"/></style:style><style:style style:name="Code" style:family="paragraph"><style:text-properties fo:font-family="monospace"/></style:style><text:list-style style:name="Bullets"><text:list-level-style-bullet text:level="1" text:bullet-char="•"/></text:list-style><text:list-style style:name="Numbered"><text:list-level-style-number text:level="1" style:num-format="1"/></text:list-style></office:styles><office:automatic-styles><style:page-layout style:name="Page"><style:page-layout-properties fo:page-width="${sizes[0]}mm" fo:page-height="${sizes[1]}mm" fo:margin="${settings.marginMm ?? 20}mm" style:print-orientation="${settings.landscape ? 'landscape' : 'portrait'}"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="Page">${settings.headerFooter ? `<style:header><text:p>${xml(settings.fileName)}</text:p></style:header>` : ''}${settings.pageNumbers ? '<style:footer><text:p><text:page-number>1</text:page-number></text:p></style:footer>' : ''}</style:master-page></office:master-styles></office:document-styles>`)
  files['META-INF/manifest.xml'] = strToU8(`<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${images.map((name) => `<manifest:file-entry manifest:full-path="${name}" manifest:media-type="image/${name.endsWith('.jpg') ? 'jpeg' : name.split('.').pop()}"/>`).join('')}</manifest:manifest>`)
  return zipSync({ mimetype: [strToU8('application/vnd.oasis.opendocument.text'), { level: 0 }], ...files })
}
