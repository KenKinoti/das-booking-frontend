/**
 * Helpers for "Add to calendar" links.
 *
 * A calendar file (.ics) is best opened by a plain link in a new tab: iOS
 * Safari and Android Chrome hand a text/calendar response straight to the
 * calendar app's "Add event" sheet. The one place that does not work is an
 * installed app (standalone PWA) whose API lives on the app's own origin —
 * the link then loads inside the app's web view, which cannot show a calendar
 * file. There the file is shared / saved instead.
 */
import { downloadBlob } from '@/utils/format'

/** Running as an installed app (home screen / standalone window)? */
export function isStandalone() {
  try {
    return window.matchMedia?.('(display-mode: standalone)')?.matches === true || window.navigator.standalone === true
  } catch {
    return false
  }
}

export function sameOrigin(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

/** Can the .ics at `url` be opened with an ordinary link navigation? */
export function canNavigateToIcs(url) {
  return !!url && !(isStandalone() && sameOrigin(url))
}

/** Fetch a public .ics as a File (text/calendar) for sharing or saving. */
export async function fetchIcsFile(url, filename = 'booking.ics') {
  const res = await fetch(url, { credentials: 'omit', cache: 'no-store' })
  if (!res.ok) throw new Error(`Calendar file could not be loaded (${res.status})`)
  const blob = await res.blob()
  return new File([blob], filename, { type: 'text/calendar' })
}

/**
 * Hand a calendar file to the device: the share sheet where files can be
 * shared (phones — pick the calendar app), otherwise a download.
 * Returns 'shared' | 'cancelled' | 'downloaded'.
 */
export async function shareOrSaveIcs(file, title = '') {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title })
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
  }
  downloadBlob(new Blob([file], { type: 'text/calendar;charset=utf-8' }), file.name)
  return 'downloaded'
}

/** Copy text to the clipboard (with a fallback for non-secure contexts). */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
