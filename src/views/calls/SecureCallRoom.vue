<template>
  <div class="sc" :class="[`sc--${screen}`, { 'is-narrow': narrow }]">
    <!-- ============ loading ============ -->
    <div v-if="screen === 'loading'" class="sc-center">
      <i class="fa-solid fa-circle-notch fa-spin sc-spin" aria-label="Loading"></i>
    </div>

    <!-- ============ messages (bad link, ended, removed …) ============ -->
    <div v-else-if="screen === 'message' || screen === 'after'" class="sc-center">
      <div class="sc-msg" data-testid="call-message-card">
        <div class="sc-msg__icon" :class="`tone-${shown.tone}`"><i :class="shown.icon"></i></div>
        <h1 data-testid="call-message">{{ shown.title }}</h1>
        <p>{{ shown.text }}</p>
        <div class="sc-msg__actions">
          <button v-if="shown.retry" class="ui-btn ui-btn--primary" @click="start"><i class="fa-solid fa-rotate"></i> Try again</button>
          <button v-if="shown.rejoin" class="ui-btn ui-btn--primary" data-testid="rejoin" @click="rejoin"><i class="fa-solid fa-right-to-bracket"></i> Join again</button>
          <router-link v-if="isHost || signedInUser" to="/secure-calls" class="ui-btn"><i class="fa-solid fa-arrow-left"></i> Secure calls</router-link>
        </div>
      </div>
      <p class="sc-foot"><i class="fa-solid fa-lock"></i> DASYIN secure calls · end-to-end encrypted</p>
    </div>

    <!-- ============ pre-join ============ -->
    <div v-else-if="screen === 'prejoin'" class="sc-pre">
      <header class="sc-pre__bar">
        <span class="sc-brand"><i class="fa-solid fa-user-shield"></i> Secure call</span>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme"><i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i></button>
      </header>
      <div class="sc-pre__grid">
        <section class="sc-pre__media">
          <div class="sc-preview" data-testid="sc-preview" :data-media="s.preview ? 'on' : 'off'">
            <CallTile :stream="s.localStream" :name="name" self :mirror="s.facing === 'user'" :mic="s.mic" :cam="s.cam" />
            <!-- nothing is opened before a tap: preview on request, or Join turns on what the toggles say -->
            <div v-if="!s.preview" class="sc-preview__off" data-testid="media-off">
              <span class="sc-preview__off-ic"><i class="fa-solid fa-video-slash"></i></span>
              <strong>Camera and microphone are off</strong>
              <span class="sc-preview__off-hint">Nothing turns on until you tap. Check them here first, or they turn on when you join.</span>
              <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-testid="media-on" :disabled="starting || joining" @click="turnOn">
                <i :class="starting ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-video'"></i> Turn on camera &amp; mic
              </button>
            </div>
            <div class="sc-preview__ctl">
              <button class="ctl" :class="{ 'is-off': !s.mic }" data-testid="pre-mic" :aria-label="s.mic ? 'Turn microphone off' : 'Turn microphone on'" :aria-pressed="!s.mic" :title="s.preview ? '' : s.mic ? 'You’ll join with your microphone on' : 'You’ll join muted'" @click="engine.toggleMic()">
                <i :class="s.mic ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash'"></i>
              </button>
              <button class="ctl" :class="{ 'is-off': !s.cam }" data-testid="pre-cam" :aria-label="s.cam ? 'Turn camera off' : 'Turn camera on'" :aria-pressed="!s.cam" :title="s.preview ? '' : s.cam ? 'You’ll join with your camera on' : 'You’ll join with your camera off'" @click="engine.toggleCam()">
                <i :class="s.cam ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'"></i>
              </button>
            </div>
          </div>
          <p v-if="!s.preview" class="ui-hint sc-gap" data-testid="join-with"><i class="fa-solid fa-circle-info"></i> {{ joinWith }}</p>
          <div v-if="s.mediaError" class="ui-alert ui-alert--warning sc-gap"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ s.mediaError }}</span></div>
        </section>

        <section class="sc-pre__side">
          <div class="ui-eyebrow">{{ isHost ? 'Your secure call' : 'You are invited' }}</div>
          <h1 class="sc-title" data-testid="call-title">{{ info.title || 'Secure call' }}</h1>
          <p class="sc-sub">
            <template v-if="isHost">You started this call. People with the full link can join.</template>
            <template v-else>{{ info.host_name || 'Someone' }} invited you to a private video call.</template>
          </p>
          <button class="sc-e2e" type="button" data-testid="e2e-badge-pre" @click="e2eOpen = true"><i class="fa-solid fa-lock"></i> End-to-end encrypted <i class="fa-solid fa-circle-info"></i></button>

          <form class="sc-join" @submit.prevent="join">
            <label class="ui-field">
              <span>Your name</span>
              <input v-model="name" class="ui-input" data-testid="join-name" maxlength="40" autocomplete="name" placeholder="How others will see you" required />
            </label>
            <div v-if="joinError" class="ui-alert ui-alert--danger" data-testid="join-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ joinError }}</span></div>
            <button class="ui-btn ui-btn--primary sc-join__btn" type="submit" data-testid="join-btn" :disabled="joining || !name.trim()">
              <i :class="joining ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-phone'"></i> {{ joining ? 'Joining…' : isHost ? 'Start the call' : 'Join call' }}
            </button>
            <p v-if="!isHost && info.lobby" class="ui-hint"><i class="fa-regular fa-hourglass-half"></i> The host lets people in, so you may wait a moment.</p>
            <p v-if="!isHost && info.locked" class="ui-hint"><i class="fa-solid fa-lock"></i> The host has locked this call.</p>
            <p v-if="info.participants" class="ui-hint">{{ info.participants }} {{ info.participants === 1 ? 'person is' : 'people are' }} in the call.</p>
          </form>

          <ul class="sc-points">
            <li><i class="fa-solid fa-key"></i><span>The secret part of this link never leaves your device — DASYIN can't open the call.</span></li>
            <li><i class="fa-solid fa-arrows-left-right"></i><span>Sound and video go straight between the people in the call, encrypted.</span></li>
            <li><i class="fa-solid fa-ban"></i><span>Nothing is recorded.</span></li>
          </ul>
        </section>
        <section class="sc-devices sc-pre__devices" aria-label="Devices">
          <label class="ui-field" v-if="s.devices.audioinput.length">
            <span>Microphone</span>
            <select class="ui-select" :value="s.audioId" data-testid="pick-mic" @change="engine.setDevice('audioinput', $event.target.value)">
              <option v-for="d in s.devices.audioinput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label class="ui-field" v-if="s.devices.videoinput.length">
            <span>Camera</span>
            <select class="ui-select" :value="s.videoId" data-testid="pick-cam" @change="engine.setDevice('videoinput', $event.target.value)">
              <option v-for="d in s.devices.videoinput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label class="ui-field" v-if="s.devices.audiooutput.length">
            <span>Speaker</span>
            <select class="ui-select" :value="s.outputId" @change="engine.setDevice('audiooutput', $event.target.value)">
              <option value="">Default speaker</option>
              <option v-for="d in s.devices.audiooutput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
        </section>
      </div>
    </div>

    <!-- ============ waiting in the lobby ============ -->
    <div v-else-if="screen === 'lobby'" class="sc-center">
      <div class="sc-msg sc-msg--wait" data-testid="lobby-wait">
        <div class="sc-wait__preview">
          <CallTile :stream="s.localStream" :name="name" self :mirror="s.facing === 'user'" :mic="s.mic" :cam="s.cam" small />
        </div>
        <h1>Waiting for {{ info.host_name || 'the host' }} to let you in…</h1>
        <p>The host can see that you're waiting. This page joins the call by itself as soon as they let you in.</p>
        <div class="sc-msg__actions">
          <button class="ui-btn" @click="leave"><i class="fa-solid fa-xmark"></i> Cancel</button>
        </div>
      </div>
      <p class="sc-foot"><i class="fa-solid fa-lock"></i> End-to-end encrypted</p>
    </div>

    <!-- ============ in the call ============ -->
    <div v-else-if="screen === 'call'" class="sc-call" :class="{ 'has-panel': panel }">
      <header class="sc-top">
        <div class="sc-top__title">
          <strong>{{ s.room.title || info.title || 'Secure call' }}</strong>
          <span class="sc-top__meta">
            <span v-if="s.room.locked" class="sc-chip" data-testid="locked-chip"><i class="fa-solid fa-lock"></i> Locked</span>
            <span class="sc-quality" :class="`q-${quality || 'none'}`" data-testid="call-quality" :data-quality="quality || 'none'">
              <span class="bars"><i></i><i></i><i></i></span>{{ qualityLabel }}
            </span>
          </span>
        </div>
        <div class="sc-top__right">
          <button class="sc-e2e sc-e2e--sm" type="button" data-testid="e2e-badge" @click="e2eOpen = true">
            <i class="fa-solid fa-lock"></i><span class="hide-xs">End-to-end encrypted</span><span class="show-xs">Encrypted</span>
          </button>
          <button v-if="s.tamper" class="sc-chip sc-chip--danger" data-testid="tamper-chip" :data-count="s.tamper" @click="e2eOpen = true">
            <i class="fa-solid fa-shield-halved"></i> {{ s.tamper }} blocked
          </button>
          <button v-if="isHost && s.lobby.length" class="sc-chip sc-chip--warn" data-testid="lobby-chip" @click="panel = true"><i class="fa-solid fa-door-open"></i> {{ s.lobby.length }} waiting</button>
          <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme"><i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i></button>
        </div>
      </header>

      <div class="sc-banners">
        <div v-if="s.relayState === 'reconnecting'" class="sc-banner sc-banner--warn" data-testid="relay-reconnecting"><i class="fa-solid fa-wifi"></i><span>Connection to DASYIN lost — reconnecting… Calls already connected keep going.</span></div>
        <div v-if="audioBlocked" class="sc-banner">
          <i class="fa-solid fa-volume-xmark"></i><span>Your browser paused the sound.</span>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-testid="audio-unlock" @click="unlockAudio"><i class="fa-solid fa-volume-high"></i> Turn on sound</button>
        </div>
        <div v-if="phone && s.peers.length + 1 > maxOnPhone" class="sc-banner sc-banner--warn" data-testid="phone-warning"><i class="fa-solid fa-mobile-screen"></i><span>Video with more than {{ maxOnPhone }} people can stutter on phones. Turn your camera off if it does.</span></div>
        <div v-if="endsSoon" class="sc-banner sc-banner--warn" data-testid="expiry-warning"><i class="fa-regular fa-clock"></i><span>This call ends at {{ endsAt }}, when its link expires.<template v-if="isHost"> Start a new secure call to keep talking.</template></span></div>
      </div>

      <main class="sc-stage" :class="`lay-${layout}`" :style="{ '--cols': cols, '--rows': rows }">
        <div class="sc-notices" aria-live="polite">
          <div v-for="n in notices" :key="n.id" class="sc-notice" :class="`is-${n.kind}`" data-testid="call-notice">
            <i :class="n.kind === 'warning' ? 'fa-solid fa-door-open' : n.kind === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'"></i>{{ n.text }}
          </div>
        </div>
        <template v-if="layout === 'solo'">
          <div class="sc-solo">
            <CallTile class="sc-solo__tile" :stream="s.localStream" :name="s.me.name" self :mirror="mirrorSelf" :mic="s.mic" :cam="s.cam" :host="isHost" :screen="s.screen" />
            <div class="sc-solo__note" data-testid="alone-note">
              <i class="fa-regular fa-clock"></i>
              <span>Waiting for others to join.<template v-if="isHost && key"> Share the link with the people you want on the call.</template></span>
              <button v-if="isHost && key" class="ui-btn ui-btn--sm" @click="copyLink"><i class="fa-regular fa-copy"></i> Copy link</button>
            </div>
          </div>
        </template>
        <template v-else>
          <CallTile
            v-for="p in bigTiles"
            :key="p.id"
            class="sc-tile"
            :stream="p.stream"
            :peer-id="p.id"
            :name="p.name"
            :mic="p.mic"
            :cam="p.cam"
            :screen="p.screen"
            :host="p.isHost"
            :conn="p.conn"
            :quality="p.quality"
            :speaking="p.speaking"
            :tracks="p.tracks"
            :muted="s.deafened"
            :sink-id="s.outputId"
            :unlock="unlockTick"
            @blocked="audioBlocked = true"
          />
          <CallTile v-if="layout === 'grid'" class="sc-tile" :stream="s.localStream" :name="s.me.name" self :mirror="mirrorSelf" :mic="s.mic" :cam="s.cam" :host="isHost" :screen="s.screen" />
          <div v-if="layout === 'strip'" class="sc-strip">
            <CallTile
              v-for="p in stripTiles"
              :key="p.id"
              class="sc-strip__tile"
              small
              :stream="p.stream"
              :peer-id="p.id"
              :name="p.name"
              :mic="p.mic"
              :cam="p.cam"
              :screen="p.screen"
              :host="p.isHost"
              :conn="p.conn"
              :quality="p.quality"
              :speaking="p.speaking"
              :tracks="p.tracks"
              :muted="s.deafened"
              :sink-id="s.outputId"
              :unlock="unlockTick"
              @blocked="audioBlocked = true"
            />
            <CallTile class="sc-strip__tile" small :stream="s.localStream" :name="s.me.name" self :mirror="mirrorSelf" :mic="s.mic" :cam="s.cam" :screen="s.screen" />
          </div>
          <CallTile v-if="layout === 'p1' || layout === 'p2'" class="sc-pip" small :stream="s.localStream" :name="s.me.name" self :mirror="mirrorSelf" :mic="s.mic" :cam="s.cam" :screen="s.screen" />
        </template>
      </main>

      <nav class="sc-controls" aria-label="Call controls">
        <button class="ctl" :class="{ 'is-off': !s.mic }" data-testid="ctl-mic" :aria-pressed="!s.mic" :aria-label="s.mic ? 'Mute' : 'Unmute'" :title="s.mic ? 'Mute' : 'Unmute'" @click="engine.toggleMic()">
          <i :class="s.mic ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash'"></i><span>{{ s.mic ? 'Mute' : 'Unmute' }}</span>
        </button>
        <button class="ctl" :class="{ 'is-off': !s.cam }" data-testid="ctl-cam" :aria-pressed="!s.cam" :aria-label="s.cam ? 'Turn camera off' : 'Turn camera on'" :title="s.cam ? 'Camera off' : 'Camera on'" @click="engine.toggleCam()">
          <i :class="s.cam ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'"></i><span>Camera</span>
        </button>
        <button v-if="phone && s.cam" class="ctl" data-testid="ctl-flip" aria-label="Switch camera" title="Switch camera" @click="engine.switchCamera()">
          <i class="fa-solid fa-camera-rotate"></i><span>Flip</span>
        </button>
        <button v-if="screenShare" class="ctl" :class="{ 'is-on': s.screen }" data-testid="ctl-screen" :aria-pressed="s.screen" :aria-label="s.screen ? 'Stop sharing' : 'Share your screen'" :title="s.screen ? 'Stop sharing' : 'Share screen'" @click="engine.shareScreen()">
          <i class="fa-solid fa-display"></i><span>{{ s.screen ? 'Stop' : 'Share' }}</span>
        </button>
        <button class="ctl" :class="{ 'is-off': s.deafened }" data-testid="ctl-speaker" :aria-pressed="s.deafened" :aria-label="s.deafened ? 'Turn sound on' : 'Turn sound off'" :title="s.deafened ? 'Sound on' : 'Sound off'" @click="s.deafened = !s.deafened">
          <i :class="s.deafened ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'"></i><span>Sound</span>
        </button>
        <button class="ctl" :class="{ 'is-on': panel }" data-testid="ctl-people" aria-label="People" title="People" @click="panel = !panel">
          <i class="fa-solid fa-user-group"></i><span>{{ s.peers.length + 1 }}</span>
          <em v-if="isHost && s.lobby.length" class="ctl__dot">{{ s.lobby.length }}</em>
        </button>
        <button class="ctl" data-testid="ctl-settings" aria-label="Devices" title="Devices" @click="openSettings">
          <i class="fa-solid fa-sliders"></i><span>Devices</span>
        </button>
        <button class="ctl ctl--leave" data-testid="ctl-leave" aria-label="Leave the call" title="Leave" @click="leave">
          <i class="fa-solid fa-phone-slash"></i><span>Leave</span>
        </button>
      </nav>

      <aside v-if="panel" class="sc-panel" data-testid="people-panel" aria-label="People">
        <div class="sc-panel__head">
          <h2>People</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="panel = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sc-panel__body">
          <template v-if="isHost">
            <section v-if="s.lobby.length" class="sc-sec" data-testid="lobby-list">
              <h3>Waiting to join</h3>
              <div v-for="w in s.lobby" :key="w.id" class="sc-person" :data-lobby="w.id">
                <span class="sc-av">{{ initials(w.name) }}</span>
                <span class="sc-person__name">{{ w.name }}</span>
                <span class="sc-person__act">
                  <button class="ui-btn ui-btn--sm ui-btn--success" data-act="admit" :disabled="busy[w.id]" @click="host('admit', w)"><i class="fa-solid fa-check"></i> Let in</button>
                  <button class="ui-btn ui-btn--sm ui-btn--ghost" data-act="deny" :disabled="busy[w.id]" @click="host('deny', w)">Deny</button>
                </span>
              </div>
            </section>
            <section class="sc-sec sc-host">
              <label class="ui-switch">
                <input type="checkbox" data-testid="host-lobby" :checked="s.room.lobby" :disabled="busy.lobby" @change="setLobby($event.target.checked)" />
                <span>Ask me before people join</span>
              </label>
              <label class="ui-switch">
                <input type="checkbox" data-testid="host-lock" :checked="s.room.locked" :disabled="busy.lock" @change="setLock($event.target.checked)" />
                <span>Lock the call (nobody new can join)</span>
              </label>
              <div class="sc-host__btns">
                <button v-if="key" class="ui-btn ui-btn--sm" data-testid="host-copy" @click="copyLink"><i class="fa-regular fa-copy"></i> Copy link</button>
                <button class="ui-btn ui-btn--sm ui-btn--danger" data-testid="host-end" :disabled="busy.end" @click="endForAll"><i class="fa-solid fa-phone-slash"></i> End for all</button>
              </div>
            </section>
          </template>
          <section class="sc-sec">
            <h3>In the call ({{ s.peers.length + 1 }})</h3>
            <div class="sc-person">
              <span class="sc-av">{{ initials(s.me.name) }}</span>
              <span class="sc-person__name">{{ s.me.name }} <small>(you)</small> <span v-if="isHost" class="ui-badge ui-badge--info">Host</span></span>
              <i v-if="!s.mic" class="fa-solid fa-microphone-slash sc-muted"></i>
            </div>
            <div v-for="p in s.peers" :key="p.id" class="sc-person" :data-person="p.id">
              <span class="sc-av">{{ initials(p.name) }}</span>
              <span class="sc-person__name">
                {{ p.name }} <span v-if="p.isHost" class="ui-badge ui-badge--info">Host</span>
                <small class="sc-person__state">{{ connLabel(p) }}</small>
              </span>
              <i v-if="!p.mic" class="fa-solid fa-microphone-slash sc-muted"></i>
              <button v-if="isHost && !p.isHost" class="ui-btn ui-btn--sm ui-btn--ghost" :data-remove="p.id" :disabled="busy[p.id]" @click="host('remove', p)">Remove</button>
            </div>
          </section>
          <p class="ui-hint sc-panel__note"><i class="fa-solid fa-circle-info"></i> Up to {{ s.room.max_participants || 6 }} people. Everyone connects to everyone, so each extra person uses more data.</p>
        </div>
      </aside>
    </div>

    <!-- ============ end-to-end encryption explained ============ -->
    <div v-if="e2eOpen" class="ui-modal-backdrop" @mousedown.self="e2eOpen = false">
      <div class="ui-modal sc-e2e-modal" role="dialog" aria-labelledby="e2e-title" data-testid="e2e-modal">
        <div class="ui-modal__head">
          <h2 id="e2e-title"><i class="fa-solid fa-lock"></i> End-to-end encrypted</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="e2eOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p>Only the people in this call can see and hear it.</p>
          <ul class="sc-points">
            <li><i class="fa-solid fa-key"></i><span>The part of the link after <code>#</code> is the call's secret key. Browsers never send it to a server, so DASYIN never has it. Anyone with the <strong>full link</strong> can join — share it only with the people you want.</span></li>
            <li><i class="fa-solid fa-envelope-circle-check"></i><span>The messages that set up the call are locked with that key on your device. DASYIN only passes them on and can't read or change them.</span></li>
            <li><i class="fa-solid fa-arrows-left-right"></i><span>Sound and video travel directly between your devices, encrypted (DTLS-SRTP).<template v-if="s.turn"> If a direct path isn't possible they go through a relay server, which only forwards the encrypted data.</template></span></li>
            <li><i class="fa-solid fa-ban"></i><span>Nothing is recorded. DASYIN keeps only the call's title, times and the names of who joined (for the host), and removes them 7 days after the call.</span></li>
          </ul>
          <div v-if="screen === 'call'" class="sc-code" data-testid="code-box" :data-state="s.codeState">
            <div class="sc-code__label">Security code</div>
            <div v-if="s.codeState === 'ready'" class="sc-code__value" data-testid="security-code">{{ s.code }}</div>
            <div v-else class="sc-code__wait">{{ codeWait }}</div>
            <p v-if="s.codeState === 'ready'">Read this code out to each other. If everyone sees the same code, the call is connected directly between you and nobody is listening in the middle. It changes when someone joins or leaves.</p>
          </div>
          <div v-if="s.tamper" class="ui-alert ui-alert--warning" data-testid="tamper-info" :data-count="s.tamper">
            <i class="fa-solid fa-shield-halved"></i>
            <span>{{ s.tamper }} {{ s.tamper === 1 ? 'message was' : 'messages were' }} blocked because {{ s.tamper === 1 ? 'it was' : 'they were' }} not made with this call's key — someone without the full link tried to interfere. Your call is not affected.</span>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn ui-btn--primary" @click="e2eOpen = false">Got it</button>
        </div>
      </div>
    </div>

    <!-- ============ devices ============ -->
    <div v-if="settingsOpen" class="ui-modal-backdrop" @mousedown.self="settingsOpen = false">
      <div class="ui-modal" role="dialog" aria-labelledby="dev-title" style="max-width: 460px">
        <div class="ui-modal__head">
          <h2 id="dev-title">Devices</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="settingsOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body sc-devices sc-devices--modal">
          <label class="ui-field">
            <span>Microphone</span>
            <select class="ui-select" :value="s.audioId" @change="engine.setDevice('audioinput', $event.target.value)">
              <option v-if="!s.devices.audioinput.length" value="">No microphone found</option>
              <option v-for="d in s.devices.audioinput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span>Camera</span>
            <select class="ui-select" :value="s.videoId" @change="engine.setDevice('videoinput', $event.target.value)">
              <option v-if="!s.devices.videoinput.length" value="">No camera found</option>
              <option v-for="d in s.devices.videoinput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label v-if="s.devices.audiooutput.length" class="ui-field">
            <span>Speaker</span>
            <select class="ui-select" :value="s.outputId" @change="engine.setDevice('audiooutput', $event.target.value)">
              <option value="">Default speaker</option>
              <option v-for="d in s.devices.audiooutput" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <p v-else class="ui-hint">This browser plays the call through its usual speaker. On phones, use the phone's volume or speaker button.</p>
          <div v-if="s.mediaError" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ s.mediaError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn ui-btn--primary" @click="settingsOpen = false">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CallTile from '@/components/calls/CallTile.vue'
