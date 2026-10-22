/**
 * This device as a till: a random id kept on the device and the name people
 * gave it ("Brian's phone", "Front till"). Every sale carries both, so owners
 * see which phone sold what (POS transactions → By person & device).
 * Per-device convenience only (localStorage); it never decides access.
 */
import { deviceKind, newRef } from './posFast.js'

const KEY = 'pos.device.v1'

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}
function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable: the id lives for this page only */
  }
}

let memo = null

export function defaultDeviceLabel(firstName) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const tp = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0
  const kind = deviceKind(ua, tp)
  const n = String(firstName || '').trim()
  return (n ? `${n}'s ${kind}` : kind.charAt(0).toUpperCase() + kind.slice(1)).slice(0, 60)
}

/** { id, label, named } — created on first use with a default label from the person's first name. */
export function posDevice(firstName = '') {
  if (memo) return memo
  let d = read()
  if (!d || !/^[A-Za-z0-9_-]{8,64}$/.test(d.id || '')) {
    d = { id: newRef('dev'), label: defaultDeviceLabel(firstName), named: false }
    write(d)
  }
  if (!d.label) d.label = defaultDeviceLabel(firstName)
  memo = d
  return d
}

export function setPosDeviceLabel(label) {
  const d = { ...posDevice(), label: String(label || '').trim().slice(0, 60) || posDevice().label, named: true }
  memo = d
  write(d)
  return d
}

/** Tests: forget the cached copy. */
export function _resetPosDevice() {
  memo = null
}
