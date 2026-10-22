/**
 * Secure call engine: a WebRTC mesh (everyone connects to everyone, ≤ 6
 * people) whose signalling is end-to-end encrypted (see secureCall.js).
 *
 * Media goes browser to browser with DTLS-SRTP. Every connection of this
 * browser uses ONE certificate, so each participant has one DTLS
 * fingerprint; the security code is a hash of all of them. If someone sat
 * in the middle of a connection, the two ends would see different
 * fingerprints and therefore different codes.
 *
 * Who makes the offer: of two participants, the one whose id sorts first.
 * The other answers (and asks for an ICE restart when its side breaks).
 */
import { reactive, markRaw } from 'vue'
import { CallRelay, linkCheck, messageKey, aadFor, seal, unseal, securityCode } from './secureCall'
import { openMedia, stopTrack, mediaSupported } from './mediaGuard'

export const MAX_ON_PHONE = 4

export function isPhone() {
  try {
    return window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) < 820
  } catch {
    return false
  }
}

export function canShareScreen() {
  return !!navigator.mediaDevices?.getDisplayMedia && !isPhone()
}

function sdpFingerprint(sdp) {
  const m = /a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/.exec(sdp || '')
  return m ? m[1].toUpperCase() : ''
}

const DEFAULT_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

class PeerLink {
  constructor(engine, view) {
    this.e = engine
    this.id = view.id
    this.view = view
    this.initiator = engine.state.me.id < view.id
    this.closed = false
    this.goneSince = 0
    this.lastStats = null
    this.make()
  }

  make() {
    const e = this.e
    const cfg = { iceServers: e.iceServers, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' }
    if (e.cert) cfg.certificates = [e.cert]
    const pc = new RTCPeerConnection(cfg)
    this.pc = pc
    this.pending = []
    this.outCands = []
    this.candTimer = null
    this.chain = Promise.resolve()
    this.audioTx = null
    this.videoTx = null
    this.remoteFp = ''
    this.restarts = 0
    this.lastRestart = 0
    this.connectingSince = Date.now()
    this.stream = new MediaStream()
    this.view.stream = markRaw(this.stream)
    this.view.conn = 'connecting'
    this.view.quality = ''
    this.view.framesDecoded = 0
    pc.onicecandidate = (ev) => {
      if (ev.candidate && ev.candidate.candidate) this.queueCandidate(ev.candidate.toJSON())
    }
    pc.ontrack = (ev) => {
      if (!this.stream.getTracks().includes(ev.track)) this.stream.addTrack(ev.track)
      this.view.stream = markRaw(this.stream)
      this.view.tracks = this.stream.getTracks().length
    }
    pc.onconnectionstatechange = () => this.onState()
    pc.oniceconnectionstatechange = () => this.onState()
    if (this.initiator) {
      this.addTransceivers()
      this.run(() => this.offer({ fresh: true }))
    }
  }

  /** Run fn after everything queued for this connection (signalling must be applied in order). */
  run(fn) {
    this.chain = this.chain.then(() => (this.closed ? null : fn())).catch((err) => this.e.debug('peer', this.id, err))
    return this.chain
  }

  addTransceivers() {
    const e = this.e
    this.audioTx = this.pc.addTransceiver(e.micTrack || 'audio', { direction: 'sendrecv', streams: [e.outStream] })
    this.videoTx = this.pc.addTransceiver(e.videoOut() || 'video', { direction: 'sendrecv', streams: [e.outStream] })
  }

  async offer({ fresh = false, iceRestart = false } = {}) {
    const pc = this.pc
    if (pc.signalingState === 'have-local-offer' && iceRestart) {
      // our last offer was never answered (lost while the network was down): take it back
      await pc.setLocalDescription({ type: 'rollback' })
    }
    if (pc.signalingState !== 'stable') return
    const o = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined)
    await pc.setLocalDescription(o)
    this.e.sendTo(this.id, { t: 'offer', sdp: pc.localDescription.sdp, fresh })
  }

