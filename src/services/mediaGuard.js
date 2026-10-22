/**
 * Camera and microphone rule: no page opens the camera or the microphone
 * unless the person tapped something that asks for it (“Turn on camera &
 * mic”, a camera / mic toggle, Join, Scan). Pages open with both off.
 *
 * Every getUserMedia call goes through openMedia(), so the app knows which
 * tracks are live and can stop them all (camera light off) when the person
 * leaves a media page, signs out, or leaves a pre-join screen in a hidden tab
 * for a long time.
 *
 * Media pages (routes with meta.media: video call, meeting room, secure call)
 * are never a place to come back to after signing in: see safeReturnPath().
 */

const live = new Set()

/** How long a pre-join screen may sit in a hidden tab before its devices are turned off. */
export const HIDDEN_STOP_MS = 60 * 1000

export function mediaSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
}

function closedError() {
  const e = new Error('The page was closed before the camera or microphone started.')
  e.name = 'AbortError'
  e.closed = true
  return e
}

function prune() {
  for (const t of live) if (t.readyState === 'ended') live.delete(t)
}

/**
 * getUserMedia for a tap. `alive()` is asked once the browser answers: when
 * the page has gone in the meantime the stream is stopped at once and an
 * AbortError with `closed: true` is thrown.
 */
export async function openMedia(constraints, { alive } = {}) {
  if (!mediaSupported()) {
    const e = new Error('This browser does not give the page a camera or microphone.')
    e.name = 'Unsupported'
    throw e
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  if (alive && !alive()) {
    for (const t of stream.getTracks()) t.stop()
    throw closedError()
  }
  prune()
  for (const t of stream.getTracks()) live.add(t)
  return stream
}

export function stopTrack(t) {
  if (!t) return
  try {
    t.stop()
  } catch {
    /* already stopped */
  }
  live.delete(t)
}

export function stopStream(stream) {
  if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach(stopTrack)
}

/** Stop every camera / microphone track the app opened (route change away from a media page, sign-out). */
export function stopAllMedia() {
  for (const t of [...live]) stopTrack(t)
  live.clear()
}

/** Camera / microphone tracks that are still running. */
export function liveMediaTracks() {
  prune()
  return [...live]
}

/**
 * Call `cb` once the page has been hidden (another tab, minimised, phone
 * locked) for `ms`. Returns a function that stops watching.
 */
export function whenHiddenFor(ms, cb) {
  if (typeof document === 'undefined') return () => {}
  let timer = null
  let since = 0
  const fire = () => {
    clearTimeout(timer)
    timer = null
    since = 0
    cb()
  }
  const onChange = () => {
    if (document.visibilityState === 'hidden') {
      since = Date.now()
      clearTimeout(timer)
      timer = setTimeout(fire, ms)
    } else {
      clearTimeout(timer)
      timer = null
      // background tabs may run timers late: check the clock on the way back too
      if (since && Date.now() - since >= ms) fire()
      since = 0
    }
  }
  document.addEventListener('visibilitychange', onChange)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onChange)
  }
}

// ------------------------------------------------------------------ routes

const MEDIA_PATH = /^\/(?:video-call|c)(?:\/|$)|^\/meetings\/[^/]+/

/** A route (to / from in a guard) that opens the camera or microphone. */
export function isMediaRoute(route) {
  return !!route && Array.isArray(route.matched) && route.matched.some((r) => r.meta && r.meta.media)
}

/** A path ("/video-call?room=…", "/meetings/<id>", "/c/<room>") of a media page. */
export function isMediaPath(p, router) {
  if (typeof p !== 'string') return false
  const path = p.split(/[?#]/)[0]
  if (MEDIA_PATH.test(path)) return true
  if (router && typeof router.resolve === 'function') {
    try {
      return isMediaRoute(router.resolve(p))
    } catch {
      return false
    }
  }
  return false
}

/**
 * Where to go after signing in (redirect query, the SSO redirect, the last
 * page): an internal path that is not the sign-in pages and not a media page,
 * or '' (then the caller goes to the person's home).
 */
export function safeReturnPath(p, router) {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//') || p.startsWith('/\\')) return ''
  if (p.startsWith('/login') || p.startsWith('/auth/')) return ''
  if (isMediaPath(p, router)) return ''
  return p
}
