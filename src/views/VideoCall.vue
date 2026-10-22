<template>
  <div class="mp ui-page ui-page--wide vc" :class="{ 'vc--call': phase === 'call' }">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Communication</div>
        <h1>{{ phase === 'call' ? 'Video call' : phase === 'ended' ? 'Call ended' : 'Start a video call' }}</h1>
        <p v-if="phase === 'lobby'">Your camera and microphone stay off until you turn them on or join. Start a call and share the link.</p>
        <p v-else-if="phase === 'call'" class="call-meta">
          <span class="ui-badge" :class="statusBadge.cls">{{ statusBadge.label }}</span>
          <span class="tnum">{{ duration }}</span>
          <span class="muted">Room {{ shortRoom }}</span>
        </p>
      </div>
      <div class="ui-actions">
        <router-link v-if="phase !== 'call'" to="/meetings" class="ui-btn"><i class="fa-solid fa-calendar-plus"></i> Schedule instead</router-link>
        <button v-if="phase === 'call'" class="ui-btn" @click="copyLink"><i class="fa-regular fa-copy"></i> Copy invite link</button>
      </div>
    </header>

    <!-- ================= LOBBY ================= -->
    <div v-if="phase === 'lobby'" class="lobby">
      <section class="ui-card preview-card">
        <div class="tile preview" :class="{ 'is-off': !hasVideo || !camOn }" data-testid="vc-preview" :data-media="media.state">
          <video v-show="hasVideo && camOn" ref="preview" autoplay playsinline muted></video>
          <div v-if="!hasVideo || !camOn" class="tile__empty">
            <span class="big-avatar">{{ myInitials }}</span>
            <p v-if="media.state === 'loading'" class="muted"><i class="fa-solid fa-circle-notch spin"></i> Starting camera…</p>
            <template v-else-if="media.problem">
              <p class="problem"><i class="fa-solid fa-video-slash"></i> {{ media.problem.title }}</p>
              <p class="muted small">{{ media.problem.hint }}</p>
              <button class="ui-btn ui-btn--sm" data-testid="media-retry" @click="turnOn"><i class="fa-solid fa-rotate"></i> Try again</button>
            </template>
            <template v-else-if="media.state === 'off'">
              <p class="off-title"><i class="fa-solid fa-video-slash"></i> Camera and microphone are off</p>
              <p class="muted small">Nothing turns on until you tap. Check them here first, or they turn on when you {{ roomInput ? 'join' : 'start the call' }}.</p>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-testid="media-on" @click="turnOn"><i class="fa-solid fa-video"></i> Turn on camera &amp; mic</button>
            </template>
            <p v-else-if="!camOn" class="muted">Camera is off</p>
          </div>
          <div class="tile__bar">
            <button class="round" :class="{ off: !micOn }" :disabled="!supported" data-testid="vc-mic" :aria-label="micOn ? 'Turn microphone off' : 'Turn microphone on'" :aria-pressed="!micOn" :title="media.state === 'off' ? (micOn ? 'You’ll join with your microphone on' : 'You’ll join muted') : ''" @click="toggleMic">
              <i :class="micOn ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash'"></i>
            </button>
            <button class="round" :class="{ off: !camOn }" :disabled="!supported" data-testid="vc-cam" :aria-label="camOn ? 'Turn camera off' : 'Turn camera on'" :aria-pressed="!camOn" :title="media.state === 'off' ? (camOn ? 'You’ll join with your camera on' : 'You’ll join with your camera off') : ''" @click="toggleCam">
              <i :class="camOn ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'"></i>
            </button>
          </div>
        </div>
        <div class="meter-row">
          <template v-if="media.state === 'off'">
            <i class="fa-solid fa-circle-info muted"></i>
            <span class="muted small" data-testid="join-with">{{ joinWith }}</span>
          </template>
          <template v-else>
            <i class="fa-solid fa-microphone-lines muted"></i>
            <div class="level" :aria-label="`Microphone level ${Math.round(level * 100)}%`"><span :style="{ width: Math.round(level * 100) + '%' }"></span></div>
            <span class="muted small">{{ hasAudio ? (micOn ? 'Speak to test your microphone' : 'Microphone muted') : micOn ? 'No microphone' : 'Microphone off' }}</span>
          </template>
        </div>
      </section>

      <section class="ui-card join-card">
        <div class="ui-card__body">
          <h2>Ready to join?</h2>
          <p class="muted">{{ joinHint }}</p>

          <div class="form-grid one">
            <label class="ui-field">
              <span class="ui-label">Camera</span>
              <select v-model="cameraId" class="ui-select" :disabled="!cameras.length" @change="startPreview">
                <option v-if="!cameras.length" value="">{{ media.state === 'off' ? 'Turn the camera on to choose' : 'No camera found' }}</option>
                <option v-for="d in cameras" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'Camera' }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Microphone</span>
              <select v-model="micId" class="ui-select" :disabled="!mics.length" @change="startPreview">
                <option v-if="!mics.length" value="">{{ media.state === 'off' ? 'Turn the microphone on to choose' : 'No microphone found' }}</option>
                <option v-for="d in mics" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'Microphone' }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Room</span>
              <div class="room-row">
                <input v-model.trim="roomInput" class="ui-input mono" placeholder="Leave blank for a new room" aria-label="Room code or link" />
                <button v-if="roomInput" type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Clear room" @click="roomInput = ''"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <span class="ui-hint">Paste an invite link or code to join someone else’s call.</span>
            </label>
          </div>

          <button class="ui-btn ui-btn--primary join-btn" data-testid="vc-join" :disabled="joining || media.state === 'loading'" @click="join">
            <i :class="joining ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-phone'"></i> {{ roomInput ? 'Join call' : 'Start call' }}
          </button>
          <p v-if="!hasVideo && !hasAudio && media.state === 'ready'" class="muted small center">You’ll join without camera or microphone — you can still see and hear others.</p>
        </div>
      </section>
    </div>

    <!-- ================= CALL ================= -->
    <div v-else-if="phase === 'call'" ref="stageWrap" class="call">
      <div v-if="banner" class="ui-alert" :class="banner.kind === 'error' ? 'ui-alert--danger' : 'ui-alert--warning'" style="margin-bottom: 12px">
        <i :class="banner.kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-triangle-exclamation'"></i><span>{{ banner.text }}</span>
      </div>

      <div class="stage" :class="{ solo: !remoteStream }">
        <div class="tile main">
          <video v-show="remoteStream && !remoteCamOff" ref="remote" autoplay playsinline></video>
          <div v-if="!remoteStream || remoteCamOff" class="tile__empty">
            <template v-if="remoteStream">
              <span class="big-avatar">?</span>
              <p class="muted">The other person’s camera is off</p>
            </template>
            <template v-else>
              <span class="pulse"><i class="fa-solid fa-user-plus"></i></span>
              <p><strong>Waiting for others to join</strong></p>
              <p class="muted small">Share the invite link — anyone signed in to DASYIN can join.</p>
              <button class="ui-btn ui-btn--sm ui-btn--primary" @click="copyLink"><i class="fa-regular fa-copy"></i> Copy invite link</button>
            </template>
          </div>
          <span v-if="remoteStream" class="name-tag"><i v-if="remoteMicOff" class="fa-solid fa-microphone-slash"></i> Guest</span>
        </div>
        <div class="tile pip">
          <video v-show="(hasVideo && camOn) || sharing" ref="local" autoplay playsinline muted></video>
          <div v-if="!((hasVideo && camOn) || sharing)" class="tile__empty small-empty"><span class="big-avatar sm">{{ myInitials }}</span></div>
          <span class="name-tag"><i v-if="!micOn || !hasAudio" class="fa-solid fa-microphone-slash"></i> You{{ sharing ? ' (screen)' : '' }}</span>
        </div>
      </div>

      <div class="controls" role="toolbar" aria-label="Call controls">
        <button class="round lg" :class="{ off: !micOn || !hasAudio }" :disabled="!supported" data-testid="vc-call-mic" :title="micOn && hasAudio ? 'Mute' : 'Unmute'" :aria-label="micOn && hasAudio ? 'Mute microphone' : 'Unmute microphone'" @click="toggleMic">
          <i :class="micOn && hasAudio ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash'"></i>
        </button>
        <button class="round lg" :class="{ off: !camOn || !hasVideo }" :disabled="!supported" data-testid="vc-call-cam" :title="camOn && hasVideo ? 'Camera off' : 'Camera on'" :aria-label="camOn && hasVideo ? 'Turn camera off' : 'Turn camera on'" @click="toggleCam">
          <i :class="camOn && hasVideo ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'"></i>
        </button>
        <button v-if="canShare" class="round lg" :class="{ on: sharing }" :title="sharing ? 'Stop sharing' : 'Share your screen'" :aria-label="sharing ? 'Stop sharing screen' : 'Share screen'" @click="toggleShare">
          <i class="fa-solid fa-display"></i>
        </button>
        <button v-if="canRecord" class="round lg" :class="{ rec: recording }" :title="recording ? 'Stop recording' : 'Record this call on your device'" :aria-label="recording ? 'Stop recording' : 'Start recording'" @click="toggleRecord">
          <i class="fa-solid fa-circle-dot"></i>
        </button>
        <button class="round lg" :title="isFull ? 'Exit full screen' : 'Full screen'" aria-label="Toggle full screen" @click="toggleFull">
          <i :class="isFull ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
        </button>
        <button class="ui-btn ui-btn--danger end" aria-label="Leave call" @click="leave"><i class="fa-solid fa-phone-slash"></i> Leave</button>
      </div>
      <p v-if="recording" class="rec-note"><span class="dot"></span> Recording {{ recDuration }} — saved to your device when you stop.</p>
    </div>

    <!-- ================= ENDED ================= -->
    <section v-else class="ui-card ended">
      <div class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-phone-slash"></i></div>
        <h3>You left the call</h3>
        <p>{{ endedDuration ? `The call lasted ${endedDuration}.` : '' }} {{ endReason }}</p>
        <div class="ui-actions" style="justify-content: center; margin-top: 14px">
          <button class="ui-btn ui-btn--primary" @click="rejoin"><i class="fa-solid fa-rotate-left"></i> Rejoin</button>
          <button class="ui-btn" @click="newCall"><i class="fa-solid fa-plus"></i> New call</button>
          <router-link to="/communication" class="ui-btn ui-btn--ghost">Back to communication</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import { webRTCService } from '@/services/webrtc'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { downloadBlob } from '@/utils/format'
