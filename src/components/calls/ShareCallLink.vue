<template>
  <div class="share" data-testid="share-panel">
    <label class="share__label" for="call-link">Call link</label>
    <div class="share__linkrow">
      <input id="call-link" ref="input" class="ui-input share__link" :value="link" readonly data-testid="call-link" @focus="$event.target.select()" />
      <button class="ui-btn ui-btn--primary share__copy" type="button" data-testid="copy-link" @click="copy">
        <i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i> {{ copied ? 'Copied' : 'Copy link' }}
      </button>
    </div>

    <div class="share__via">
      <a class="ui-btn share__btn" :href="whatsapp" target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
      <a class="ui-btn share__btn" :href="sms" data-testid="share-sms"><i class="fa-solid fa-comment-sms"></i> SMS</a>
      <a class="ui-btn share__btn" :href="email" data-testid="share-email"><i class="fa-regular fa-envelope"></i> Email</a>
      <button v-if="canNativeShare" class="ui-btn share__btn" type="button" @click="nativeShare"><i class="fa-solid fa-share-nodes"></i> More…</button>
    </div>

    <p class="ui-hint share__hint">
      <i class="fa-solid fa-user-lock"></i>
      Anyone with the full link can join, so send it only to the people you want on the call. WhatsApp messages are end-to-end encrypted; SMS and email are not.
    </p>

    <router-link v-if="joinTo" :to="joinTo" class="ui-btn ui-btn--success share__join" data-testid="join-now"><i class="fa-solid fa-video"></i> Join now</router-link>
  </div>
</template>

<script>
import { toast } from '@/composables/useToast'

export default {
  name: 'ShareCallLink',
  props: {
    link: { type: String, required: true },
    title: { type: String, default: '' },
    hostName: { type: String, default: '' },
    roomId: { type: String, default: '' },
    callKey: { type: String, default: '' },
    showJoin: { type: Boolean, default: true }
  },
  data() {
    return { copied: false, canNativeShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function' }
  },
  computed: {
    message() {
      const what = this.title ? `my secure video call "${this.title}"` : 'my secure video call'
      return `Join ${what}: ${this.link}\nIt's end-to-end encrypted — please don't forward this link.`
    },
    whatsapp() {
      return 'https://wa.me/?text=' + encodeURIComponent(this.message)
    },
    sms() {
      return 'sms:?&body=' + encodeURIComponent(this.message)
    },
    email() {
      const subject = this.title ? `Secure call: ${this.title}` : 'Secure video call'
      const body = `${this.hostName ? `${this.hostName} invited you to a private video call.` : 'You are invited to a private video call.'}\n\nJoin here: ${this.link}\n\nThe call is end-to-end encrypted. Open the link in Chrome, Safari, Edge or Firefox — no account is needed. Please don't forward it: anyone with the full link can join.`
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    },
    joinTo() {
      if (!this.showJoin || !this.roomId || !this.callKey) return null
      return { path: `/c/${this.roomId}`, hash: `#${this.callKey}` }
    }
  },
  methods: {
    async copy() {
      let ok = false
      try {
        await navigator.clipboard.writeText(this.link)
        ok = true
      } catch {
        const el = this.$refs.input
        el.select()
        try {
          ok = document.execCommand('copy')
        } catch {
          ok = false
        }
      }
      if (ok) {
        this.copied = true
        toast.success('Link copied')
        setTimeout(() => (this.copied = false), 2500)
      } else {
        toast.warning('Copy did not work — select the link and copy it yourself')
      }
    },
    async nativeShare() {
      try {
        await navigator.share({ title: this.title || 'Secure call', text: this.message })
      } catch {
        /* cancelled */
      }
    }
  }
}
</script>

<style scoped>
.share {
  display: grid;
  gap: 12px;
}
.share__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}
.share__linkrow {
  display: flex;
  gap: 8px;
}
.share__link {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}
.share__copy {
  flex: none;
  padding-left: 18px;
  padding-right: 18px;
}
.share__via {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}
.share__btn {
  justify-content: center;
}
.share__btn .fa-whatsapp {
  color: var(--success);
}
.share__hint {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.share__hint i {
  padding-top: 3px;
}
.share__join {
  justify-content: center;
  padding: 11px 16px;
}
@media (max-width: 480px) {
  .share__linkrow {
    flex-direction: column;
  }
  .share__copy {
    justify-content: center;
    padding: 12px;
  }
}
</style>
