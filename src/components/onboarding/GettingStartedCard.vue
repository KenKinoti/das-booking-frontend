<template>
  <section v-if="visible" class="ui-card gs" data-testid="getting-started-card" aria-labelledby="gs-title">
    <div class="ui-card__head gs__head">
      <div class="gs__main">
        <h2 id="gs-title"><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>&nbsp; Getting started</h2>
        <span class="sub">{{ sub }}</span>
        <span v-if="preview" class="ui-badge ui-badge--info gs__preview" data-testid="onboarding-preview-label">Preview of the owner's steps</span>
      </div>
      <div class="gs__actions">
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-testid="getting-started-open" aria-label="Open the checklist" @click="open"><i class="fa-solid fa-list-check" aria-hidden="true"></i><span class="gs__label"> Checklist</span></button>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="preview ? 'Hide the preview' : 'Hide getting started'" title="Hide" @click="hide"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <div class="ui-card__body">
      <div class="gs__bar" role="progressbar" :aria-valuenow="data.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${data.done_count} of ${data.total} steps done`">
        <span :style="{ width: data.percent + '%' }"></span>
      </div>
      <StepList :steps="data.steps" checkable compact :readonly="preview" :busy="onboarding.busy" @go="go" @toggle="toggle" />
    </div>
  </section>
</template>

<script>
import StepList from './StepList.vue'
import { onboarding, loadOnboarding, onboardingApplies, isPreview, setStepDone, dismissOnboarding, openDrawer, markWelcomed, asRole } from './onboarding'
import { access } from '@/composables/useAccess'

// "Getting started" on the Dashboard (owners' and managers' home).
export default {
  name: 'GettingStartedCard',
  components: { StepList },
  data() {
    return { onboarding }
  },
  computed: {
    data() {
      return onboarding.data
    },
    preview() {
      return isPreview()
    },
    visible() {
      void access.needsSetup
      const d = this.data
      if (!d || !onboardingApplies(this.$route)) return false
      if (this.preview) return !onboarding.previewHidden
      return !d.dismissed && !d.all_done
    },
    sub() {
      const d = this.data
      const at = d.org_name ? ` at ${d.org_name}` : ''
      return `${d.done_count} of ${d.total} done · how to use DASYIN ${asRole(d)}${at}`
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(v) {
        onboarding.cardVisible = !!v
      }
    }
  },
  mounted() {
    loadOnboarding()
  },
  beforeUnmount() {
    onboarding.cardVisible = false
  },
  methods: {
    go(step) {
      if (onboarding.sheetOpen) {
        onboarding.sheetOpen = false
        markWelcomed()
      }
      if (step.to && this.$route.fullPath !== step.to) this.$router.push(step.to).catch(() => {})
    },
    toggle(step, done) {
      setStepDone(step, done)
    },
    open() {
      openDrawer()
    },
    hide() {
      dismissOnboarding()
    }
  }
}
</script>

<style scoped>
.gs {
  margin-bottom: 20px;
}

.gs .ui-card__head h2 i {
  color: var(--accent);
}

.gs .sub {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.gs__head {
  flex-wrap: nowrap;
  align-items: flex-start;
}

.gs__main {
  flex: 1 1 auto;
  min-width: 0;
}

.gs__preview {
  margin-top: 8px;
}

.gs__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.gs__bar {
  height: 8px;
  margin-bottom: 14px;
  border-radius: 99px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  overflow: hidden;
}

.gs__bar span {
  display: block;
  height: 100%;
  background: var(--success);
  border-radius: 99px;
  transition: width 0.3s var(--ease);
}

.gs :deep(.obs) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

@media (max-width: 640px) {
  .gs :deep(.obs) {
    grid-template-columns: minmax(0, 1fr);
  }
  .gs__label {
    display: none;
  }
}
</style>