import { openMedia, stopStream, stopTrack, mediaSupported, whenHiddenFor, HIDDEN_STOP_MS } from '@/services/mediaGuard'

const PROBLEMS = {
  NotAllowedError: { title: 'Camera and microphone are blocked', hint: 'Allow access using the camera icon in your browser’s address bar, then try again.' },
  SecurityError: { title: 'Camera access isn’t allowed here', hint: 'Browsers only allow cameras on secure (https) pages.' },
  NotFoundError: { title: 'No camera or microphone found', hint: 'Connect a device and try again — or join without one.' },
  NotReadableError: { title: 'Your camera is busy', hint: 'Close other apps or tabs that might be using it, then try again.' },
  OverconstrainedError: { title: 'Camera settings not supported', hint: 'Choose a different camera and try again.' },
  Unsupported: { title: 'This browser can’t use a camera', hint: 'Try a recent version of Chrome, Edge, Firefox or Safari.' }
}

function randomRoom() {
  const a = new Uint8Array(9)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('').replace(/(.{3})(.{3})(.{3})/, '$1-$2-$3')
}

function parseRoom(input) {
  const s = (input || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    return u.searchParams.get('room') || ''
  } catch {
    return s.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64)
  }
}

export default {
  name: 'VideoCall',
  props: { callId: { type: String, default: '' } },
  data() {
    return {
      phase: 'lobby',
      // Camera and microphone stay off until a tap: 'off' → 'loading' → 'ready'.
      media: { state: 'off', problem: null },
      supported: mediaSupported(),
      stream: null,
      hasVideo: false,
      hasAudio: false,
      // What the person chose: the devices Join turns on (and, once on, whether they are live).
      camOn: true,
      micOn: true,
      cameras: [],
      mics: [],
      cameraId: '',
      micId: '',
      level: 0,
      audioCtx: null,
      raf: 0,
      roomInput: parseRoom(this.$route.query.room) || this.callId || '',
      room: '',
      joining: false,
      signal: 'connecting',
      peerState: '',
      banner: null,
      remoteStream: null,
      remoteCamOff: false,
      remoteMicOff: false,
      sharing: false,
      screenStream: null,
      recording: false,
      recorder: null,
      recChunks: [],
      recStart: 0,
      startedAt: 0,
      now: Date.now(),
      tick: null,
      isFull: false,
      endReason: '',
      endedDuration: '',
      handlers: []
    }
  },
  computed: {
    me() {
      return useAuthStore().user || {}
    },
    myInitials() {
      const n = `${this.me.first_name || ''} ${this.me.last_name || ''}`.trim() || this.me.email || 'You'
      return n.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    },
    joinWith() {
      if (this.camOn && this.micOn) return 'You’ll join with your camera and microphone on — tap them to switch either off first.'
      if (this.micOn) return 'You’ll join with your microphone on and your camera off.'
      if (this.camOn) return 'You’ll join with your camera on and your microphone off.'
      return 'You’ll join with your camera and microphone off — you can still see and hear others.'
    },
    joinHint() {
      if (this.media.state === 'off') return this.camOn || this.micOn ? 'Nothing is on yet — your devices turn on when you tap Start or Join.' : 'You’ll join without camera or microphone.'
      if (this.media.state === 'loading') return 'Checking your devices…'
      if (this.hasVideo && this.hasAudio) return 'Your camera and microphone are working.'
      if (this.hasAudio) return 'No camera — you’ll join with audio only.'
      if (this.hasVideo) return 'No microphone — others won’t hear you.'
      return 'No camera or microphone available.'
    },
    canShare() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
    },
    canRecord() {
      return typeof window.MediaRecorder !== 'undefined'
    },
    shortRoom() {
      return this.room
    },
    inviteLink() {
      return `${window.location.origin}/video-call?room=${encodeURIComponent(this.room)}`
    },
    duration() {
      return this.fmt(this.startedAt ? this.now - this.startedAt : 0)
    },
    recDuration() {
      return this.fmt(this.recStart ? this.now - this.recStart : 0)
    },
    statusBadge() {
      if (this.signal === 'failed') return { cls: 'ui-badge--danger', label: 'Offline' }
      if (this.remoteStream && this.peerState === 'connected') return { cls: 'ui-badge--success', label: 'Connected' }
      if (this.remoteStream || this.peerState === 'connecting') return { cls: 'ui-badge--info', label: 'Connecting' }
      return { cls: 'ui-badge--draft', label: 'Waiting' }
    }
  },
  mounted() {
    document.addEventListener('fullscreenchange', this.onFullChange)
    navigator.mediaDevices?.addEventListener?.('devicechange', this.listDevices)
    // No camera or microphone on load: only a tap (Turn on, a toggle, Start / Join) opens them.
    this.unwatchHidden = whenHiddenFor(HIDDEN_STOP_MS, this.onLongHidden)
  },
  beforeUnmount() {
    this.gone = true
    this.unwatchHidden?.()
    document.removeEventListener('fullscreenchange', this.onFullChange)
    navigator.mediaDevices?.removeEventListener?.('devicechange', this.listDevices)
    this.teardown()
    this.stopStream()
  },
  async beforeRouteLeave(to, from, next) {
    if (this.phase !== 'call') return next()
    const ok = await confirmDialog({ title: 'Leave the call?', message: 'You will be disconnected from the call.', confirmText: 'Leave call', danger: true })
    next(ok)
  },
  methods: {
    fmt(ms) {
      const s = Math.max(0, Math.floor(ms / 1000))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const r = String(s % 60).padStart(2, '0')
      return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
    },
    // ---------------- devices & preview ----------------
    async listDevices() {
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        this.cameras = all.filter((d) => d.kind === 'videoinput')
        this.mics = all.filter((d) => d.kind === 'audioinput')
      } catch {
        this.cameras = []
        this.mics = []
      }
    },
    stopMeter() {
      cancelAnimationFrame(this.raf)
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => {})
        this.audioCtx = null
      }
      this.level = 0
    },
    stopStream() {
      this.stopMeter()
      stopStream(this.stream)
      this.stream = null
      this.hasVideo = this.hasAudio = false
    },
    syncTracks() {
      this.hasVideo = !!(this.stream && this.stream.getVideoTracks().length)
      this.hasAudio = !!(this.stream && this.stream.getAudioTracks().length)
    },
    videoConstraints() {
      return this.cameraId ? { deviceId: { exact: this.cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } }
    },
    audioConstraints() {
      return this.micId ? { deviceId: { exact: this.micId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true }
    },
    async getMedia(want) {
      const video = want.video ? this.videoConstraints() : false
      const audio = want.audio ? this.audioConstraints() : false
      let firstErr = null
      // Try what was chosen together, then each alone, so a missing or blocked device never stops the call.
      const tries = video && audio ? [{ video, audio }, { audio }, { video }] : [video ? { video } : { audio }]
      for (const c of tries) {
        try {
          return { stream: await openMedia(c, { alive: () => !this.gone }), err: firstErr }
        } catch (e) {
          if (e && e.closed) return { stream: null, err: null, closed: true }
          firstErr = firstErr || e
          if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break
        }
      }
      return { stream: null, err: firstErr }
    },
    /** "Turn on camera & mic" (and "Try again"): both devices on, preview starts. */
    turnOn() {
      this.camOn = true
      this.micOn = true
      return this.startPreview()
    },
    /** Open the chosen devices (a tap: Turn on, Try again, a device picker, Start / Join). */
    async startPreview() {
      this.stopStream()
      if (!this.supported) {
        this.media = { state: 'ready', problem: PROBLEMS.Unsupported }
        this.camOn = this.micOn = false
        return
      }
      if (!this.camOn && !this.micOn) {
        this.media = { state: 'off', problem: null }
        return
      }
      this.media = { state: 'loading', problem: null }
      const { stream, err, closed } = await this.getMedia({ video: this.camOn, audio: this.micOn })
      if (closed || this.gone) return
      this.stream = stream
      this.syncTracks()
      const problem = err && ((this.camOn && !this.hasVideo) || !stream) ? PROBLEMS[err.name] || { title: 'Camera unavailable', hint: 'Check your device and try again.' } : null
      // The toggles now show what is really on.
      this.camOn = this.hasVideo
      this.micOn = this.hasAudio
      this.media = { state: stream ? 'ready' : 'off', problem }
      if (stream) {
        this.attach()
        this.watchLevel()
      }
      await this.listDevices()
      if (!this.cameraId && this.hasVideo) this.cameraId = stream.getVideoTracks()[0].getSettings().deviceId || ''
      if (!this.micId && this.hasAudio) this.micId = stream.getAudioTracks()[0].getSettings().deviceId || ''
    },
    /** Turn one device on after a tap (lobby with the preview on, or in the call). */
    async addDevice(kind) {
      try {
        const s = await openMedia(kind === 'video' ? { video: this.videoConstraints() } : { audio: this.audioConstraints() }, { alive: () => !this.gone })
        const track = s.getTracks()[0]
        if (!this.stream) this.stream = new MediaStream()
        this.stream.addTrack(track)
        this.syncTracks()
        if (this.media.state === 'off') this.media = { state: 'ready', problem: null }
        if (kind === 'audio') {
          this.stopMeter()
          this.watchLevel()
        }
        if (this.phase === 'call') this.sendNewTrack(track)
        this.attach(true)
        this.listDevices()
        return true
      } catch (e) {
        if (!(e && e.closed)) {
          const p = PROBLEMS[e && e.name]
          toast.error(p ? `${p.title}. ${p.hint}` : kind === 'video' ? 'The camera couldn’t be started.' : 'The microphone couldn’t be started.')
        }
        return false
      }
    },
    /** Lobby: turn one device off for real (its light goes off), not just mute it. */
    dropDevice(kind) {
      if (!this.stream) return
      const tracks = kind === 'video' ? this.stream.getVideoTracks() : this.stream.getAudioTracks()
      for (const t of tracks) {
        stopTrack(t)
        this.stream.removeTrack(t)
      }
      if (kind === 'audio') this.stopMeter()
      this.syncTracks()
      if (!this.stream.getTracks().length) {
        this.stream = null
        this.media = { state: 'off', problem: null }
      }
      this.attach()
    },
    /** In the call: a device that was off at join is sent to the other person (renegotiates). */
    sendNewTrack(track) {
      const pc = webRTCService.peerConnection
      if (!pc || pc.signalingState === 'closed') return
      try {
        pc.addTrack(track, this.stream)
      } catch {
        return
      }
      webRTCService.localStream = this.stream
      if (pc.remoteDescription && pc.signalingState === 'stable') webRTCService.createOffer().catch(() => {})
    },
    /** The pre-join screen sat in a hidden tab for a long time: devices off (camera light off). */
    onLongHidden() {
      if (this.phase !== 'lobby' || this.media.state === 'off') return
      this.stopStream()
      this.media = { state: 'off', problem: null }
      toast.info('Your camera and microphone were turned off while this page was in the background.')
    },
    attach(force = false) {
      this.$nextTick(() => {
        const v = this.$refs.preview || this.$refs.local
        const src = this.sharing && this.screenStream ? this.screenStream : this.stream
        if (v && force && v.srcObject === src) v.srcObject = null // a track was added: show it
        if (v && v.srcObject !== src) v.srcObject = src
        const r = this.$refs.remote
        if (r && this.remoteStream) {
          if (force && r.srcObject === this.remoteStream) r.srcObject = null // the other person turned a device on: show it
          if (r.srcObject !== this.remoteStream) r.srcObject = this.remoteStream
        }
      })
    },
    watchLevel() {
      if (!this.hasAudio || !window.AudioContext) return
      try {
        this.audioCtx = new AudioContext()
        const src = this.audioCtx.createMediaStreamSource(this.stream)
        const an = this.audioCtx.createAnalyser()
        an.fftSize = 512
        src.connect(an)
        const buf = new Uint8Array(an.fftSize)
        const loop = () => {
          an.getByteTimeDomainData(buf)
          let peak = 0
          for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128))
          const target = this.micOn ? Math.min(1, peak / 64) : 0
          this.level = this.level * 0.7 + target * 0.3
          this.raf = requestAnimationFrame(loop)
        }
        loop()
      } catch {
        /* level meter is optional */
      }
    },
    async toggleMic() {
      if (this.phase === 'call') {
        if (!this.hasAudio) {
          // joined with the microphone off: turn it on now
          if (!(await this.addDevice('audio'))) return
          this.micOn = true
        } else {
          this.micOn = !this.micOn
          this.stream.getAudioTracks().forEach((t) => (t.enabled = this.micOn))
        }
        webRTCService.sendSignalingMessage({ type: 'mute-audio', data: { muted: !this.micOn } })
        return
      }
      // lobby: before the preview it is only the choice for Join
      this.micOn = !this.micOn
      if (this.media.state !== 'ready') return
      if (!this.micOn) this.dropDevice('audio')
      else if (!this.hasAudio && !(await this.addDevice('audio'))) this.micOn = false
    },
    async toggleCam() {
      if (this.phase === 'call') {
        if (!this.hasVideo) {
          if (!(await this.addDevice('video'))) return
          this.camOn = true
        } else {
          this.camOn = !this.camOn
          this.stream.getVideoTracks().forEach((t) => (t.enabled = this.camOn))
        }
        webRTCService.sendSignalingMessage({ type: 'mute-video', data: { muted: !this.camOn } })
        this.attach()
        return
      }
      this.camOn = !this.camOn
      if (this.media.state !== 'ready') return
      if (!this.camOn) this.dropDevice('video')
      else if (!this.hasVideo && !(await this.addDevice('video'))) this.camOn = false
      this.attach()
    },
    // ---------------- call ----------------
    listen(ev, fn) {
      webRTCService.on(ev, fn)
      this.handlers.push([ev, fn])
    },
    async join() {
      this.joining = true
      this.banner = null
      // Part of the Join tap: turn on what the toggles say (nothing was opened before).
      if (this.media.state === 'off' && (this.camOn || this.micOn)) {
        await this.startPreview()
        if (this.gone) return
      }
      if (this.media.state === 'off') this.camOn = this.micOn = false
      this.room = parseRoom(this.roomInput) || randomRoom()
      this.roomInput = this.room
      this.$router.replace({ query: { room: this.room } })
      this.remoteStream = null
      this.remoteCamOff = this.remoteMicOff = false
      this.peerState = ''
      this.signal = 'connecting'

      this.listen('remote-stream', (s) => {
        const first = this.remoteStream !== s
        this.remoteStream = s
        this.attach(true)
        if (first) this.sendState()
      })
      this.listen('connection-state-change', (st) => {
        this.peerState = st
        if (st === 'failed') this.banner = { kind: 'warn', text: 'The connection to the other person dropped. They may be behind a strict network; try rejoining.' }
      })
      this.listen('user-joined', () => {
        toast.info('Someone joined the call')
        this.sendState()
      })
      this.listen('user-left', () => {
        toast.info('The other person left')
        this.remoteStream = null
        this.resetPeer()
      })
      this.listen('remote-audio-toggle', (d) => (this.remoteMicOff = !!(d && d.muted)))
      this.listen('remote-video-toggle', (d) => (this.remoteCamOff = !!(d && d.muted)))
      this.listen('error', (d) => (this.banner = { kind: 'error', text: (d && (d.message || d.error)) || 'The call server reported a problem.' }))
      this.listen('signaling-disconnected', () => {
        if (this.phase === 'call') {
          this.signal = 'failed'
          this.banner = { kind: 'error', text: 'Lost connection to the call server. Rejoin to reconnect.' }
        }
      })

      try {
        await webRTCService.initialize(this.me.id, this.me.organization_id)
        this.addTracks()
        await webRTCService.joinRoom(this.room, this.room)
        this.signal = 'connected'
      } catch {
        this.signal = 'failed'
        this.banner = { kind: 'error', text: 'Couldn’t reach the call server, so others can’t join right now. You can still preview, share your screen and record.' }
      }
      this.phase = 'call'
      this.startedAt = Date.now()
      this.tick = setInterval(() => (this.now = Date.now()), 1000)
      this.joining = false
      this.attach()
    },
    /** Tell the other person whether our camera / microphone are on (they may be off since joining). */
    sendState() {
      webRTCService.sendSignalingMessage({ type: 'mute-audio', data: { muted: !(this.micOn && this.hasAudio) } })
      webRTCService.sendSignalingMessage({ type: 'mute-video', data: { muted: !(this.camOn && this.hasVideo) } })
    },
    addTracks() {
      const pc = webRTCService.peerConnection
      if (!pc) return
      if (this.stream) {
        webRTCService.localStream = this.stream
        this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream))
      } else {
        // Receive-only when we have no devices.
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' })
          pc.addTransceiver('video', { direction: 'recvonly' })
        } catch {
          /* older browsers */
        }
      }
    },
    resetPeer() {
      // Prepare a fresh peer connection for the next person who joins.
      try {
        if (webRTCService.peerConnection) webRTCService.peerConnection.close()
        webRTCService.setupPeerConnection()
        webRTCService.pendingIceCandidates = []
        webRTCService.isHost = true
        this.addTracks()
      } catch {
        /* ignore */
      }
    },
    copyLink() {
      const text = this.inviteLink
      const done = () => toast.success('Invite link copied')
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast.info(text, { duration: 10000 }))
      else toast.info(text, { duration: 10000 })
    },
    async toggleShare() {
      if (this.sharing) return this.stopShare()
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        this.screenStream = s
        this.sharing = true
        const track = s.getVideoTracks()[0]
        track.onended = () => this.stopShare()
        const sender = webRTCService.peerConnection && webRTCService.peerConnection.getSenders().find((x) => x.track && x.track.kind === 'video')
        if (sender) await sender.replaceTrack(track)
        webRTCService.sendSignalingMessage({ type: 'screen-share', data: { started: true } })
        this.attach()
      } catch (e) {
        if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast.error('Screen sharing isn’t available right now')
      }
    },
    async stopShare() {
      if (this.screenStream) this.screenStream.getTracks().forEach((t) => t.stop())
      this.screenStream = null
      this.sharing = false
      const cam = this.stream && this.stream.getVideoTracks()[0]
      const sender = webRTCService.peerConnection && webRTCService.peerConnection.getSenders().find((x) => x.track && x.track.kind === 'video')
      if (sender && cam) await sender.replaceTrack(cam).catch(() => {})
      webRTCService.sendSignalingMessage({ type: 'stop-screen-share', data: { stopped: true } })
      this.attach()
    },
    toggleRecord() {
      if (this.recording) return this.stopRecord()
      const tracks = []
      const video = (this.sharing && this.screenStream ? this.screenStream : this.remoteStream || this.stream)?.getVideoTracks()[0]
      if (video) tracks.push(video)
      ;[this.stream, this.remoteStream].forEach((s) => s && s.getAudioTracks().forEach((t) => tracks.push(t)))
      if (!tracks.length) {
        toast.info('There’s nothing to record yet — turn on your camera or microphone first')
        return
      }
      const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      const mimeType = types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || ''
      try {
        this.recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined)
      } catch {
        toast.error('Recording isn’t supported in this browser')
        return
      }
      this.recChunks = []
      this.recorder.ondataavailable = (e) => e.data && e.data.size && this.recChunks.push(e.data)
      this.recorder.onstop = () => {
        if (!this.recChunks.length) return
        const type = this.recorder.mimeType || 'video/webm'
        downloadBlob(new Blob(this.recChunks, { type }), `call-${this.room}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${type.includes('mp4') ? 'mp4' : 'webm'}`)
        toast.success('Recording saved to your device')
      }
      this.recorder.start(1000)
      this.recording = true
      this.recStart = Date.now()
      webRTCService.sendSignalingMessage({ type: 'start-recording', data: { started: true } })
    },
    stopRecord() {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
      this.recording = false
      this.recStart = 0
      webRTCService.sendSignalingMessage({ type: 'stop-recording', data: { stopped: true } })
    },
    toggleFull() {
      const el = this.$refs.stageWrap
      if (!document.fullscreenElement && el && el.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    },
    onFullChange() {
      this.isFull = !!document.fullscreenElement
    },
    teardown() {
      if (this.recording) this.stopRecord()
      if (this.screenStream) this.screenStream.getTracks().forEach((t) => t.stop())
      this.screenStream = null
      this.sharing = false
      clearInterval(this.tick)
      this.handlers.forEach(([ev, fn]) => webRTCService.off(ev, fn))
      this.handlers = []
      // Keep our own camera stream alive (the service would stop it on cleanup).
      webRTCService.localStream = null
      try {
        if (webRTCService.roomId) webRTCService.leaveRoom()
        else webRTCService.cleanup()
      } catch {
        /* already closed */
      }
      this.remoteStream = null
    },
    async leave() {
      this.endedDuration = this.duration
      this.endReason = ''
      this.teardown()
      this.stopStream()
      this.media = { state: 'off', problem: null }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      this.phase = 'ended'
    },
    rejoin() {
      // a tap: Join turns the chosen devices back on
      this.phase = 'lobby'
      this.media = { state: 'off', problem: null }
      this.join()
    },
    newCall() {
      // back to the lobby with everything off — nothing turns on until a tap
      this.roomInput = ''
      this.$router.replace({ query: {} })
      this.phase = 'lobby'
      this.media = { state: 'off', problem: null }
    }
  }
}
</script>

