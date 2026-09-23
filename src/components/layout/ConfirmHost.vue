<template>
  <div v-if="state.open" class="ui-modal-backdrop" @mousedown.self="settle(false)" @keydown.esc="settle(false)">
    <div class="ui-modal" role="alertdialog" aria-modal="true" style="max-width: 440px">
      <div class="ui-modal__head">
        <h2>{{ state.title }}</h2>
      </div>
      <div class="ui-modal__body" style="color: var(--text-2); white-space: pre-line">{{ state.message }}</div>
      <div class="ui-modal__foot">
        <button class="ui-btn" @click="settle(false)">Cancel</button>
        <button ref="ok" class="ui-btn" :class="state.danger ? 'ui-btn--danger' : 'ui-btn--primary'" @click="settle(true)">{{ state.confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { confirmState, settleConfirm } from '@/composables/useConfirm'

export default {
  name: 'ConfirmHost',
  setup() {
    return { state: confirmState, settle: settleConfirm }
  },
  watch: {
    'state.open'(v) {
      if (v) this.$nextTick(() => this.$refs.ok?.focus())
    }
  }
}
</script>
