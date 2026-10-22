<template>
  <!-- A theme applied to one small surface: stripe, ornament, greeting and
       whatever is slotted in (a real primary button picks up the theme). -->
  <div class="season-sample ss" :data-sample="theme" :class="{ 'is-compact': compact }">
    <span class="ss__bar" aria-hidden="true"></span>
    <span class="ss__corner" aria-hidden="true"><SeasonOrnament :theme="theme" /></span>
    <span class="season-chip ss__chip">
      <i :class="icon" class="season-chip__icon" aria-hidden="true"></i>
      <span class="season-chip__text">{{ greeting || label }}</span>
    </span>
    <div class="ss__body"><slot /></div>
  </div>
</template>

<script>
import SeasonOrnament from './SeasonOrnament.vue'
import { seasonIcon, seasonLabel } from './themes'

export default {
  name: 'SeasonSample',
  components: { SeasonOrnament },
  props: {
    theme: { type: String, required: true },
    greeting: { type: String, default: '' },
    compact: { type: Boolean, default: false }
  },
  computed: {
    icon() {
      return seasonIcon(this.theme)
    },
    label() {
      return seasonLabel(this.theme)
    }
  }
}
</script>

<style scoped>
.ss {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-height: 112px;
  padding: 16px 52px 14px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.ss.is-compact {
  min-height: 0;
  padding: 12px 46px 12px 12px;
}

.ss__bar {
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--season-bar, var(--accent));
}

.ss__corner {
  position: absolute;
  top: 3px;
  right: 0;
  width: 44px;
  height: 44px;
  pointer-events: none;
}

.ss__chip {
  max-width: 100%;
  padding-right: 11px;
}

@media (max-width: 640px) {
  .ss__chip .season-chip__text {
    display: inline;
  }
}

.ss__body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