<style scoped>
.mono {
  font-family: var(--font-mono);
}

.call-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.lobby {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 24px;
  align-items: start;
}

.preview-card {
  padding: 16px;
}

.tile {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview {
  aspect-ratio: 16 / 9;
}

.preview video {
  transform: scaleX(-1);
}

.tile__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 16px;
}

.tile__empty p {
  margin: 0;
}

.off-title {
  font-weight: 650;
  color: var(--text);
}

.off-title i {
  color: var(--text-3);
  margin-right: 4px;
}

.problem {
  font-weight: 650;
  color: var(--text);
}

.problem i {
  color: var(--danger);
  margin-right: 4px;
}

.big-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 30px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 6px;
}

.big-avatar.sm {
  width: 52px;
  height: 52px;
  font-size: 18px;
  margin: 0;
}

.tile__bar {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.round {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  box-shadow: var(--shadow-sm);
  transition: background 0.15s, color 0.15s, transform 0.1s;
}

.round:hover:not(:disabled) {
  background: var(--surface-hover);
}

.round:active:not(:disabled) {
  transform: scale(0.96);
}

.round:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.round.off {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--text-inverse);
}

.round.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}

.round.rec {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
  animation: blink 1.4s infinite;
}

.round.lg {
  width: 52px;
  height: 52px;
  font-size: 18px;
}

