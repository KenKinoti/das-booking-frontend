<template>
  <section class="ui-card start">
    <div class="start__head">
      <div>
        <h2>Get started with your business hub</h2>
        <p>{{ done }} of {{ steps.length }} done — four quick steps and you're up and running.</p>
      </div>
      <div class="progress" role="progressbar" :aria-valuenow="done" aria-valuemin="0" :aria-valuemax="steps.length" aria-label="Setup progress">
        <div class="progress__fill" :style="{ width: (done / steps.length) * 100 + '%' }"></div>
      </div>
    </div>
    <ol class="steps">
      <li v-for="(s, i) in steps" :key="s.key" :class="{ 'is-done': checklist[s.key] }">
        <button class="step" :disabled="checklist[s.key]" @click="$emit('step', s.key)">
          <span class="step__num">
            <i v-if="checklist[s.key]" class="fa-solid fa-check"></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="step__text">
            <strong>{{ s.title }}</strong>
            <small>{{ s.text }}</small>
          </span>
          <i v-if="!checklist[s.key]" class="fa-solid fa-arrow-right step__go"></i>
        </button>
      </li>
    </ol>
  </section>
</template>

<script>
export default {
  name: 'GetStarted',
  props: { checklist: { type: Object, default: () => ({}) } },
  emits: ['step'],
  data() {
    return {
      steps: [
        { key: 'profile', title: 'Set up your business profile', text: 'Trading name, currency, tax rate and financial year' },
        { key: 'income', title: 'Record your first money in', text: 'A sale, a job paid or any other income' },
        { key: 'expense', title: 'Record your first expense', text: 'Snap the receipt while you’re at it' },
        { key: 'reminder', title: 'Add a reminder', text: 'Rent, bills or your next tax return' }
      ]
    }
  },
  computed: {
    done() {
      return this.steps.filter((s) => this.checklist[s.key]).length
    }
  }
}
</script>

<style scoped>
.start {
  padding: 20px;
  margin-bottom: 20px;
  border-color: var(--accent-soft);
}

.start__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.start h2 {
  font-size: 17px;
  margin: 0;
}

.start p {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.progress {
  width: 200px;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--accent);
  border-radius: inherit;
  transition: width 0.4s var(--ease);
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.step {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.step:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--surface-hover);
}

.step:disabled {
  cursor: default;
  background: var(--surface-2);
}

.step__num {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
}

.is-done .step__num {
  background: var(--success-soft);
  color: var(--success);
}

.is-done strong {
  text-decoration: line-through;
  color: var(--text-3);
}

.step__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step__text strong {
  font-size: 14px;
  font-weight: 600;
}

.step__text small {
  color: var(--text-3);
  font-size: 12.5px;
}

.step__go {
  color: var(--accent);
  font-size: 12px;
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .steps {
    grid-template-columns: 1fr;
  }
  .progress {
    width: 100%;
  }
}
</style>