import { SecureCallEngine, isPhone, canShareScreen, MAX_ON_PHONE } from '@/services/secureCallEngine'
import { keyFromHash, validRoomId, tabKey, recallKey, unsupportedReason, hostRequest, signedIn, callLink } from '@/services/secureCall'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { useTheme } from '@/composables/useTheme'
import { whenHiddenFor, HIDDEN_STOP_MS } from '@/services/mediaGuard'

const NAME_KEY = 'seccall.name'

const MESSAGES = {
  unsupported: { icon: 'fa-solid fa-triangle-exclamation', tone: 'warn', title: "This browser can't join secure calls" },
  invalid: { icon: 'fa-solid fa-link-slash', tone: 'danger', title: "This call link isn't valid", text: 'It may have been typed or copied wrongly. Ask the person who invited you to send it again.' },
  incomplete: {
    icon: 'fa-solid fa-link-slash',
    tone: 'danger',
    title: 'This link is incomplete — ask for the full link',
    text: "Secure call links end with a long code after the # sign. That code is the key that encrypts the call, so it never reaches DASYIN — without it the call can't be opened. Ask the person who invited you to send the whole link again."
  },
  wrong: {
    icon: 'fa-solid fa-link-slash',
    tone: 'danger',
    title: 'This link is incomplete — ask for the full link',
    text: "The code at the end of this link doesn't match the call — part of it is missing or was changed. Ask the person who invited you to send the whole link again."
  },
  notfound: { icon: 'fa-solid fa-link-slash', tone: 'danger', title: "This call link isn't valid", text: 'The call may have been removed, or the link was copied wrongly.' },
  ended: { icon: 'fa-solid fa-phone-slash', tone: 'muted', title: 'This call has ended', text: 'The host ended it or the link expired. Ask them for a new link if you still need to talk.' },
  network: { icon: 'fa-solid fa-wifi', tone: 'warn', title: "Can't reach DASYIN", text: 'Check your internet connection and try again.', retry: true },
  removed: { icon: 'fa-solid fa-user-xmark', tone: 'danger', title: 'You were removed from the call', text: 'The host removed you from this call.' },
  denied: { icon: 'fa-solid fa-door-closed', tone: 'muted', title: "The host didn't let you in", text: 'Ask the host if you think this was a mistake.' },
  left: { icon: 'fa-solid fa-right-from-bracket', tone: 'muted', title: 'You left the call', text: 'You can join again while the call is still on.', rejoin: true },
  error: { icon: 'fa-solid fa-triangle-exclamation', tone: 'warn', title: "The call couldn't continue", retry: false, rejoin: true }
}