.meter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.level {
  flex: 0 0 180px;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}

.level span {
  display: block;
  height: 100%;
  background: var(--success);
  transition: width 0.08s linear;
}

.join-card h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
}

.form-grid.one {
  grid-template-columns: 1fr;
  margin: 20px 0;
}

.room-row {
  display: flex;
  gap: 6px;
}

.join-btn {
  width: 100%;
  justify-content: center;
  height: 46px;
  font-size: 15px;
}

.center {
  text-align: center;
  margin: 10px 0 0;
}

/* call */
.call {
  display: flex;
  flex-direction: column;
}

.call:fullscreen {
  background: var(--bg);
  padding: 16px;
}

.stage {
  position: relative;
  height: calc(100vh - 290px);
  min-height: 360px;
}

.call:fullscreen .stage {
  height: calc(100vh - 110px);
}

.stage .main {
  position: absolute;
  inset: 0;
}

.stage .pip {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 240px;
  aspect-ratio: 16 / 10;
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--surface);
  z-index: 2;
}

.stage .pip video {
  transform: scaleX(-1);
}

.small-empty {
  gap: 0;
}

.name-tag {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.name-tag i {
  color: var(--danger);
  margin-right: 3px;
}

.pulse {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 24px;
  margin-bottom: 8px;
  animation: ring 2s infinite;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px 0 4px;
  flex-wrap: wrap;
}

.end {
  height: 52px;
  padding: 0 22px;
  border-radius: 999px;
  font-size: 15px;
}

.rec-note {
  text-align: center;
  color: var(--danger);
  font-size: 13px;
  margin: 6px 0 0;
}

.rec-note .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  margin-right: 4px;
  animation: blink 1.4s infinite;
}

.ended {
  max-width: 720px;
  margin: 24px auto 0;
}

@keyframes blink {
  50% {
    opacity: 0.45;
  }
}

@keyframes ring {
  0% {
    box-shadow: 0 0 0 0 var(--accent-ring);
  }
  70% {
    box-shadow: 0 0 0 18px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (max-width: 1000px) {
  .lobby {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stage {
    height: calc(100vh - 300px);
    min-height: 320px;
  }
  .stage .pip {
    width: 120px;
    right: 10px;
    bottom: 10px;
  }
  .controls {
    gap: 8px;
  }
  .round.lg {
    width: 46px;
    height: 46px;
    font-size: 16px;
  }
  .end {
    height: 46px;
    padding: 0 16px;
  }
  .level {
    flex-basis: 100px;
  }
  /* phones: the "off" message needs more room than a 16:9 tile */
  .preview.is-off {
    aspect-ratio: auto;
  }
  .preview.is-off .tile__empty {
    position: relative;
    inset: auto;
    min-height: 240px;
    padding: 20px 14px 76px;
  }
  .preview.is-off .big-avatar {
    width: 56px;
    height: 56px;
    font-size: 20px;
    margin-bottom: 2px;
  }
}
</style>
