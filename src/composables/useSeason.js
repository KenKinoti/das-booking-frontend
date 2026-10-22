/**
 * Seasonal themes — the controller.
 *
 * Asks the API which occasion's theme shows today for the signed-in person
 * (GET /occasions/theme: the organisation's country picks national days, and
 * the platform / organisation / personal switches are applied there) and puts
 * `data-season="<theme>"` on <html>. src/styles/seasons.css draws each theme
 * from that attribute: accent colours (light and dark), button effects, the
 * top-bar greeting and a small corner ornament.
 *
 * Never themed: signed-out and public customer pages (invoice links, payment
 * pages, secure calls), the setup wizard, printed pages and `.ui-paper`
 * documents (seasons.css only applies on screen and resets inside paper).
 *
 * Super admins can preview any theme ("Preview Halloween now"); the preview
 * lasts for the browser tab (sessionStorage) until stopped.
 */
import { reactive } from 'vue'
import api from '@/services/api'

const PREVIEW_KEY = 'season.preview'
const HIDE_KEY = 'season.greeting.hidden'
const REFRESH_MS = 30 * 60 * 1000

export const season = reactive({
  loaded: false,
  loading: false,
  active: false,
  reason: '',
  theme: '',
  occasion: null,
  today: '',
  country: '',
  settings: { global: true, org: true, user: null, effective: true, can_edit_org: false },
  preview: readSession(PREVIEW_KEY),
  eligible: false,
  greetingHidden: false,
  error: ''
})

let inflight = null
let lastLoad = 0
let tokenSeen = ''

function readSession(key) {
  try {
    return sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeSession(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value)
    else sessionStorage.removeItem(key)
  } catch {
    /* private mode */
  }
}

function hiddenId(o) {
  return o ? `${o.key}:${String(o.date || '').slice(0, 10)}` : ''
}

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) || ''
  } catch {
    return ''
  }
}

function currentToken() {
  try {
    return localStorage.getItem('auth_token') || ''
  } catch {
    return ''
  }
}

/** The theme key in force (the preview's, or today's). */
export function seasonTheme() {
  return season.active && season.eligible ? season.theme : ''
}

/** Put (or take off) the theme on <html>. */
export function applySeason() {
  const root = document.documentElement
  const theme = seasonTheme()
  if (theme) {
    root.setAttribute('data-season', theme)
    const p = season.occasion?.palette
    if (p && (p.accent || p.accent_dark)) {
      root.setAttribute('data-season-custom', '')
      root.style.setProperty('--season-custom-accent', p.accent || p.accent_dark)
      root.style.setProperty('--season-custom-accent-dark', p.accent_dark || p.accent)
    } else {
      clearCustom(root)
    }
    if (season.preview) root.setAttribute('data-season-preview', '')
    else root.removeAttribute('data-season-preview')
  } else {
    root.removeAttribute('data-season')
    root.removeAttribute('data-season-preview')
    clearCustom(root)
  }
}

function clearCustom(root) {
  root.removeAttribute('data-season-custom')
  root.style.removeProperty('--season-custom-accent')
  root.style.removeProperty('--season-custom-accent-dark')
}

function applyPayload(d = {}) {
  season.active = !!d.active
  season.reason = d.reason || ''
  season.theme = d.theme || ''
  season.occasion = d.occasion || null
  season.today = d.today || ''
  season.country = d.country || ''
  if (d.settings) season.settings = { ...season.settings, ...d.settings }
  season.greetingHidden = !!season.occasion && readHidden() === hiddenId(season.occasion) && season.reason !== 'preview'
  season.loaded = true
  season.error = ''
  applySeason()
}

/** Ask the API for today's theme (deduplicated; force to re-ask). */
export async function refreshSeason({ force = false } = {}) {
  const token = currentToken()
  if (!token) {
    resetSeason()
    return season
  }
  if (inflight && !force) return inflight
  season.loading = true
  const params = season.preview ? { preview: season.preview } : {}
  const p = api
    .get('/occasions/theme', { params })
    .then((res) => {
      if (currentToken() === token) applyPayload(res.data?.data || {})
      return season
    })
    .catch((err) => {
      // An unknown preview (e.g. a deleted custom occasion) ends the preview.
      if (season.preview && err?.response?.status === 404) {
        stopPreview()
        return season
      }
      season.error = 'Seasonal theme unavailable'
      season.active = false
      applySeason()
      return season
    })
    .finally(() => {
      season.loading = false
      lastLoad = Date.now()
      if (inflight === p) inflight = null
    })
  inflight = p
  return p
}

/** Called when the session changes (sign-in, sign-out, "log in as"). */
export function sessionChanged() {
  const token = currentToken()
  if (token === tokenSeen) return
  tokenSeen = token
  if (!token) {
    resetSeason()
    return
  }
  refreshSeason({ force: true })
}

/** Refresh when a long-open tab crosses into a new day / after a while. */
export function refreshIfStale() {
  if (currentToken() && Date.now() - lastLoad > REFRESH_MS) refreshSeason({ force: true })
}

/** Whether the current page shows the app shell (themes only show there). */
export function setSeasonEligible(on) {
  if (season.eligible === !!on) return
  season.eligible = !!on
  applySeason()
}

/** Super admins: show a theme or occasion now (until stopped). */
export function previewSeason(key) {
  season.preview = key || ''
  writeSession(PREVIEW_KEY, season.preview)
  return refreshSeason({ force: true })
}

export function stopPreview() {
  season.preview = ''
  writeSession(PREVIEW_KEY, '')
  return refreshSeason({ force: true })
}

/** Hide today's greeting (this browser; it comes back for the next occasion). */
export function hideGreeting() {
  season.greetingHidden = true
  try {
    localStorage.setItem(HIDE_KEY, hiddenId(season.occasion))
  } catch {
    /* private mode */
  }
}

export function resetSeason() {
  inflight = null
  Object.assign(season, { loaded: false, active: false, reason: '', theme: '', occasion: null, today: '', country: '', greetingHidden: false, error: '' })
  applySeason()
}

/** Save the organisation's switch (owners / admins). */
export async function saveOrgSeasons(enabled) {
  const res = await api.put('/occasions/settings/org', { enabled })
  if (res.data?.data?.settings) season.settings = { ...season.settings, ...res.data.data.settings }
  await refreshSeason({ force: true })
  return res.data?.data?.settings
}

/** Save the person's choice: true, false or null (follow the organisation). */
export async function saveMySeasons(show) {
  const res = await api.put('/occasions/settings/me', { show })
  if (res.data?.data?.settings) season.settings = { ...season.settings, ...res.data.data.settings }
  await refreshSeason({ force: true })
  return res.data?.data?.settings
}

export async function loadSeasonSettings() {
  const res = await api.get('/occasions/settings')
  const d = res.data?.data || {}
  if (d.settings) season.settings = { ...season.settings, ...d.settings }
  return d
}

export function useSeason() {
  return { season, refreshSeason, previewSeason, stopPreview, hideGreeting, saveOrgSeasons, saveMySeasons, loadSeasonSettings, seasonTheme }
}

export default useSeason