export default {
  name: 'SecureCallRoom',
  components: { CallTile },
  props: { roomId: { type: String, required: true } },
  setup() {
    const { isDark, toggleTheme } = useTheme()
    return { isDark, toggleTheme }
  },
  data() {
    return {
      boot: 'loading',
      message: null,
      engine: null,
      s: null,
      key: '',
      info: {},
      isHost: false,
      appUrl: '',
      signedInUser: false,
      name: '',
      joining: false,
      starting: false,
      joinError: '',
      panel: false,
      e2eOpen: false,
      settingsOpen: false,
      audioBlocked: false,
      unlockTick: 0,
      phone: isPhone(),
      narrow: typeof window !== 'undefined' && window.innerWidth < 700,
      screenShare: canShareScreen(),
      maxOnPhone: MAX_ON_PHONE,
      busy: {},
      notices: [],
      noticeId: 0,
      now: Date.now()
    }
  },
  computed: {
    screen() {
      if (this.boot !== 'ready') return this.boot
      const p = this.s.phase
      if (p === 'setup' || p === 'joining') return 'prejoin'
      if (p === 'lobby') return 'lobby'
      if (p === 'call') return 'call'
      return 'after'
    },
    shown() {
      if (this.boot === 'message') return this.message || MESSAGES.error
      const p = this.s?.phase
      const m = MESSAGES[p] || MESSAGES.error
      return { ...m, text: m.text || this.s?.error || '' }
    },
    mirrorSelf() {
      return this.s.facing === 'user' && !this.s.screen
    },
    ordered() {
      // people sharing their screen first, then in the order they joined
      return [...this.s.peers].sort((a, b) => (b.screen ? 1 : 0) - (a.screen ? 1 : 0))
    },
    layout() {
      const n = this.s.peers.length
      if (n === 0) return 'solo'
      if (!this.narrow) return 'grid'
      if (n === 1) return 'p1'
      if (n === 2) return 'p2'
      return 'strip'
    },
    cols() {
      const n = this.s.peers.length + 1
      if (this.narrow) return 1
      return n <= 1 ? 1 : n <= 4 ? 2 : 3
    },
    rows() {
      return Math.max(1, Math.ceil((this.s.peers.length + 1) / this.cols))
    },
    bigTiles() {
      return this.layout === 'strip' ? this.ordered.slice(0, 2) : this.ordered
    },
    stripTiles() {
      return this.ordered.slice(2)
    },
    quality() {
      void this.s.peers.map((p) => p.conn + p.quality)
      return this.engine ? this.engine.quality : ''
    },
    qualityLabel() {
      return { good: 'Good', fair: 'Fair', poor: 'Poor', connecting: 'Connecting…' }[this.quality] || 'Ready'
    },
    endsSoon() {
      const t = Date.parse(this.s?.room?.expires_at || '')
      return !!t && t - this.now < 5 * 60 * 1000 && t > this.now
    },
    endsAt() {
      const t = Date.parse(this.s?.room?.expires_at || '')
      return t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    },
    joinWith() {
      const { mic, cam } = this.s
      if (cam && mic) return 'You’ll join with your camera and microphone on — tap them to switch either off first.'
      if (mic) return 'You’ll join with your microphone on and your camera off.'
      if (cam) return 'You’ll join with your camera on and your microphone off.'
      return 'You’ll join with your camera and microphone off — you can still see and hear the others.'
    },
    codeWait() {
      return { alone: 'The code appears when someone else joins.', checking: 'Checking the connections…', unsupported: "This browser can't show a security code." }[this.s.codeState] || ''
    }
  },
  watch: {
    // the link was opened again in this tab with a different key (pasted into the address bar)
    '$route.hash'(h) {
      const k = keyFromHash(h)
      if (!k) return
      if (this.s && ['call', 'lobby', 'joining'].includes(this.s.phase)) return
      if (k === this.key) {
        // the same link opened again: see whether the call is still on
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
        this.recheck()
        return
      }
      this.boot = 'loading'
      this.engine?.close()
      this.engine = null
      this.s = null
      this.key = ''
      this.info = {}
      this.joinError = ''
      this.start()
    },
    'screen'(v, old) {
      if (v === 'call' && old !== 'call') this.panel = !this.narrow && this.isHost && !!this.s.lobby.length
    },
    's.lobby.length'(n, old) {
      if (n > (old || 0) && this.isHost && this.screen === 'call') this.panel = true
    }
  },
  created() {
    this.start()
  },
  mounted() {
    window.addEventListener('resize', this.onResize, { passive: true })
    window.addEventListener('focus', this.recheck)
    // the join screen left in a hidden tab for a long time: camera and microphone off
    this.unwatchHidden = whenHiddenFor(HIDDEN_STOP_MS, this.onLongHidden)
    // while someone sits on the join screen, notice when the call ends or gets locked
    this.recheckTimer = setInterval(() => {
      this.now = Date.now()
      this.recheck()
    }, 20000)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('focus', this.recheck)
    clearInterval(this.recheckTimer)
    this.unwatchHidden?.()
    if (this.engine && ['call', 'lobby'].includes(this.s?.phase)) {
      this.engine.relay.beaconLeave()
      this.engine.teardown()
    } else if (this.engine) {
      this.engine.close()
    }
  },
  methods: {
    onResize() {
      this.narrow = window.innerWidth < 700
    },
    show(kind, extra = {}) {
      this.message = { ...MESSAGES[kind], ...extra }
      this.boot = 'message'
      if (this.engine) this.engine.stopMedia()
    },
    readKey() {
      const hash = window.location.hash
      let key = keyFromHash(hash)
      if (hash && hash.length > 1 && !key) return { key: '', bad: true }
      if (!key) key = tabKey(this.roomId) || recallKey(this.roomId)
      if (key) {
        tabKey(this.roomId, key) // a reload of this tab still works (forgotten again if the server says the key is wrong)
        if (window.location.hash) {
          // keep the key out of the address bar, history and screenshots (a reload still works: it's kept for this tab)
          try {
            window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
          } catch {
            /* ignore */
          }
        }
      }
      return { key, bad: false }
    },
    async start() {
      this.boot = 'loading'
      this.signedInUser = signedIn()
      const why = unsupportedReason()
      if (why) return this.show('unsupported', { text: why })
      if (!validRoomId(this.roomId)) return this.show('invalid')
      const { key, bad } = this.key ? { key: this.key, bad: false } : this.readKey()
      if (!key || bad) return this.show('incomplete')
      this.key = key
      if (!this.engine) {
        this.engine = new SecureCallEngine(this.roomId, key)
        this.engine.onNotice = (text, kind) => this.notify(text, kind)
        this.s = this.engine.state
      }
      try {
        this.info = (await this.engine.preview()) || {}
      } catch (e) {
        if (e.code === 'WRONG_LINK') {
          tabKey(this.roomId, '-')
          return this.show('wrong')
        }
        if (e.code === 'CALL_ENDED') return this.show('ended')
        if (e.code === 'NOT_FOUND') return this.show('notfound')
        if (e.code === 'RATE_LIMITED') return this.show('network', { title: 'Too many attempts', text: e.message })
        return this.show('network')
      }
      if (this.signedInUser) {
        try {
          const d = await hostRequest('GET', `/secure-calls/${this.roomId}`)
          if (d?.call) {
            this.isHost = true
            this.appUrl = d.app_url || ''
          }
        } catch {
          this.isHost = false
        }
      }
      this.name = this.defaultName()
      this.boot = 'ready'
      // No camera or microphone yet: only "Turn on camera & mic", a toggle or Join opens them.
    },
    /** "Turn on camera & mic" on the join screen: both on, preview starts. */
    async turnOn() {
      if (!this.engine || this.starting) return
      this.starting = true
      try {
        await this.engine.startMedia({ both: true })
      } finally {
        this.starting = false
      }
    },
    onLongHidden() {
      if (this.boot !== 'ready' || this.screen !== 'prejoin' || this.joining || !this.s?.preview) return
      this.engine.stopMedia()
      toast.info('Your camera and microphone were turned off while this page was in the background.')
    },
    /** Short in-call notices (who joined / left …) above the video, not over the controls. */
    notify(text, kind = 'info') {
      const id = ++this.noticeId
      this.notices = [...this.notices.slice(-2), { id, text, kind }]
      setTimeout(() => (this.notices = this.notices.filter((n) => n.id !== id)), kind === 'warning' ? 6000 : 3500)
    },
    async recheck() {
      if (this.boot !== 'ready' || this.screen !== 'prejoin' || this.joining || !this.engine) return
      try {
        this.info = (await this.engine.preview()) || this.info
      } catch (e) {
        if (e.code === 'CALL_ENDED') this.show('ended')
        else if (e.code === 'NOT_FOUND') this.show('notfound')
        else if (e.code === 'WRONG_LINK') this.show('wrong')
      }
    },
    defaultName() {
      try {
        const saved = localStorage.getItem(NAME_KEY)
        if (saved) return saved
        if (this.isHost) {
          const u = JSON.parse(localStorage.getItem('current_user') || 'null')
          return [u?.first_name, u?.last_name].filter(Boolean).join(' ') || ''
        }
      } catch {
        /* ignore */
      }
      return ''
    },
    async join() {
      const name = this.name.trim()
      if (!name) return
      this.joining = true
      this.joinError = ''
      try {
        localStorage.setItem(NAME_KEY, name)
      } catch {
        /* ignore */
      }
      try {
        await this.engine.join(name, { asHost: this.isHost })
      } catch (e) {
        if (e.code === 'WRONG_LINK') return this.show('wrong')
        if (e.code === 'CALL_ENDED') return this.show('ended')
        if (e.code === 'NOT_FOUND') return this.show('notfound')
        this.joinError = e.message || 'Could not join the call.'
      } finally {
        this.joining = false
      }
    },
    async leave() {
      await this.engine.leave()
    },
    rejoin() {
      window.location.reload()
    },
    unlockAudio() {
      this.audioBlocked = false
      this.unlockTick++
    },
    openSettings() {
      this.engine.listDevices()
      this.settingsOpen = true
    },
    initials(n) {
      const p = String(n || '?').trim().split(/\s+/)
      return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
    },
    connLabel(p) {
      if (p.away) return 'Lost connection…'
      return { connected: p.relayed ? 'Connected via relay' : 'Connected', reconnecting: 'Reconnecting…', failed: 'Trying again…', closed: 'Left' }[p.conn] || 'Connecting…'
    },
    async copyLink() {
      const link = callLink(this.appUrl, this.roomId, this.key)
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = link
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
        } catch {
          /* ignore */
        }
        ta.remove()
      }
      this.notify('Link copied — send it only to the people you want on the call', 'success')
    },
    async host(action, p) {
      this.busy = { ...this.busy, [p.id]: true }
      try {
        await hostRequest('POST', `/secure-calls/${this.roomId}/participants/${p.id}/${action}`)
      } catch (e) {
        toast.error(e.message || 'That did not work')
      } finally {
        this.busy = { ...this.busy, [p.id]: false }
      }
    },
    async setLock(on) {
      this.busy = { ...this.busy, lock: true }
      try {
        await hostRequest('POST', `/secure-calls/${this.roomId}/${on ? 'lock' : 'unlock'}`)
        this.s.room = { ...this.s.room, locked: on }
      } catch (e) {
        toast.error(e.message || 'Could not change the lock')
      } finally {
        this.busy = { ...this.busy, lock: false }
      }
    },
    async setLobby(on) {
      this.busy = { ...this.busy, lobby: true }
      try {
        await hostRequest('PATCH', `/secure-calls/${this.roomId}`, { lobby: on })
        this.s.room = { ...this.s.room, lobby: on }
      } catch (e) {
        toast.error(e.message || 'Could not change the setting')
      } finally {
        this.busy = { ...this.busy, lobby: false }
      }
    },
    async endForAll() {
      const ok = await confirmDialog({ title: 'End the call for everyone?', message: 'Everyone is disconnected and the link stops working.', confirmText: 'End for all', danger: true })
      if (!ok) return
      this.busy = { ...this.busy, end: true }
      try {
        await hostRequest('POST', `/secure-calls/${this.roomId}/end`)
        this.engine.teardown()
        this.s.phase = 'ended'
      } catch (e) {
        toast.error(e.message || 'Could not end the call')
      } finally {
        this.busy = { ...this.busy, end: false }
      }
    }
  }
}
</script>