  async onOffer(msg) {
    const pc = this.pc
    if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' })
    await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
    if (!this.audioTx || !this.videoTx) {
      // first offer: send our tracks on the transceivers it created
      for (const tr of pc.getTransceivers()) {
        const kind = tr.receiver?.track?.kind
        if (kind === 'audio' && !this.audioTx) this.audioTx = tr
        else if (kind === 'video' && !this.videoTx) this.videoTx = tr
      }
      for (const [tr, track] of [
        [this.audioTx, this.e.micTrack],
        [this.videoTx, this.e.videoOut()]
      ]) {
        if (!tr) continue
        tr.direction = 'sendrecv'
        await tr.sender.replaceTrack(track || null)
        try {
          tr.sender.setStreams?.(this.e.outStream)
        } catch {
          /* older browsers: the other side builds the stream itself */
        }
      }
    }
    await this.flushPending()
    const a = await pc.createAnswer()
    await pc.setLocalDescription(a)
    this.e.sendTo(this.id, { t: 'answer', sdp: pc.localDescription.sdp })
    this.remoteFp = sdpFingerprint(pc.remoteDescription?.sdp) || this.remoteFp
  }

  async onAnswer(msg) {
    const pc = this.pc
    if (pc.signalingState !== 'have-local-offer') return
    await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
    await this.flushPending()
    this.remoteFp = sdpFingerprint(pc.remoteDescription?.sdp) || this.remoteFp
  }

  async onCandidates(list) {
    for (const c of list || []) {
      if (!this.pc.remoteDescription) this.pending.push(c)
      else await this.pc.addIceCandidate(c).catch(() => {})
    }
  }

  async flushPending() {
    const p = this.pending
    this.pending = []
    for (const c of p) await this.pc.addIceCandidate(c).catch(() => {})
  }

  queueCandidate(c) {
    this.outCands.push(c)
    if (this.candTimer) return
    this.candTimer = setTimeout(() => {
      this.candTimer = null
      const list = this.outCands
      this.outCands = []
      if (list.length && !this.closed) this.e.sendTo(this.id, { t: 'cand', c: list })
    }, 60)
  }

  state() {
    const pc = this.pc
    const cs = pc.connectionState
    if (cs) return cs
    const ice = pc.iceConnectionState
    return ice === 'completed' ? 'connected' : ice === 'checking' ? 'connecting' : ice
  }

  onState() {
    if (this.closed) return
    const st = this.state()
    const was = this.view.conn
    this.view.conn = st === 'connected' ? 'connected' : st === 'failed' ? 'failed' : st === 'disconnected' ? 'reconnecting' : st === 'closed' ? 'closed' : 'connecting'
    if (st === 'connected') {
      this.restarts = 0
      clearTimeout(this.discTimer)
      if (was !== 'connected') {
        this.remoteFp = sdpFingerprint(this.pc.remoteDescription?.sdp) || this.remoteFp
        this.e.applyBitrates()
        this.e.sendStateTo(this.id)
      }
    } else if (st === 'disconnected') {
      clearTimeout(this.discTimer)
      this.discTimer = setTimeout(() => {
        if (!this.closed && this.state() === 'disconnected') this.restart('disconnected')
      }, 4000)
    } else if (st === 'failed') {
      this.restart('failed')
    }
    if (st !== 'connected' && was === 'connected') this.connectingSince = Date.now()
    this.e.updateCode()
  }

  /** ICE restart (the offerer does it; the answerer asks for it). */
  restart(why) {
    if (this.closed) return
    const now = Date.now()
    if (now - this.lastRestart < 5000) return
    this.lastRestart = now
    this.restarts++
    this.e.debug('restart', this.id, why, this.restarts)
    if (this.restarts > 3) return this.rebuild()
    if (this.initiator) {
      try {
        this.pc.restartIce?.()
      } catch {
        /* createOffer({iceRestart}) below does the same */
      }
      this.run(() => this.offer({ iceRestart: true }))
    } else {
      this.e.sendTo(this.id, { t: 'restart' })
    }
  }

  /** Start over with a new connection (after repeated failures). */
  rebuild() {
    if (this.closed) return
    if (!this.initiator) {
      this.e.sendTo(this.id, { t: 'rebuild' })
      this.restarts = 0
      return
    }
    this.closePC()
    this.make()
  }

  closePC() {
    clearTimeout(this.discTimer)
    clearTimeout(this.candTimer)
    try {
      this.pc.onicecandidate = this.pc.ontrack = this.pc.onconnectionstatechange = this.pc.oniceconnectionstatechange = null
      this.pc.close()
    } catch {
      /* already closed */
    }
  }

