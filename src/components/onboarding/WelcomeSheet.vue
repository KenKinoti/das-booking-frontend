<template>
  <Teleport to="body">
    <div class="ui-modal-backdrop ob-welcome-backdrop" data-onboarding @mousedown.self="$emit('later')">
      <section ref="dialog" class="ui-modal ob-welcome" role="dialog" aria-modal="true" aria-labelledby="ob-welcome-title" aria-describedby="ob-welcome-lead" data-testid="onboarding-welcome">
        <div class="ui-modal__head">
          <div class="ob-welcome__head">
            <span class="ob-welcome__icon" aria-hidden="true"><i class="fa-solid fa-hand-sparkles"></i></span>
            <div>
              <div class="ui-eyebrow">
                Getting started
                <span v-if="preview" class="ui-badge ui-badge--info ob-preview" data-testid="onboarding-preview-label">Preview of the owner's steps</span>
              </div>
              <h2 id="ob-welcome-title" ref="title" tabindex="-1">Welcome{{ data.first_name ? ', ' + data.first_name : '' }}</h2>
            </div>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close — show me later" @click="$emit('later')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p id="ob-welcome-lead" class="ob-welcome__lead" data-testid="onboarding-welcome-lead">{{ lead }}</p>
          <p class="ob-welcome__hint">{{ hint }}</p>
          <StepList :steps="data.steps" @go="(s) => $emit('go', s)" />
        </div>
        <div class="ui-modal__foot ob-welcome__foot">
          <button type="button" class="ui-btn" data-testid="onboarding-later" @click="$emit('later')">Later</button>
          <button type="button" class="ui-btn ui-btn--primary" data-testid="onboarding-start" @click="$emit('start')">Let's go <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import StepList from './StepList.vue'
import { trapFocus } from './focusTrap'
import { asRole } from './onboarding'

// First sign-in: how this person will use DASYIN, in their role's words.
export default {
  name: 'WelcomeSheet',
  components: { StepList },
  props: {
    data: { type: Object, required: true },
    preview: { type: Boolean, default: false }
  },
  emits: ['go', 'later', 'start'],
  computed: {
    lead() {
      const at = this.data.org_name ? ` at ${this.data.org_name}` : ''
      return `Here's how you'll use DASYIN ${asRole(this.data)}${at}.`
    },
    hint() {
      const n = this.data.steps?.length || 0
      const left = this.data.steps?.filter((s) => !s.done).length || 0
      if (this.preview) return `This is what the owner sees. Nothing you tick here is saved.`
      if (!left) return `You've already done all ${n}. You're all set.`
      return `${n} short steps. Tap Go to jump straight there — most of them tick themselves once you've done them.`
    }
  },
  mounted() {
    document.documentElement.classList.add('has-drawer-open')
    this.release = trapFocus(this.$refs.dialog, { onEscape: () => this.$emit('later'), initial: this.$refs.title })
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-drawer-open')
    this.release?.()
  }
}
</script>

<style scoped>
.ob-welcome {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* The steps scroll; the heading and Later / Let's go stay in view */
.ob-welcome > .ui-modal__head,
.ob-welcome > .ui-modal__foot {
  flex-shrink: 0;
}

.ob-welcome > .ui-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.ob-welcome__head {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.ob-welcome__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 20px;
}

.ob-welcome h2 {
  font-size: 22px;
  margin: 2px 0 0;
  outline: none;
}

.ob-preview {
  margin-left: 6px;
  text-transform: none;
  letter-spacing: 0;
}

.ob-welcome__lead {
  margin: 0;
  font-size: 15.5px;
  font-weight: 550;
  color: var(--text);
  line-height: 1.45;
}

.ob-welcome__hint {
  margin: 6px 0 16px;
  font-size: 13.5px;
  color: var(--text-2);
}

.ob-welcome__foot {
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

@media (max-width: 640px) {
  .ob-welcome__foot {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
  .ob-welcome__foot .ui-btn {
    flex: 1 1 0;
    justify-content: center;
  }
  .ob-welcome h2 {
    font-size: 20px;
  }
}
</style>
