import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { orgDefaults } from '../utils/orgDefaults'
import { bizInstant, combine, fromWall, toWall, hhmm, sameDay, startOfDay, zoneDiffers, bizZone } from '../components/bookings/bookingUtils'

// The browser is in Sydney; the business is in Nairobi (bookings follow the business's clock).
const savedTz = process.env.TZ
process.env.TZ = 'Australia/Sydney'
afterAll(() => {
  process.env.TZ = savedTz
  orgDefaults.timezone = ''
})

describe('booking times follow the organisation’s time zone (bookingUtils)', () => {
  beforeEach(() => {
    orgDefaults.timezone = 'Africa/Nairobi'
  })

  it('10:00 typed in a Sydney browser is 10:00 in Nairobi', () => {
    expect(new Date('2026-11-20T00:00:00').getTimezoneOffset()).toBe(-660) // the test really runs on Sydney time
    expect(bizInstant('2026-11-21', '10:00')).toBe('2026-11-21T07:00:00.000Z')
    expect(fromWall(combine('2026-11-21', '23:30')).toISOString()).toBe('2026-11-21T20:30:00.000Z')
    expect(zoneDiffers()).toBe(true)
  })

  it('an existing booking opens and shows at its business time', () => {
    const start = '2026-11-21T07:00:00Z'
    expect(hhmm(start)).toBe('10:00')
    const w = toWall(start)
    expect([w.getFullYear(), w.getMonth() + 1, w.getDate(), w.getHours(), w.getMinutes()]).toEqual([2026, 11, 21, 10, 0])
    // round trip: saving it unchanged keeps the same instant
    expect(fromWall(w).toISOString()).toBe('2026-11-21T07:00:00.000Z')
  })

  it('calendar days are business days', () => {
    // 22:30 Nairobi on the 21st is already the 22nd in Sydney — still the 21st on the calendar.
    const late = '2026-11-21T19:30:00Z'
    expect(sameDay(late, combine('2026-11-21', '00:00'))).toBe(true)
    expect(sameDay(late, combine('2026-11-22', '00:00'))).toBe(false)
    const day = startOfDay(late)
    expect([day.getDate(), day.getHours()]).toEqual([21, 0])
    // The day view asks the API for the Nairobi day.
    expect(fromWall(day).toISOString()).toBe('2026-11-20T21:00:00.000Z')
  })

  it('handles daylight saving in the business’s zone', () => {
    orgDefaults.timezone = 'Australia/Sydney'
    expect(bizInstant('2026-10-03', '10:00')).toBe('2026-10-03T00:00:00.000Z') // AEST +10
    expect(bizInstant('2026-10-05', '10:00')).toBe('2026-10-04T23:00:00.000Z') // AEDT +11
    expect(zoneDiffers()).toBe(false)
  })

  it('falls back to the browser’s zone until the organisation’s is known', () => {
    orgDefaults.timezone = ''
    expect(bizZone()).toBe('Australia/Sydney')
    expect(bizInstant('2026-11-21', '10:00')).toBe('2026-11-20T23:00:00.000Z')
    orgDefaults.timezone = 'Not/AZone'
    expect(bizZone()).toBe('Australia/Sydney')
  })
})
