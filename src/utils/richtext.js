/**
 * Simple rich text (paragraphs, bold, italic, links, bullet and numbered
 * lists) for announcements. The server sanitises what is saved and sent
 * (pkg/broadcast/sanitize.go); this mirrors it for the composer's live
 * preview and for the editor's paste handling.
 */
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'HEAD', 'TITLE', 'TEXTAREA', 'SELECT', 'BUTTON', 'IMG', 'VIDEO', 'AUDIO'])
const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'PRE', 'TR'])

export function safeLink(href) {
  const u = String(href || '').trim()
  if (!u || /[<>"'\\\s]/.test(u)) return ''
  if (u.startsWith('/')) return u.startsWith('//') ? '' : u
  if (/^https?:\/\/[^/@\s]+/i.test(u)) return u
  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(u)) return u
  return ''
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const LIST = new Set(['UL', 'OL'])

function link(n, inner) {
  const href = safeLink(n.getAttribute('href'))
  if (!href) return inner
  return `<a href="${esc(href)}"${href.startsWith('/') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${inner}</a>`
}

function list(n) {
  const t = n.tagName.toLowerCase()
  let h = ''
  for (const c of Array.from(n.children)) {
    if (c.tagName === 'LI') h += `<li>${inline(c, true)}</li>`
    else if (LIST.has(c.tagName)) h += list(c)
  }
  return h ? `<${t}>${h}</${t}>` : ''
}

// Inline content of a node: text, bold, italic, links and line breaks.
function inline(node, inItem = false) {
  let h = ''
  for (const n of Array.from(node.childNodes)) {
    if (n.nodeType === 3) {
      h += esc(n.nodeValue.replace(/[\s\u00a0]+/g, ' '))
      continue
    }
    if (n.nodeType !== 1 || DROP.has(n.tagName)) continue
    const tag = n.tagName
    if (tag === 'BR') h += '<br>'
    else if (tag === 'B' || tag === 'STRONG') h += `<strong>${inline(n, inItem)}</strong>`
    else if (tag === 'I' || tag === 'EM') h += `<em>${inline(n, inItem)}</em>`
    else if (tag === 'A') h += link(n, inline(n, inItem))
    else if (LIST.has(tag)) h += inItem ? list(n) : '<br>' + inline(n, inItem)
    else if (BLOCK.has(tag) || tag === 'LI') h += (h ? '<br>' : '') + inline(n, inItem)
    else h += inline(n, inItem) // span, font, u … keep the text only
  }
  return h
}

// Block content: paragraphs and lists; runs of inline content become one paragraph.
function blocks(node, out) {
  let run = ''
  const flush = () => {
    if (run.replace(/<br>/g, '').trim()) out.push(`<p>${run.trim()}</p>`)
    run = ''
  }
  for (const n of Array.from(node.childNodes)) {
    if (n.nodeType === 3) {
      run += esc(n.nodeValue.replace(/[\s\u00a0]+/g, ' '))
      continue
    }
    if (n.nodeType !== 1 || DROP.has(n.tagName)) continue
    const tag = n.tagName
    if (LIST.has(tag)) {
      flush()
      out.push(list(n))
    } else if (BLOCK.has(tag) || tag === 'LI') {
      flush()
      if (Array.from(n.children).some((c) => BLOCK.has(c.tagName) || LIST.has(c.tagName))) blocks(n, out)
      else {
        run = inline(n)
        flush()
      }
    } else if (tag === 'BR') run += '<br>'
    else run += inline({ childNodes: [n] })
  }
  flush()
}

/** Clean HTML for previews (an empty string when there is no text). */
export function cleanHtml(html) {
  if (!html) return ''
  let doc
  try {
    doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  } catch {
    return ''
  }
  const out = []
  blocks(doc.body, out)
  return out
    .join('')
    .replace(/(<br>)+<\/(p|li)>/g, '</$2>')
    .replace(/<(p|li)>(<br>)+/g, '<$1>')
}

/** Plain text of (clean) HTML. */
export function plainText(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  doc.querySelectorAll('br').forEach((b) => b.replaceWith('\n'))
  doc.querySelectorAll('li').forEach((li) => li.prepend('• '))
  doc.querySelectorAll('p, li').forEach((p) => p.append('\n'))
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}
