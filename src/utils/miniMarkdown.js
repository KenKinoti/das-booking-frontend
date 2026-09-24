/**
 * Tiny, safe Markdown renderer for assistant replies.
 *
 * Everything is HTML-escaped first; only the constructs below are turned
 * into markup: paragraphs, line breaks, **bold**, *italic* / _italic_,
 * `code`, ``` fenced code ```, headings (# … rendered small), bullet and
 * numbered lists, pipe tables and [links](url). Links are allowed only for
 * app paths ("/…") and http(s) URLs; app paths get data-internal so the
 * caller can route them with vue-router.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}

export function safeHref(url) {
  let u = String(url || '').trim()
  // Absolute links into this app are routed in-app.
  try {
    const origin = window.location.origin
    if (origin && u.startsWith(origin + '/')) u = u.slice(origin.length)
  } catch {
    /* no window (tests) */
  }
  if (/^\/(?!\/)/.test(u)) return { href: u, internal: true }
  if (/^https?:\/\/[^\s]+$/i.test(u)) return { href: u, internal: false }
  if (/^mailto:[^\s]+$/i.test(u)) return { href: u, internal: false }
  return null
}

function inline(src, nested = false) {
  // Protect code spans first so nothing inside them is formatted.
  const codes = []
  let s = String(src).replace(/`([^`\n]+)`/g, (_, c) => {
    codes.push(c)
    return `\u0000${codes.length - 1}\u0000`
  })
  // Links: [text](url) — handled before escaping so the URL can be checked raw.
  const links = []
  s = s.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g, (m, text, url) => {
    const ok = safeHref(url)
    if (!ok) return text
    links.push({ text, ...ok })
    return `\u0001${links.length - 1}\u0001`
  })
  s = escapeHtml(s)
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^_\w])_([^_\n]+?)_(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => {
    const l = links[Number(i)]
    const text = inline(l.text, true)
    const attrs = l.internal ? ' data-internal="1"' : ' target="_blank" rel="noopener noreferrer"'
    return `<a href="${escapeHtml(l.href)}"${attrs}>${text}</a>`
  })
  if (!nested) s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`)
  return s
}

function splitRow(line) {
  let l = line.trim()
  if (l.startsWith('|')) l = l.slice(1)
  if (l.endsWith('|')) l = l.slice(0, -1)
  return l.split('|').map((c) => c.trim())
}

const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)

export function renderMarkdown(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let para = []
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`)
      para = []
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Fenced code
    if (/^\s*```/.test(line)) {
      flushPara()
      const buf = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++])
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }
    if (!line.trim()) {
      flushPara()
      continue
    }
    // Table
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara()
      const head = splitRow(line)
      const aligns = splitRow(lines[i + 1]).map((c) => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : ''))
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]))
      i--
      const cell = (tag, c, j) => `<${tag}${aligns[j] ? ` style="text-align:${aligns[j]}"` : ''}>${inline(c)}</${tag}>`
      out.push(
        `<div class="md-table"><table><thead><tr>${head.map((c, j) => cell('th', c, j)).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${head.map((_, j) => cell('td', r[j] ?? '', j)).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      )
      continue
    }
    // Heading
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/)
    if (h) {
      flushPara()
      out.push(`<p class="md-h">${inline(h[2])}</p>`)
      continue
    }
    // Lists
    const li = line.match(/^\s*([-*+]|\d{1,3}[.)])\s+(.*)$/)
    if (li) {
      flushPara()
      const ordered = /\d/.test(li[1])
      const items = []
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*+]|\d{1,3}[.)])\s+(.*)$/)
        if (!m || /\d/.test(m[1]) !== ordered) break
        items.push(m[2])
        i++
      }
      i--
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`)
      continue
    }
    if (/^\s*>\s?/.test(line)) {
      flushPara()
      out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`)
      continue
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushPara()
      out.push('<hr>')
      continue
    }
    para.push(line)
  }
  flushPara()
  return out.join('')
}
