/**
 * v-table-cards — turns a wide `.ui-table` into stacked cards on phones
 * (≤ 640px, CSS in app.css under `.ui-table--cards`). Each <td> gets a
 * data-label copied from its column header so the card can show
 * "Label ........ value" rows.
 *
 *   <table class="ui-table" v-table-cards> … </table>
 *
 * Header cells can opt out of a label with data-label="" (e.g. actions);
 * the first column becomes the card title.
 */
function headers(table) {
  const row = table.tHead?.rows?.[table.tHead.rows.length - 1]
  if (!row) return []
  const out = []
  for (const th of row.cells) {
    const label = th.hasAttribute('data-label') ? th.getAttribute('data-label') : (th.innerText || th.textContent || '').replace(/\s+/g, ' ').trim()
    const span = th.colSpan || 1
    for (let i = 0; i < span; i++) out.push({ label, cls: th.className || '' })
  }
  return out
}

function label(table) {
  const hs = headers(table)
  if (!hs.length) return
  for (const body of table.tBodies) {
    for (const tr of body.rows) {
      let col = 0
      for (const td of tr.cells) {
        const h = hs[col]
        if (h && !td.hasAttribute('data-label-fixed')) {
          if (td.getAttribute('data-label') !== h.label) td.setAttribute('data-label', h.label)
          const isActions = /actions|is-actions/.test(h.cls) || (!h.label && td.querySelector('button, a'))
          td.classList.toggle('is-card-actions', !!isActions)
        }
        col += td.colSpan || 1
      }
    }
  }
}

export const tableCards = {
  mounted(el) {
    el.classList.add('ui-table--cards')
    label(el)
    // Rows change as data loads / filters apply
    el.__tcObserver = new MutationObserver(() => {
      if (el.__tcQueued) return
      el.__tcQueued = true
      requestAnimationFrame(() => {
        el.__tcQueued = false
        label(el)
      })
    })
    el.__tcObserver.observe(el, { childList: true, subtree: true })
  },
  updated(el) {
    label(el)
  },
  unmounted(el) {
    el.__tcObserver?.disconnect()
  }
}

export default tableCards