<style scoped>
.sc {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
}
.sc-center {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  gap: 18px;
}
.sc-spin {
  font-size: 28px;
  color: var(--text-3);
}
.sc-msg {
  width: 100%;
  max-width: 520px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 32px 28px;
  text-align: center;
}
.sc-msg h1 {
  font-size: 21px;
  margin: 14px 0 8px;
  line-height: 1.3;
}
.sc-msg p {
  color: var(--text-2);
  margin: 0;
  line-height: 1.55;
}
.sc-msg__icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 24px;
  background: var(--neutral-soft, var(--bg-subtle));
  color: var(--text-2);
}
.tone-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.tone-warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.sc-msg__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 22px;
}
.sc-msg--wait .sc-wait__preview {
  width: 200px;
  aspect-ratio: 4 / 3;
  margin: 0 auto 6px;
  display: grid;
}
.sc-foot {
  color: var(--text-3);
  font-size: 12.5px;
  margin: 0;
}

/* ---------------- pre-join ---------------- */
.sc-pre {
  max-width: 1080px;
  margin: 0 auto;
  padding: 16px 16px 32px;
}
.sc-pre__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.sc-brand {
  font-weight: 700;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.sc-brand i {
  color: var(--accent);
}
.sc-pre__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-areas: 'media side' 'devices side';
  column-gap: 28px;
  row-gap: 0;
  align-items: start;
}
.sc-pre__media {
  grid-area: media;
}
.sc-pre__side {
  grid-area: side;
}
.sc-pre__devices {
  grid-area: devices;
}
.sc-preview {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid;
}
.sc-preview__off {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 16px 76px;
  text-align: center;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.sc-preview__off strong {
  font-size: 15.5px;
}
.sc-preview__off-ic {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-3);
  font-size: 18px;
}
.sc-preview__off-hint {
  color: var(--text-2);
  font-size: 13px;
  max-width: 340px;
  line-height: 1.45;
}
.sc-preview__ctl {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 3;
}
.sc-gap {
  margin-top: 12px;
}
.sc-devices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.sc-devices--modal {
  grid-template-columns: 1fr;
  margin-top: 0;
}
.sc-pre__side {
  padding-top: 6px;
}
.sc-title {
  font-size: 26px;
  margin: 4px 0 6px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.sc-sub {
  color: var(--text-2);
  margin: 0 0 12px;
}
.sc-e2e {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
  background: var(--success-soft);
  color: var(--success);
  font-weight: 600;
  font-size: 13.5px;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
}
.sc-e2e--sm {
  font-size: 12.5px;
  padding: 5px 10px;
}
.sc-join {
  margin: 22px 0 18px;
  display: grid;
  gap: 12px;
}
.sc-join__btn {
  justify-content: center;
  padding: 12px 18px;
  font-size: 15.5px;
}
.sc-join .ui-hint {
  margin: 0;
}
.sc-points {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
  color: var(--text-2);
  font-size: 13.5px;
}
.sc-points li {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 8px;
  line-height: 1.5;
}
.sc-points i {
  color: var(--accent);
  padding-top: 3px;
}
.sc-points code {
  background: var(--bg-subtle);
  padding: 0 5px;
  border-radius: 4px;
}

/* ---------------- controls (shared) ---------------- */
.ctl {
  position: relative;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 999px;
  height: 48px;
  min-width: 48px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
}
.ctl:hover {
  background: var(--surface-hover);
}
.ctl i {
  font-size: 16px;
}
.ctl.is-off {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}
.ctl.is-on {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}
.ctl--leave {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}
.ctl--leave:hover {
  background: var(--danger);
  filter: brightness(1.08);
}
.ctl__dot {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--warning);
  color: #fff;
  font-style: normal;
  font-size: 11px;
  display: grid;
  place-items: center;
  padding: 0 5px;
}
.sc-preview__ctl .ctl {
  padding: 0;
  width: 52px;
  height: 52px;
}

