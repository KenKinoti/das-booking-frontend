<template>
  <ol class="obs" :class="{ 'obs--compact': compact }" data-testid="onboarding-steps">
    <li v-for="(s, i) in steps" :key="s.key" class="obs__item" :class="{ 'is-done': s.done, 'is-next': s.key === nextKey }" :data-step="s.key" :data-done="s.done ? 'true' : 'false'">
      <button
        v-if="checkable"
        type="button"
        class="obs__mark"
        role="checkbox"
        :aria-checked="s.done ? 'true' : 'false'"
        :aria-label="`${s.title}: ${s.done ? 'done' : 'not done yet'}${readonly ? '' : s.done ? ' — untick' : ' — mark as done'}`"
        :disabled="readonly || busy === 'step:' + s.key"
        :title="readonly ? 'Preview — nothing is saved' : s.done ? 'Mark as not done' : 'Mark as done'"
        @click="$emit('toggle', s, !s.done)"
      >
        <i v-if="s.done" class="fa-solid fa-check" aria-hidden="true"></i>
        <span v-else aria-hidden="true">{{ i + 1 }}</span>
      </button>
      <span v-else class="obs__mark" aria-hidden="true">
        <i v-if="s.done" class="fa-solid fa-check"></i>
        <span v-else>{{ i + 1 }}</span>
      </span>
      <div class="obs__text">
        <strong class="obs__title">{{ s.title }}<span v-if="s.done" class="visually-hidden"> (done)</span></strong>
        <p v-if="!compact || !s.done" class="obs__desc">{{ s.description }}</p>
        <span v-if="s.auto && !s.done && !compact" class="obs__auto"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Ticks itself once you've done it</span>
      </div>
      <button type="button" class="ui-btn ui-btn--sm obs__go" :class="{ 'ui-btn--primary': s.key === nextKey }" :aria-label="`Go: ${s.title}`" data-testid="onboarding-go" @click="$emit('go', s)">
        Go <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </button>
    </li>
  </ol>
</template>

<script>
// One "Getting started" checklist (welcome sheet, drawer, Dashboard card).
export default {
  name: 'StepList',
  props: {
    steps: { type: Array, default: () => [] },
    checkable: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    busy: { type: String, default: '' }
  },
  emits: ['go', 'toggle'],
  computed: {
    nextKey() {
      return this.steps.find((s) => !s.done)?.key || ''
    }
  }
}
</script>

<style scoped>
.obs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obs__item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  transition: border-color 0.15s, background 0.15s;
}

.obs__item.is-next {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: var(--accent-soft);
}

.obs__item.is-done {
  background: var(--bg-subtle);
}

.obs__mark {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  padding: 0;
  flex-shrink: 0;
}

button.obs__mark {
  cursor: pointer;
}

button.obs__mark:hover:not(:disabled) {
  border-color: var(--success);
  color: var(--success);
}

button.obs__mark:disabled {
  cursor: default;
}

.is-done .obs__mark {
  background: var(--success);
  border-color: var(--success);
  color: var(--accent-contrast);
}

.obs__text {
  min-width: 0;
  padding-top: 5px;
}

.obs__title {
  display: block;
  font-size: 14.5px;
  font-weight: 650;
  color: var(--text);
  line-height: 1.3;
}

.is-done .obs__title {
  color: var(--text-2);
  text-decoration: line-through;
  text-decoration-color: var(--text-3);
}

.obs__desc {
  margin: 3px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.obs__auto {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.obs__go {
  margin-top: 1px;
  white-space: nowrap;
}

.obs--compact .obs__item {
  padding: 10px 12px;
  align-items: center;
}

.obs--compact .obs__text {
  padding-top: 0;
}

.obs--compact .obs__desc {
  font-size: 12.5px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 480px) {
  .obs__item {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
  }
  .obs__mark {
    width: 30px;
    height: 30px;
  }
  .obs__go {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
