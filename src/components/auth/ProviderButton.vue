<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href || undefined"
    :type="href ? undefined : 'button'"
    class="pbtn"
    :class="`pbtn--${provider}`"
    :data-testid="`sso-${provider}`"
    :aria-disabled="busy ? 'true' : undefined"
    @click="onClick"
  >
    <span class="pbtn__logo" aria-hidden="true">
      <ProviderLogo :provider="provider" />
    </span>
    <span class="pbtn__text">{{ label }}</span>
    <i v-if="busy" class="fa-solid fa-circle-notch spin pbtn__spin" aria-hidden="true"></i>
  </component>
</template>

<script>
import ProviderLogo from './ProviderLogo.vue'

const NAMES = { google: 'Google', microsoft: 'Microsoft' }

export default {
  name: 'ProviderButton',
  components: { ProviderLogo },
  props: {
    provider: { type: String, required: true },
    href: { type: String, default: '' },
    verb: { type: String, default: 'Sign in with' },
    busy: { type: Boolean, default: false }
  },
  emits: ['click'],
  computed: {
    label() {
      return `${this.verb} ${NAMES[this.provider] || this.provider}`
    }
  },
  methods: {
    onClick(e) {
      if (this.busy) {
        e.preventDefault()
        return
      }
      this.$emit('click', e)
    }
  }
}
</script>

<style scoped>
/* Colours are the providers' published button specs (they can't follow the
   app palette): Google "Sign in with Google" (light #FFF / #747775 / #1F1F1F,
   dark #131314 / #8E918F / #E3E3E3) and Microsoft (light #FFF / #8C8C8C /
   #5E5E5E, dark #2F2F2F / #FFF). */
.pbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid;
  font: inherit;
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  transition: box-shadow 0.15s, background-color 0.15s;
}
.pbtn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.pbtn[aria-disabled='true'] {
  cursor: wait;
  opacity: 0.75;
}
.pbtn__logo {
  display: inline-flex;
  flex-shrink: 0;
}
.pbtn__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pbtn__spin {
  position: absolute;
  right: 14px;
  font-size: 13px;
}

.pbtn--google {
  background: #ffffff;
  border-color: #747775;
  color: #1f1f1f;
  font-family: Roboto, Inter, system-ui, sans-serif;
}
.pbtn--google:hover {
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  background: #f8f9fa;
}
[data-theme='dark'] .pbtn--google {
  background: #131314;
  border-color: #8e918f;
  color: #e3e3e3;
}
[data-theme='dark'] .pbtn--google:hover {
  background: #1f1f20;
}

.pbtn--microsoft {
  background: #ffffff;
  border-color: #8c8c8c;
  color: #5e5e5e;
  font-family: 'Segoe UI', Inter, system-ui, sans-serif;
  font-weight: 600;
}
.pbtn--microsoft:hover {
  background: #f3f3f3;
}
[data-theme='dark'] .pbtn--microsoft {
  background: #2f2f2f;
  border-color: #2f2f2f;
  color: #ffffff;
}
[data-theme='dark'] .pbtn--microsoft:hover {
  background: #3b3b3b;
}
</style>