/* ---------------- in call ---------------- */
.sc-call {
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  grid-template-areas: 'top' 'ban' 'stage' 'ctl';
  overflow: hidden;
}
.sc-call.has-panel {
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-template-areas: 'top top' 'ban panel' 'stage panel' 'ctl panel';
}
.sc-banners {
  grid-area: ban;
  min-width: 0;
}
.sc-top {
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.sc-top__title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sc-top__title strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sc-top__meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--text-3);
}
.sc-top__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.sc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-subtle);
  color: var(--text-2);
  border: 1px solid var(--border);
  cursor: default;
}
button.sc-chip {
  cursor: pointer;
}
.sc-chip--danger {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: transparent;
}
.sc-chip--warn {
  background: var(--warning-soft);
  color: var(--warning);
  border-color: transparent;
}
.sc-quality {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sc-quality .bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 11px;
}
.sc-quality .bars i {
  width: 3px;
  background: var(--border-strong);
  border-radius: 1px;
}
.sc-quality .bars i:nth-child(1) {
  height: 4px;
}
.sc-quality .bars i:nth-child(2) {
  height: 7px;
}
.sc-quality .bars i:nth-child(3) {
  height: 11px;
}
.q-good .bars i {
  background: var(--success);
}
.q-fair .bars i:nth-child(-n + 2) {
  background: var(--warning);
}
.q-poor .bars i:nth-child(1) {
  background: var(--danger);
}
.sc-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 16px;
  font-size: 13px;
  background: var(--info-soft);
  color: var(--text);
  border-bottom: 1px solid var(--border);
}
.sc-banner--warn {
  background: var(--warning-soft);
}
.sc-banner > span {
  flex: 1 1 200px;
  min-width: 0;
}
.sc-banner > i {
  flex: none;
}
.sc-stage {
  grid-area: stage;
  position: relative;
  padding: 12px;
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}
.lay-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
}
.lay-grid > .sc-tile {
  flex: 0 0 calc((100% - (var(--cols) - 1) * 10px) / var(--cols));
  height: calc((100% - (var(--rows) - 1) * 10px) / var(--rows));
}
.sc-notices {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  display: grid;
  gap: 6px;
  justify-items: center;
  pointer-events: none;
  width: max-content;
  max-width: calc(100% - 32px);
}
.sc-notice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  animation: sc-in 0.2s var(--ease, ease);
}
.sc-notice i {
  color: var(--info);
}
.sc-notice.is-warning i {
  color: var(--warning);
}
.sc-notice.is-success i {
  color: var(--success);
}
@keyframes sc-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
.lay-p1 {
  grid-template-rows: minmax(0, 1fr);
}
.lay-p2 {
  grid-template-rows: repeat(2, minmax(0, 1fr));
}
.lay-strip {
  grid-template-rows: repeat(2, minmax(0, 1fr)) 104px;
}
.sc-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  min-height: 0;
}
.sc-strip__tile {
  flex: 0 0 120px;
  height: 100%;
}
.sc-pip {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 104px;
  height: 140px;
  z-index: 5;
  box-shadow: var(--shadow-lg);
}
.sc-solo {
  position: relative;
  display: grid;
  min-height: 0;
  height: 100%;
}
.sc-solo__tile {
  height: 100%;
}
.sc-solo__note {
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 10px 14px;
  font-size: 13.5px;
  width: max-content;
  max-width: calc(100% - 32px);
}
.sc-controls {
  grid-area: ctl;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.sc-panel {
  grid-area: panel;
  border-left: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sc-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.sc-panel__head h2 {
  font-size: 16px;
  margin: 0;
}
.sc-panel__body {
  overflow-y: auto;
  padding: 8px 16px 16px;
}
.sc-sec {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.sc-sec:last-of-type {
  border-bottom: 0;
}
.sc-sec h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  margin: 4px 0 8px;
}
.sc-host {
  display: grid;
  gap: 10px;
}
.sc-host__btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sc-person {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}
.sc-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex: none;
}
.sc-person__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.sc-person__name small {
  color: var(--text-3);
}
.sc-person__state {
  display: block;
  font-size: 12px;
}
.sc-person__act {
  display: flex;
  gap: 6px;
}
.sc-muted {
  color: var(--danger);
}
.sc-panel__note {
  margin-top: 10px;
}

/* ---------------- code ---------------- */
.sc-code {
  margin: 18px 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--bg-subtle);
  text-align: center;
}
.sc-code__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.sc-code__value {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin: 6px 0;
  font-variant-numeric: tabular-nums;
}
.sc-code__wait {
  margin: 8px 0;
  color: var(--text-2);
}
.sc-code p {
  font-size: 13px;
  color: var(--text-2);
  margin: 0;
}
.sc-e2e-modal .ui-modal__head h2 i {
  color: var(--success);
  margin-right: 6px;
}
.sc-e2e-modal .ui-modal__body > p {
  margin-top: 0;
}
.show-xs {
  display: none;
}

