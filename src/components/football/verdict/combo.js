/**
 * The accumulator helper ("combo") on the match centre — client side only (FOOTBALL_WINRATE_SPEC §C): the picks someone
 * adds, their combined chance (the product of the picks' chances, as if the games were unrelated), the fair odds and
 * "1 in N". Kept in this browser only (localStorage, a convenience; it works without it).
 */
import { reactive } from 'vue'

const KEY = 'dasyin.fb.combo.v1'
const MAX = 12

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x) => x && x.id != null && Number(x.p) > 0).slice(0, MAX) : []
  } catch {
    return []
  }
}

export const combo = reactive({ items: read(), open: false })

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(combo.items))
  } catch {
    /* private window or blocked storage: the combo still works for this visit */
  }
}

export const inCombo = (id) => combo.items.some((x) => String(x.id) === String(id))

/** f: a fixtures-list row with a normalised verdict v. */
export function addToCombo(f, v) {
  if (!v || inCombo(f.id) || combo.items.length >= MAX) return false
  combo.items.push({
    id: f.id,
    match: `${f.home?.name || ''} v ${f.away?.name || ''}`,
    kickoff: f.kickoff || null,
    pick: v.pick,
    pick_label: v.pick_label,
    p: v.p,
    tier: v.tier.key,
    tier_label: v.tier.label
  })
  save()
  return true
}
export function removeFromCombo(id) {
  combo.items = combo.items.filter((x) => String(x.id) !== String(id))
  save()
}
export function toggleCombo(f, v) {
  if (inCombo(f.id)) removeFromCombo(f.id)
  else addToCombo(f, v)
}
export function clearCombo() {
  combo.items = []
  save()
}
export const COMBO_MAX = MAX