  close() {
    this.closed = true
    this.closePC()
    this.view.conn = 'closed'
  }

  async stats() {
    if (this.closed) return
    let report
    try {
      report = await this.pc.getStats()
    } catch {
      return
    }
    let rtt = null
    let lost = 0
    let recv = 0
    let frames = 0
    let level = 0
    let pairId = ''
    let remoteCertId = ''
    const byId = new Map()
    report.forEach((r) => {
      byId.set(r.id, r)
      if (r.type === 'transport') {
        if (r.selectedCandidatePairId) pairId = r.selectedCandidatePairId
        if (r.remoteCertificateId) remoteCertId = r.remoteCertificateId
      }
      if (r.type === 'inbound-rtp' && !r.isRemote) {
        lost += r.packetsLost || 0
        recv += r.packetsReceived || 0
        if (r.kind === 'video') frames = r.framesDecoded || 0
        if (r.kind === 'audio' && typeof r.audioLevel === 'number') level = r.audioLevel
      }
    })
    let pair = pairId ? byId.get(pairId) : null
    if (!pair) report.forEach((r) => r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected) && (pair = r))
    if (pair) {
      rtt = typeof pair.currentRoundTripTime === 'number' ? pair.currentRoundTripTime : null
      const local = byId.get(pair.localCandidateId)
      const remote = byId.get(pair.remoteCandidateId)
      this.view.relayed = local?.candidateType === 'relay' || remote?.candidateType === 'relay'
    }
    if (remoteCertId && byId.get(remoteCertId)?.fingerprint) {
      const fp = String(byId.get(remoteCertId).fingerprint).toUpperCase()
      if (fp !== this.remoteFp) {
        this.remoteFp = fp
        this.e.updateCode()
      }
    }
    const prev = this.lastStats
    this.lastStats = { lost, recv }
    let loss = 0
    if (prev) {
      const dl = Math.max(0, lost - prev.lost)
      const dr = Math.max(0, recv - prev.recv)
      loss = dl + dr > 0 ? dl / (dl + dr) : 0
    }
    this.view.framesDecoded = frames
    this.view.speaking = level > 0.04
    this.view.rtt = rtt
    if (this.view.conn !== 'connected') this.view.quality = ''
    else if ((rtt == null || rtt < 0.3) && loss < 0.03) this.view.quality = 'good'
    else if ((rtt == null || rtt < 0.7) && loss < 0.1) this.view.quality = 'fair'
    else this.view.quality = 'poor'
    // stuck while connecting
    if (this.view.conn === 'connecting' && Date.now() - this.connectingSince > 20000) {
      this.connectingSince = Date.now()
      this.restart('stuck')
    }
  }
}

export class SecureCallEngine {
  constructor(roomId, key) {
    this.roomId = roomId
    this.key = key
    this.relay = new CallRelay(roomId)
    this.links = new Map()
    this.lastN = new Map()
    this.counter = 0
    this.sendChain = Promise.resolve()
    this.inbox = Promise.resolve()
    this.cert = null
    this.localFp = ''
    this.iceServers = DEFAULT_ICE
    this.micTrack = null
    this.camTrack = null
    this.screenTrack = null
    this.outStream = new MediaStream()
    this.onNotice = null
    this.timers = []
    this.check = ''
    this.aes = null
    this.closed = false
    this.state = reactive({
      phase: 'setup',
      error: '',
      errorCode: '',
      me: { id: '', name: '', isHost: false },
      room: {},
      peers: [],
      lobby: [],
      // mic / cam: what the person chose — Join turns these on. Nothing is opened
      // before a tap: `preview` is true once the camera / microphone run on the
      // pre-join screen (after "Turn on camera & mic", or Join).
      mic: true,
      cam: true,
      preview: false,
      screen: false,
      facing: 'user',
      deafened: false,
      localStream: null,
      mediaError: '',
      devices: { audioinput: [], videoinput: [], audiooutput: [] },
      audioId: '',
      videoId: '',
      outputId: '',
      tamper: 0,
      code: '',
      codeState: 'alone',
      relayState: 'ok',
      relayMode: 'notify',
      turn: false
    })
  }