/* ---------------- phones ---------------- */
@media (max-width: 860px) {
  .sc-pre__grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'media' 'side' 'devices';
    row-gap: 18px;
  }
  .sc-pre__devices {
    margin-top: 0;
  }
  .sc-title {
    font-size: 22px;
  }
}
@media (max-width: 420px) {
  .sc-preview__off {
    gap: 6px;
    padding-bottom: 70px;
  }
  .sc-preview__off-ic {
    display: none;
  }
}
@media (max-width: 700px) {
  .sc-call.has-panel {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'top' 'ban' 'stage' 'ctl';
  }
  .sc-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 72vh;
    border-left: 0;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-lg);
    z-index: 30;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .sc-stage {
    padding: 8px;
    gap: 8px;
  }
  .sc-controls {
    gap: 6px;
    flex-wrap: nowrap;
    justify-content: space-between;
    padding-left: 8px;
    padding-right: 8px;
  }
  .ctl {
    flex: 1 1 0;
    min-width: 0;
    padding: 0;
    height: 52px;
    flex-direction: column;
    gap: 2px;
    border-radius: var(--radius);
    font-size: 10.5px;
  }
  .ctl span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .sc-top {
    padding: 8px 10px;
  }
  .hide-xs {
    display: none;
  }
  .show-xs {
    display: inline;
  }
  .sc-pip {
    right: 14px;
    bottom: 14px;
    width: 92px;
    height: 124px;
  }
  .sc-msg {
    padding: 26px 18px;
  }
}
</style>
