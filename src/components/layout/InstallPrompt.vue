<template>
  <!-- One-time install banner (phones, 2nd visit onwards) -->
  <transition name="ip-slide">
    <aside v-if="showBanner" class="ip-banner" role="region" aria-label="Install the app">
      <img src="/icon-192.png" alt="" class="ip-banner__icon" width="40" height="40" />
      <div class="ip-banner__text">
        <strong>Install DASYIN</strong>
        <span>Faster start-up, full screen and one tap from your home screen.</span>
      </div>
      <button class="ui-btn ui-btn--primary ui-btn--sm" type="button" @click="install">Install</button>
      <button class="ip-banner__close" type="button" aria-label="Not now" @click="dismissBanner"><i class="fa-solid fa-xmark"></i></button>
    </aside>
  </transition>

  <!-- iOS Safari: instructions sheet -->
  <teleport to="body">
    <div v-if="pwa.iosSheet" class="ui-modal-backdrop ip-sheet" @mousedown.self="pwa.iosSheet = false" @keydown.esc="pwa.iosSheet = false">
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ip-ios-title" style="max-width: 440px">
        <div class="ui-modal__head">
          <h2 id="ip-ios-title">Add DASYIN to your Home Screen</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" type="button" aria-label="Close" @click="pwa.iosSheet = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ip-app">
            <img src="/apple-touch-icon.png" alt="" width="52" height="52" />
            <div>
              <strong>DASYIN ERP</strong>
              <span>Opens full screen, like a native app.</span>
            </div>
          </div>
          <ol class="ip-steps">
            <li>
              <span class="ip-steps__n">1</span>
              <span>Tap <b>Share</b> <i class="fa-solid fa-arrow-up-from-bracket ip-glyph" aria-label="the Share icon"></i> in Safari’s toolbar{{ isIPad ? ' (top right)' : ' (bottom of the screen)' }}.</span>
            </li>
            <li>
              <span class="ip-steps__n">2</span>
              <span>Scroll down and tap <b>Add to Home Screen</b> <i class="fa-regular fa-square-plus ip-glyph" aria-hidden="true"></i>.</span>
            </li>
            <li>
              <span class="ip-steps__n">3</span>
              <span>Tap <b>Add</b>. DASYIN appears on your Home Screen.</span>
            </li>
          </ol>
          <p v-if="!pwa.isIOSSafari" class="ui-hint ip-note"><i class="fa-solid fa-circle-info"></i> Open this page in <b>Safari</b> to install it — other iOS browsers can’t add web apps to the Home Screen.</p>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn ui-btn--primary" type="button" @click="done">Got it</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { pwa, promptInstall, shouldShowBanner, dismissBanner } from '@/composables/usePwa'

export default {
  name: 'InstallPrompt',
  data() {
    return { pwa, ready: false }
  },
  computed: {
    showBanner() {
      // touch reactive deps
      void (pwa.installable, pwa.visits, pwa.bannerDismissed, pwa.standalone)
      return this.ready && !pwa.iosSheet && shouldShowBanner()
    },
    isIPad() {
      return /ipad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    }
  },
  mounted() {
    // Let the page settle before offering the install
    this.t = setTimeout(() => (this.ready = true), 2500)
  },
  beforeUnmount() {
    clearTimeout(this.t)
  },
  methods: {
    dismissBanner,
    install() {
      promptInstall()
    },
    done() {
      pwa.iosSheet = false
      dismissBanner()
    }
  }
}
</script>

<style scoped>
.ip-banner {
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  right: max(12px, env(safe-area-inset-right));
  bottom: calc(env(safe-area-inset-bottom) + var(--bottom-nav-h, 0px) + 12px);
  z-index: 1030;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 8px 12px 12px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
}

.ip-banner__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.ip-banner__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.ip-banner__text strong {
  font-size: 14px;
}

.ip-banner__text span {
  font-size: 12.5px;
  color: var(--text-3);
}

.ip-banner__close {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}

.ip-app {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  margin-bottom: 16px;
}

.ip-app img {
  border-radius: 12px;
}

.ip-app div {
  display: flex;
  flex-direction: column;
}

.ip-app span {
  color: var(--text-3);
  font-size: 13px;
}

.ip-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ip-steps li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  line-height: 1.45;
}

.ip-steps__n {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 13px;
}

.ip-glyph {
  color: var(--info);
  margin: 0 2px;
}

.ip-note {
  margin-top: 16px;
}

.ip-slide-enter-active,
.ip-slide-leave-active {
  transition: opacity 0.2s, transform 0.24s var(--ease);
}

.ip-slide-enter-from,
.ip-slide-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
