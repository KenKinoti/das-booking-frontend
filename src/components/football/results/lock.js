/**
 * v2.19.1 "locked picks you can check" — UI helpers for the lock (when the pick was locked, whether it can still
 * refresh), the "no pick" reasons and the ✓ / ✗ tally of the Results view. Backend: pkg/football/lock*.go.
 *
 *   row.lock      { status: locked | not_enough_data | not_locked, locked_at, label: "Locked 2 h 10 min before kick-off", final, reason }
 *   row.no_pick   { status: not_enough_data, label: "No pick — not enough data", reason }
 *   result_check  { status: correct | wrong | void | no_pick | not_enough_data, …, locked_label, reason }
 */

/** "Locked 2 h 10 min before kick-off" (+ "· can still refresh until kick-off" while upcoming). */
export function lockText(lock, { upcoming = false } = {}) {
  if (!lock || !lock.label) return ''
  if (lock.status !== 'locked') return ''
  return upcoming && !lock.final ? `${lock.label} · can still refresh until kick-off` : lock.label
}

/** Why a match has no pick: { title, reason } or null. */
export function noPickOf(row, { finished = false } = {}) {
  const rc = row?.result_check || null
  const lock = row?.lock || null
  const np = row?.no_pick || null
  if (rc && rc.status === 'not_enough_data')
    return {
      key: 'not_enough_data',
      title: 'No pick — not enough data',
      reason: rc.reason || lock?.reason || '',
    }
  if (np && np.status === 'not_enough_data')
    return { key: 'not_enough_data', title: 'No pick — not enough data', reason: np.reason || '' }
  if (lock && lock.status === 'not_enough_data')
    return { key: 'not_enough_data', title: 'No pick — not enough data', reason: lock.reason || '' }
  if (rc && rc.status === 'no_pick')
    return { key: 'not_locked', title: 'No pick — not locked before kick-off', reason: '' }
  if (finished)
    return { key: 'not_locked', title: 'No pick — not locked before kick-off', reason: '' }
  return null
}

/** The 90-minute score of a result check or a fixture row: "4-0" (en dash for display). */
export function scoreOf(row) {
  const rc = row?.result_check
  if (rc && typeof rc.score === 'string' && rc.score) return rc.score.replace('-', '–')
  const s = row?.score
  if (s && s.home != null && s.away != null) return `${s.ft_home ?? s.home}–${s.ft_away ?? s.away}`
  return ''
}

export const MARK = {
  correct: { icon: 'fa-solid fa-check', word: 'Correct', sym: '✓' },
  wrong: { icon: 'fa-solid fa-xmark', word: 'Wrong', sym: '✗' },
  void: { icon: 'fa-solid fa-ban', word: 'Void', sym: '' },
  no_pick: { icon: 'fa-regular fa-circle', word: 'No pick', sym: '' },
  not_enough_data: { icon: 'fa-regular fa-circle', word: 'No pick', sym: '' },
  pending: { icon: 'fa-regular fa-clock', word: 'Waiting for the result', sym: '' },
}
