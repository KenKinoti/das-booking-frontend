import { describe, it, expect } from 'vitest'
import { secondsLeft } from '../components/invoicing/heldEmail'
import { withdrawnOf } from '../services/invoicing'

describe('undo send countdown (pkg/invoicing hold.go)', () => {
  it('counts down from the server’s seconds_left since the log was fetched', () => {
    const t0 = 1_000_000
    const hold = { state: 'held', seconds: 30, seconds_left: 28 }
    expect(secondsLeft(hold, t0, t0)).toBe(28)
    expect(secondsLeft(hold, t0, t0 + 10_400)).toBe(18)
    expect(secondsLeft(hold, t0, t0 + 40_000)).toBe(0)
  })
  it('is zero for anything that is no longer held', () => {
    expect(secondsLeft({ state: 'cancelled', seconds_left: 12 }, 0, 0)).toBe(0)
    expect(secondsLeft(null, 0, 0)).toBe(0)
  })
})

describe('withdrawn links (pkg/invoicing recall.go)', () => {
  it('reads the 410 withdrawn answer and ignores other errors', () => {
    const w = { message: 'This invoice was withdrawn by Mvua Traders on 18 Nov 2026. Please contact them for the current version.', number: 'INV-1043' }
    expect(withdrawnOf({ response: { status: 410, data: { success: false, withdrawn: w } } })).toEqual(w)
    expect(withdrawnOf({ response: { status: 404, data: { withdrawn: w } } })).toBe(null)
    expect(withdrawnOf(new Error('network'))).toBe(null)
  })
})