  debug(...a) {
    if (window.localStorage?.getItem?.('seccall.debug') === '1') console.debug('[seccall]', ...a)
  }

  async keys() {
    if (!this.check) this.check = await linkCheck(this.key)
    if (!this.aes) this.aes = await messageKey(this.key, this.roomId)
    return this.check
  }

  // ---------------------------------------------------------------- media

  videoOut() {
    return this.screenTrack || (this.state.cam ? this.camTrack : null)
  }

  videoConstraints(deviceId) {
    const c = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }
    if (deviceId) c.deviceId = { exact: deviceId }
    else c.facingMode = this.state.facing
    return c
  }

  audioConstraints(deviceId) {
    const c = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    if (deviceId) c.deviceId = { exact: deviceId }
    return c
  }

  refreshPreview() {
    const t = this.screenTrack || (this.state.cam ? this.camTrack : null)
    this.state.localStream = t ? markRaw(new MediaStream([t])) : null
  }

  /** getUserMedia for a tap; refused once the engine is closed (the page went away). */
  media(constraints) {
    return openMedia(constraints, { alive: () => !this.closed })
  }

  /** Pre-join (before a tap): the toggles only change what Join turns on. */
  choosing() {
    return this.state.phase === 'setup' && !this.state.preview
  }

  /**
   * Turn on the chosen camera / microphone (whatever is not running yet).
   * Only after a tap: "Turn on camera & mic" (both: true) or Join.
   * Falls back to the microphone alone, then the camera alone, then nothing.
   */
  async startMedia({ both = false } = {}) {
    const s = this.state
    if (both) s.mic = s.cam = true
    s.mediaError = ''
    if (!mediaSupported()) {
      s.mediaError = "This browser doesn't give the page a camera or microphone. You can still join and listen."
      s.mic = s.cam = false
      return
    }
    const wantA = s.mic && !this.micTrack
    const wantV = s.cam && !this.camTrack
    if (wantA || wantV) {
      const audio = wantA ? this.audioConstraints(s.audioId) : false
      const video = wantV ? this.videoConstraints(s.videoId) : false
      const tries = wantA && wantV ? [{ audio, video }, { audio, video: false }, { audio: false, video }] : [{ audio, video }]
      let stream = null
      let first = null
      for (const c of tries) {
        try {
          stream = await this.media(c)
          break
        } catch (err) {
          if (err?.closed) return
          first = first || err
        }
      }
      if (stream) {
        const a = stream.getAudioTracks()[0] || null
        const v = stream.getVideoTracks()[0] || null
        if (a) {
          this.micTrack = a
          a.enabled = s.mic
          s.audioId = a.getSettings?.().deviceId || s.audioId
        }
        if (v) {
          this.camTrack = v
          s.videoId = v.getSettings?.().deviceId || s.videoId
        }
        if (wantA && !a) s.mic = false
        if (wantV && !v) s.cam = false
        if (first && wantV && !v) s.mediaError = first.name === 'NotAllowedError' ? 'Camera blocked — allow it in your browser settings to be seen.' : 'No camera found — you can join with sound only.'
        else if (first && wantA && !a) s.mediaError = first.name === 'NotAllowedError' ? 'Microphone blocked — allow it in your browser settings to be heard.' : 'No microphone found — others won’t hear you.'
      } else {
        if (wantA) s.mic = false
        if (wantV) s.cam = false
        s.mediaError =
          first?.name === 'NotAllowedError'
            ? 'Camera and microphone are blocked. Allow them in your browser settings (the icon next to the address), or join to listen only.'
            : 'No camera or microphone found. You can still join to watch and listen.'
      }
    }
    s.preview = !!(this.micTrack || this.camTrack)
    this.refreshPreview()
    if (s.preview) await this.listDevices()
  }

  async listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const d = { audioinput: [], videoinput: [], audiooutput: [] }
      let n = { audioinput: 0, videoinput: 0, audiooutput: 0 }
      for (const x of all) {
        if (!d[x.kind] || !x.deviceId || (x.kind === 'audiooutput' && (x.deviceId === 'default' || x.deviceId === 'communications'))) continue
        n[x.kind]++
        const fallback = x.kind === 'audioinput' ? `Microphone ${n[x.kind]}` : x.kind === 'videoinput' ? `Camera ${n[x.kind]}` : `Speaker ${n[x.kind]}`
        d[x.kind].push({ id: x.deviceId, label: x.label || fallback })
      }
      if (!('setSinkId' in HTMLMediaElement.prototype)) d.audiooutput = []
      this.state.devices = d
    } catch {
      /* no device list */
    }
  }

  replaceVideo() {
    const t = this.videoOut()
    for (const l of this.links.values()) l.videoTx?.sender?.replaceTrack(t || null).catch(() => {})
    this.refreshPreview()
  }

  replaceAudio() {
    for (const l of this.links.values()) l.audioTx?.sender?.replaceTrack(this.micTrack || null).catch(() => {})
  }

  async toggleMic() {
    const s = this.state
    if (this.choosing()) {
      s.mic = !s.mic // only the choice for Join: nothing is opened
      return
    }
    if (!this.micTrack) {
      try {
        const st = await this.media({ audio: this.audioConstraints(s.audioId) })
        this.micTrack = st.getAudioTracks()[0]
        s.preview = s.preview || s.phase === 'setup'
        s.mediaError = ''
        this.replaceAudio()
        s.mic = true
      } catch (err) {
        if (!err?.closed) s.mediaError = 'The microphone is blocked or missing. Allow it in your browser settings.'
        return
      }
    } else {
      s.mic = !s.mic
      this.micTrack.enabled = s.mic
    }
    this.broadcastState()
  }

  async toggleCam() {
    const s = this.state
    if (this.choosing()) {
      s.cam = !s.cam // only the choice for Join: nothing is opened
      return
    }
    if (s.cam) {
      s.cam = false
      stopTrack(this.camTrack) // camera light off
      this.camTrack = null
    } else {
      try {
        const st = await this.media({ video: this.videoConstraints(s.videoId) })
        this.camTrack = st.getVideoTracks()[0]
        s.cam = true
        s.preview = s.preview || s.phase === 'setup'
        s.mediaError = ''
      } catch (err) {
        if (!err?.closed) s.mediaError = err?.name === 'NotAllowedError' ? 'The camera is blocked. Allow it in your browser settings.' : "The camera couldn't be started."
        return
      }
    }
    this.replaceVideo()
    this.broadcastState()
  }

  /** Front ↔ back camera on phones. */
  async switchCamera() {
    const s = this.state
    if (!s.cam) return
    const next = s.facing === 'user' ? 'environment' : 'user'
    const old = this.camTrack
    stopTrack(old) // iOS cannot open two cameras at once
    try {
      s.facing = next
      s.videoId = ''
      const st = await this.media({ video: this.videoConstraints('') })
      this.camTrack = st.getVideoTracks()[0]
    } catch {
      s.facing = next === 'user' ? 'environment' : 'user'
      try {
        const st = await this.media({ video: this.videoConstraints('') })
        this.camTrack = st.getVideoTracks()[0]
      } catch {
        this.camTrack = null
        s.cam = false
      }
    }
    this.replaceVideo()
  }

  async setDevice(kind, id) {
    const s = this.state
    if (kind === 'audioinput') {
      s.audioId = id
      // a device picked while nothing runs is used when the microphone turns on
      if (!this.micTrack || this.choosing()) return
      try {
        const st = await this.media({ audio: this.audioConstraints(id) })
        stopTrack(this.micTrack)
        this.micTrack = st.getAudioTracks()[0]
        this.micTrack.enabled = s.mic
        this.replaceAudio()
      } catch {
        s.mediaError = "That microphone couldn't be used."
      }
    } else if (kind === 'videoinput') {
      s.videoId = id
      if (!s.cam || this.choosing()) return
      stopTrack(this.camTrack)
      try {
        const st = await this.media({ video: this.videoConstraints(id) })
        this.camTrack = st.getVideoTracks()[0]
      } catch {
        this.camTrack = null
        s.cam = false
        s.mediaError = "That camera couldn't be used."
      }
      this.replaceVideo()
    } else if (kind === 'audiooutput') {
      s.outputId = id
    }
  }

  async shareScreen() {
    if (this.screenTrack) return this.stopShare()
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false })
      this.screenTrack = st.getVideoTracks()[0]
      this.screenTrack.addEventListener('ended', () => this.stopShare())
      this.state.screen = true
      this.replaceVideo()
      this.broadcastState()
    } catch {
      /* cancelled */
    }
  }

  stopShare() {
    if (!this.screenTrack) return
    stopTrack(this.screenTrack)
    this.screenTrack = null
    this.state.screen = false
    this.replaceVideo()
    this.broadcastState()
  }

  /** Everything off (camera light off); the mic / cam choices stay for Join. */
  stopMedia() {
    for (const t of [this.micTrack, this.camTrack, this.screenTrack]) stopTrack(t)
    this.micTrack = this.camTrack = this.screenTrack = null
    this.state.localStream = null
    this.state.preview = false
    this.state.screen = false
  }

  /** The page is going away: stop everything, and any camera that starts late is stopped at once. */
  close() {
    this.closed = true
    this.stopMedia()
  }

  // ---------------------------------------------------------------- join & relay

  async preview() {
    return this.relay.preview(await this.keys())
  }

  async join(name, { asHost = false } = {}) {
    const s = this.state
    s.phase = 'joining'
    s.error = ''
    try {
      // part of the Join tap: turn on what the toggles say (if not on already)
      await this.startMedia()
      if (this.closed) return
      await this.keys()
      if (typeof RTCPeerConnection.generateCertificate === 'function') {
        try {
          this.cert = await RTCPeerConnection.generateCertificate({ name: 'ECDSA', namedCurve: 'P-256' })
          const fps = this.cert.getFingerprints?.() || []
          this.localFp = String((fps.find((f) => f.algorithm === 'sha-256') || fps[0] || {}).value || '').toUpperCase()
        } catch {
          this.cert = null
        }
      }
      const d = await this.relay.join(name, this.check, asHost)
      s.me = { id: d.participant_id, name, isHost: !!d.is_host }
      s.room = d.room || {}
      s.lobby = d.lobby || []
      this.relay.onFatal = (e) => this.onRelayError(e, true)
      if (d.state === 'lobby') {
        s.phase = 'lobby'
      } else {
        await this.loadIce()
        s.phase = 'call'
        this.reconcile(d.peers || [])
      }
      this.listen()
      this.relay.poll(
        (res) => this.onPoll(res),
        (e, fatal) => this.onRelayError(e, fatal)
      )
    } catch (e) {
      s.phase = 'setup'
      s.error = e.message || 'Could not join the call.'
      s.errorCode = e.code || ''
      throw e
    }
  }

  async loadIce() {
    try {
      const d = await this.relay.ice()
      if (d?.ice_servers?.length) this.iceServers = d.ice_servers
      this.state.turn = !!d?.relay
    } catch {
      this.iceServers = DEFAULT_ICE
    }
  }

  listen() {
    const net = () => {
      this.debug('network change')
      this.relay.kick()
      setTimeout(() => {
        for (const l of this.links.values()) if (l.view.conn !== 'connected' || navigator.onLine) l.restart('network')
      }, 1000)
    }
    const hide = () => this.relay.beaconLeave()
    window.addEventListener('online', net)
    window.addEventListener('pagehide', hide)
    const conn = navigator.connection
    conn?.addEventListener?.('change', net)
    this.unlisten = () => {
      window.removeEventListener('online', net)
      window.removeEventListener('pagehide', hide)
      conn?.removeEventListener?.('change', net)
    }
    this.timers.push(setInterval(() => this.collectStats(), 2000))
  }

  onRelayError(e, fatal) {
    const s = this.state
    if (!fatal) {
      s.relayState = 'reconnecting'
      return true
    }
    const end = (phase, msg) => {
      s.phase = phase
      s.error = msg || e.message
      s.errorCode = e.code || ''
      this.teardown()
      return false
    }
    switch (e.code) {
      case 'CALL_ENDED':
      case 'NOT_FOUND':
        return end('ended', 'This call has ended.')
      case 'REMOVED':
        return end('removed')
      case 'DENIED':
        return end('denied')
      case 'NOT_IN_CALL':
        return end('left', e.message)
      default:
        if (e.status === 409 && e.code === 'FULL') return end('error')
        s.relayState = 'reconnecting'
        return true
    }
  }

  async onPoll(res) {
    const s = this.state
    s.relayState = 'ok'
    s.relayMode = res.relay || 'notify'
    s.room = { ...s.room, ...(res.room || {}) }
    if (s.me.isHost) s.lobby = res.lobby || []
    const you = res.you?.state
    if (you === 'lobby') {
      s.phase = 'lobby'
    } else if (you === 'active' && s.phase === 'lobby') {
      await this.loadIce()
      s.phase = 'call'
      this.notice("You're in — the host let you join.", 'success')
    }
    if (s.phase === 'call') this.reconcile(res.peers || [])
    for (const m of res.messages || []) {
      if (m.kind === 'evt') this.onEvent(m.event || {})
      else await this.onSignal(m)
    }
  }

  onEvent(ev) {
    const s = this.state
    const name = ev.name || this.links.get(ev.pid)?.view.name || 'Someone'
    switch (ev.type) {
      case 'join':
        if (ev.pid !== s.me.id) this.notice(ev.resumed ? `${name} is back` : `${name} joined`, 'info')
        break
      case 'leave': {
        const l = this.links.get(ev.pid)
        if (l && ev.reason !== 'stale') this.dropLink(ev.pid)
        else if (l) l.goneSince = Date.now()
        this.notice(ev.reason === 'removed' ? `${name} was removed` : ev.reason === 'stale' ? `${name} lost connection` : `${name} left`, 'info')
        break
      }
      case 'knock':
        if (s.me.isHost) this.notice(`${ev.name} is waiting to join`, 'warning')
        break
      case 'lock':
        this.notice(ev.locked ? 'The host locked the call — nobody new can join' : 'The host unlocked the call', 'info')
        break
      case 'lobby':
        if (s.me.isHost) this.notice(ev.enabled ? 'People now wait for you to let them in' : 'People join without waiting', 'info')
        break
    }
  }

  notice(text, kind = 'info') {
    if (this.onNotice) this.onNotice(text, kind)
  }

  /** Bring the connections in line with who is in the call. */
  reconcile(peers) {
    const s = this.state
    const ids = new Set(peers.map((p) => p.id))
    for (const p of peers) {
      if (p.id === s.me.id) continue
      let l = this.links.get(p.id)
      if (!l || l.closed) {
        const view = reactive({ id: p.id, name: p.name, isHost: !!p.is_host, conn: 'connecting', quality: '', mic: true, cam: true, screen: false, stream: null, speaking: false, framesDecoded: 0, relayed: false, rtt: null, away: false, tracks: 0 })
        l = new PeerLink(this, view)
        this.links.set(p.id, l)
        s.peers = [...s.peers.filter((x) => x.id !== p.id), view]
      } else {
        l.goneSince = 0
        l.view.away = false
        l.view.name = p.name
      }
    }
    for (const [id, l] of this.links) {
      if (ids.has(id)) continue
      if (!l.goneSince) l.goneSince = Date.now()
      l.view.away = true
      // went quiet (network blip): keep a live connection for a minute
      if (l.view.conn !== 'connected' || Date.now() - l.goneSince > 60000) this.dropLink(id)
    }
    this.applyBitrates()
    this.updateCode()
  }

  dropLink(id) {
    const l = this.links.get(id)
    if (!l) return
    l.close()
    this.links.delete(id)
    this.lastN.delete(id)
    this.state.peers = this.state.peers.filter((p) => p.id !== id)
    this.applyBitrates()
    this.updateCode()
  }

  // ---------------------------------------------------------------- encrypted signalling

  sendTo(to, obj) {
    const body = { ...obj, n: ++this.counter }
    const aad = aadFor(this.roomId, this.state.me.id, to)
    this.sendChain = this.sendChain
      .then(() => seal(this.aes, aad, body))
      .then((ct) => this.relay.send(to, ct))
      .catch((err) => this.debug('send', err))
  }

  broadcastState() {
    if (this.state.phase !== 'call') return
    this.sendTo('*', { t: 'state', mic: this.state.mic, cam: this.state.cam && !!this.camTrack, screen: this.state.screen })
  }

  sendStateTo(id) {
    this.sendTo(id, { t: 'state', mic: this.state.mic, cam: this.state.cam && !!this.camTrack, screen: this.state.screen })
  }

  async onSignal(m) {
    const s = this.state
    const to = m.to === '*' ? '*' : m.to
    if (to !== '*' && to !== s.me.id) {
      s.tamper++
      return
    }
    let msg
    try {
      msg = await unseal(this.aes, aadFor(this.roomId, m.from, to), m.ciphertext)
    } catch {
      // not made with this call's key for this sender → refused
      s.tamper++
      this.debug('dropped a message that failed to decrypt', m.seq)
      return
    }
    const last = this.lastN.get(m.from) || 0
    if (!(msg.n > last)) return // a repeat (a resent request, or replayed): already handled
    this.lastN.set(m.from, msg.n)
    let l = this.links.get(m.from)
    if (msg.t === 'offer' && msg.fresh && l && !l.initiator && l.pc.remoteDescription) {
      // the other side started over
      const view = l.view
      l.closePC()
      l.make()
      l.view = view
    }
    if (!l) {
      // not (yet) in our list — e.g. back after a blip
      if (msg.t !== 'offer') return
      const view = reactive({ id: m.from, name: 'Guest', isHost: false, conn: 'connecting', quality: '', mic: true, cam: true, screen: false, stream: null, speaking: false, framesDecoded: 0, relayed: false, rtt: null, away: false, tracks: 0 })
      l = new PeerLink(this, view)
      this.links.set(m.from, l)
      s.peers = [...s.peers, view]
    }
    switch (msg.t) {
      case 'offer':
        if (l.initiator) return // only the other side offers to us
        l.run(() => l.onOffer(msg))
        break
      case 'answer':
        l.run(() => l.onAnswer(msg))
        break
      case 'cand':
        l.run(() => l.onCandidates(msg.c))
        break
      case 'restart':
        if (l.initiator) l.restart('asked')
        break
      case 'rebuild':
        if (l.initiator) l.rebuild()
        break
      case 'state':
        l.view.mic = !!msg.mic
        l.view.cam = !!msg.cam
        l.view.screen = !!msg.screen
        break
    }
  }

  // ---------------------------------------------------------------- security code, stats

  async updateCode() {
    const s = this.state
    const links = [...this.links.values()].filter((l) => !l.closed)
    if (!links.length) {
      s.code = ''
      s.codeState = 'alone'
      return
    }
    if (!this.cert || !this.localFp) {
      s.code = ''
      s.codeState = 'unsupported'
      return
    }
    if (links.some((l) => l.view.conn !== 'connected' || !l.remoteFp)) {
      s.codeState = 'checking'
      return
    }
    const code = await securityCode(this.roomId, [this.localFp, ...links.map((l) => l.remoteFp)])
    if ([...this.links.values()].filter((l) => !l.closed).length === links.length) {
      s.code = code
      s.codeState = 'ready'
    }
  }

  async collectStats() {
    for (const l of this.links.values()) await l.stats()
    this.updateCode()
  }

  applyBitrates() {
    const n = [...this.links.values()].filter((l) => !l.closed).length
    let max = n <= 1 ? 1200000 : n <= 3 ? 600000 : 350000
    if (isPhone()) max = Math.round(max * 0.6)
    for (const l of this.links.values()) {
      const sender = l.videoTx?.sender
      if (!sender?.getParameters) continue
      try {
        const p = sender.getParameters()
        if (!p.encodings || !p.encodings.length) continue
        if (p.encodings[0].maxBitrate === max) continue
        p.encodings[0].maxBitrate = max
        sender.setParameters(p).catch(() => {})
      } catch {
        /* not negotiated yet */
      }
    }
  }

  /** Worst connection quality: good | fair | poor | connecting | ''. */
  get quality() {
    const ps = this.state.peers
    if (!ps.length) return ''
    if (ps.some((p) => p.conn !== 'connected')) return 'connecting'
    if (ps.some((p) => p.quality === 'poor')) return 'poor'
    if (ps.some((p) => p.quality === 'fair')) return 'fair'
    return 'good'
  }

  // ---------------------------------------------------------------- leave

  teardown() {
    this.closed = true
    this.relay.stop()
    for (const id of [...this.links.keys()]) this.dropLink(id)
    for (const t of this.timers) clearInterval(t)
    this.timers = []
    this.unlisten?.()
    this.stopMedia()
  }

  async leave() {
    await this.relay.leave()
    this.teardown()
    this.state.phase = 'left'
  }
}
