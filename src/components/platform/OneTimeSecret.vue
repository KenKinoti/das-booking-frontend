<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="ots-title">
      <div class="ui-modal__head">
        <h2 id="ots-title">{{ title }}</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <p class="ots-intro">{{ message }}</p>
        <div class="pf-secret">
          <i class="fa-solid fa-key pf-muted"></i>
          <code data-testid="temp-password">{{ secret }}</code>
          <button class="ui-btn ui-btn--sm" @click="copy"><i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i> {{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
        <div class="ui-alert ui-alert--warning ots-warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>This password is shown only once. Share it securely and ask {{ who || 'the user' }} to change it after signing in.</span>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn ui-btn--primary" @click="$emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
import { copyText } from '@/services/platform'
import { toast } from '@/composables/useToast'

export default {
  name: 'OneTimeSecret',
  props: {
    title: { type: String, default: 'Temporary password' },
    message: { type: String, default: '' },
    secret: { type: String, required: true },
    who: { type: String, default: '' }
  },
  emits: ['close'],
  data: () => ({ copied: false }),
  methods: {
    async copy() {
      if (await copyText(this.secret)) {
        this.copied = true
        toast.success('Password copied to clipboard')
      } else {
        toast.error('Copy failed — select the password and copy it manually')
      }
    }
  }
}
</script>

<style scoped>
.ots-intro {
  margin: 0 0 14px;
  color: var(--text-2);
}

.ots-warn {
  margin-top: 14px;
}
</style>
