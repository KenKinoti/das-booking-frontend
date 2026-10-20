<template>
  <Teleport to="body">
    <div class="obd-backdrop" data-onboarding @mousedown.self="$emit('close')">
      <aside ref="dialog" class="obd" role="dialog" aria-modal="true" aria-labelledby="obd-title" data-testid="onboarding-drawer">
        <header class="obd__head">
          <div class="obd__title">
            <div class="ui-eyebrow">{{ eyebrow }}</div>
            <h2 id="obd-title" ref="title" tabindex="-1">Getting started</h2>
            <span v-if="preview" class="ui-badge ui-badge--info" data-testid="onboarding-preview-label">Preview of the owner's steps</span>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" data-testid="onboarding-drawer-close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <div class="obd__progress" data-testid="onboarding-progress">
          <div class="obd__bar" role="progressbar" :aria-valuenow="data.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${data.done_count} of ${data.total} steps done`">
            <span :style="{ width: data.percent + '%' }"></span>
          </div>
          <span class="obd__count"><strong>{{ data.done_count }}</strong> of {{ data.total }} done</span>
        </div>

        <div class="obd__body">
          <div v-if="data.all_done" class="obd__done" data-testid="onboarding-all-done">
            <span class="obd__done-icon" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
            <div>
              <strong>You're all set</strong>
              <p>Every step is done. This list stays here in case you want another look.</p>
            </div>
          </div>
          <StepList :steps="data.steps" checkable :readonly="preview" :busy="busy" @go="(s) => $emit('go', s)" @toggle="(s, d) => $emit('toggle', s, d)" />
          <p class="ui-hint obd__hint">Tick a step yourself once it's done. Steps marked "ticks itself" update on their own.</p>
        </div>

        <footer class="obd__foot">
          <button v-if="!preview" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="!!busy" data-testid="onboarding-restart" @click="$emit('restart')"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Start over</button>
          <span v-else></span>
          <button type="button" class="ui-btn ui-btn--sm" :disabled="!!busy" data-testid="onboarding-dismiss" @click="$emit('dismiss')"><i class="fa-regular fa-eye-slash" aria-hidden="true"></i> {{ preview ? 'Hide preview' : 'Hide getting started' }}</button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script>
import StepList from './StepList.vue'
import { trapFocus } from './focusTrap'
import { asRole } from './onboarding'

// The "Getting started" checklist, opened from the floating pill.
export default {
  name: 'OnboardingDrawer',
  components: { StepList },
  props: {
    data: { type: Object, required: true },
    preview: { type: Boolean, default: false },
    busy: { type: String, default: '' }
  },
  emits: ['close', 'go', 'toggle', 'dismiss', 'restart'],
  computed: {
    eyebrow() {
      const at = this.data.org_name ? ` at ${this.data.org_name}` : ''
      const who = asRole(this.data)
      return who.charAt(0).toUpperCase() + who.slice(1) + at
    }
  },
  mounted() {
    document.documentElement.classList.add('has-drawer-open')
    this.release = trapFocus(this.$refs.dialog, { onEscape: () => this.$emit('close'), initial: this.$refs.title })
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-drawer-open')
    this.release?.()
  }
}
</script>

<style scoped>
.obd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
  animation: ui-fade 0.15s ease-out;
}

.obd {
  width: min(440px, 100vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: obd-in 0.22s var(--ease);
}

@keyframes obd-in {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
}

.obd__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: calc(18px + env(safe-area-inset-top)) 20px 8px;
}

.obd__title {
  min-width: 0;
}

.obd__title h2 {
  margin: 2px 0 6px;
  font-size: 19px;
  outline: none;
}

.obd__title .ui-eyebrow {
  overflow-wrap: anywhere;
}

.obd__progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.obd__bar {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  overflow: hidden;
}

.obd__bar span {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: 99px;
  transition: width 0.3s var(--ease);
}

.obd__count {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.obd__body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
  overscroll-behavior: contain;
}

.obd__done {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  margin-bottom: 12px;
  border-radius: var(--radius);
  background: var(--success-soft);
}

.obd__done-icon {
  color: var(--success);
  font-size: 22px;
}

.obd__done p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
}

.obd__hint {
  margin-top: 12px;
}

.obd__foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .obd-backdrop {
    align-items: flex-end;
  }
  .obd {
    width: 100vw;
    height: auto;
    max-height: calc(100dvh - 24px - env(safe-area-inset-top));
    border-left: 0;
    border-radius: 20px 20px 0 0;
    animation: ui-sheet 0.24s var(--ease);
  }
  .obd__head {
    padding-top: 18px;
  }
}
</style>
