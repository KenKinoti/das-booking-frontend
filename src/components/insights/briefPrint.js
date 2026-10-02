// Print-friendly version of a strategy brief: a self-contained document
// (no app chrome, black on white, sized for A4) opened in its own window.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const safeLink = (l) => (/^https?:\/\//i.test(l || '') ? l : '')

const KIND = { per_year: 'per year', one_off: 'one-off', at_risk: 'at risk' }

/**
 * @param {object} b    the brief as returned by the API (with content)
 * @param {object} fmt  { money(v), day(iso), pct(v) }
 */
export function briefPrintHtml(b, fmt) {
  const c = b.content || {}
  const sn = c.snapshot || {}
  const li = (items) => items.map((x) => `<li>${x}</li>`).join('')
  const delta = (v) => (v == null ? '' : ` (${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%)`)
  const ai = b.generated_by === 'ai'
  const tiles = [
    ['Revenue', fmt.money(sn.revenue) + delta(sn.revenue_delta_pct)],
    ['Costs', fmt.money(sn.expenses) + delta(sn.expenses_delta_pct)],
    ['Net profit', fmt.money(sn.net_profit)],
    ['Cash collected', fmt.money(sn.cash_collected)],
    ['Owed by clients', fmt.money(sn.outstanding)],
    ['Overdue', fmt.money(sn.overdue)]
  ]
  const actions = (c.actions || [])
    .map(
      (a) => `<tr><td class="rk">${a.rank}</td><td><strong>${esc(a.title)}</strong><br>${esc(a.rationale)}<br><small>${esc(a.basis)}</small></td>
<td class="num">${a.value > 0 ? `${esc(fmt.money(a.value))}<br><small>${esc(KIND[a.value_kind] || '')}</small>` : '<small>not estimated</small>'}</td></tr>`
    )
    .join('')
  const heads = (c.headlines || [])
    .map((h) => {
      const l = safeLink(h.link)
      return `<li>${l ? `<a href="${esc(l)}">${esc(h.title)}</a>` : esc(h.title)}<br><small>${esc(h.source)} · ${esc(fmt.day(h.date))}${l ? ` · ${esc(l)}` : ''}</small></li>`
    })
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(b.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 28px 34px; max-width: 820px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 20px 0 8px; padding-top: 12px; border-top: 1px solid #ccc; }
  p { margin: 0 0 8px; }
  .meta, small { color: #555; font-size: 11.5px; }
  .label { display: inline-block; border: 1px solid #999; border-radius: 3px; padding: 0 6px; margin-right: 6px; font-size: 11px; }
  .headline { font-size: 14.5px; font-weight: 600; margin: 12px 0; }
  .ai { white-space: pre-wrap; border: 1px solid #bbb; border-radius: 4px; padding: 10px 12px; margin: 10px 0; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile { border: 1px solid #ccc; border-radius: 4px; padding: 6px 9px; }
  .tile b { display: block; font-size: 15px; }
  ul, ol { margin: 0; padding-left: 20px; }
  li { margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 6px; border-top: 1px solid #ddd; vertical-align: top; }
  tr:first-child td { border-top: 0; }
  .rk { width: 24px; font-weight: 700; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  a { color: #111; }
  .bar { margin-bottom: 14px; }
  .bar button { font: inherit; padding: 5px 12px; cursor: pointer; }
  h2, tr, li, .tile { break-inside: avoid; }
  @media print { .bar { display: none; } body { padding: 0; max-width: none; } @page { margin: 16mm 14mm; } }
</style>
</head>
<body data-print-brief="${esc(b.id)}">
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<h1>${esc(b.title)}</h1>
<p class="meta"><span class="label">${ai ? 'AI-written from your data' : 'Rule-based from your data'}</span>Period ${esc(fmt.day(c.from))} – ${esc(fmt.day(c.to))} · position as of ${esc(fmt.day(c.as_of))}</p>
<p class="headline">${esc(b.headline)}</p>
${ai ? `<div class="ai">${esc(b.ai_text)}</div><p class="meta">Written by AI from the figures below and nothing else — check them before acting.</p>` : ''}
<h2>1. Performance snapshot</h2>
<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
<h2>2. What changed against ${esc(c.prev_label)}</h2>
<ul>${li((c.changes || []).map((x) => esc(x.text)))}</ul>
<h2>3. Export &amp; FX position</h2>
<ul>${li([...(c.trade?.lines || []), ...(c.trade?.hedge || [])].map(esc))}</ul>
<h2>4. Market signals</h2>
${(c.signals || []).length ? `<ul>${li(c.signals.map((s) => `<strong>${esc(s.title)}</strong> — ${esc(s.text)} <small>(${esc(s.source)})</small>`))}</ul>` : '<p class="meta">No indicator data was available.</p>'}
<h2>5. Industry headlines</h2>
${heads ? `<ol>${heads}</ol>` : '<p class="meta">No headlines were stored for this month.</p>'}
<h2>6. Risks</h2>
${(c.risks || []).length ? `<ul>${li(c.risks.map((r) => `<strong>${esc(r.title)}</strong> (${esc(r.severity)}) — ${esc(r.text)}`))}</ul>` : '<p class="meta">No risks flagged.</p>'}
<h2>7. Recommended actions</h2>
${actions ? `<table>${actions}</table>` : '<p class="meta">Nothing to recommend from the data yet.</p>'}
${c.action_total > 0 ? `<p style="margin-top:8px">Yearly and one-off estimates add up to about <strong>${esc(fmt.money(c.action_total))}</strong>.</p>` : ''}
<h2>Notes</h2>
${(c.notes || []).map((n) => `<p class="meta">${esc(n)}</p>`).join('')}
</body>
</html>`
}
