/**
 * Keep keyboard focus inside a dialog while it is open (Tab / Shift+Tab
 * cycle through it, Escape closes it) and give focus back to whatever had
 * it before when the dialog closes.
 *
 *   const release = trapFocus(el, { onEscape: close, initial: el.querySelector('h2') })
 *   …
 *   release()
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function trapFocus(container, { onEscape, initial } = {}) {
  if (!container) return () => {}
  const previous = document.activeElement
  const items = () => [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

  function onKey(e) {
    if (e.key === 'Escape') {
      if (onEscape) {
        e.preventDefault()
        e.stopPropagation()
        onEscape()
      }
      return
    }
    if (e.key !== 'Tab') return
    const list = items()
    if (!list.length) {
      e.preventDefault()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    const inside = container.contains(document.activeElement)
    if (e.shiftKey && (!inside || document.activeElement === first)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
      e.preventDefault()
      first.focus()
    }
  }

  document.addEventListener('keydown', onKey, true)
  requestAnimationFrame(() => {
    const target = initial || items()[0] || container
    if (target && !container.contains(document.activeElement)) target.focus({ preventScroll: true })
  })

  return function release() {
    document.removeEventListener('keydown', onKey, true)
    if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
      try {
        previous.focus({ preventScroll: true })
      } catch {
        /* element gone */
      }
    }
  }
}
