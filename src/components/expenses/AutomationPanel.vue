<template>
  <section class="ui-card auto" data-testid="automation-panel">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-wand-magic-sparkles head-ic"></i> How automatic is this?</h2>
      <span v-if="a" class="ui-badge" :class="a.daily_sync ? 'ui-badge--success' : 'ui-badge--warning'">{{ a.daily_sync ? `Daily sync ${String(a.hour).padStart(2, '0')}:00` : 'Daily sync off' }}</span>
    </div>
    <div class="ui-card__body">
      <div v-if="err" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ err }}</span></div>
      <div v-else-if="!a" class="ui-skeleton" style="height: 160px"></div>
      <ul v-else class="rows">
        <li v-for="s in a.sources" :key="s.key" :data-source="s.key" :data-level="s.level">
          <span class="lvl" :class="'lvl-' + s.level" :title="LEVEL[s.level]"><i :class="ICON[s.level]"></i></span>
          <div class="body">
            <div class="top">
              <strong>{{ s.label }}</strong>
              <span class="ui-badge" :class="BADGE[s.level]">{{ LEVEL[s.level] }}</span>
              <span class="when muted">{{ s.last_fetched ? 'Last fetched ' + formatDateTime(s.last_fetched) : 'Never fetched' }}</span>
            </div>
            <p>{{ s.how }}</p>
            <p v-if="s.manual" class="todo"><i class="fa-solid fa-hand-point-right"></i> {{ s.manual }}</p>
          </div>
        </li>
      </ul>
      <p v-if="a && a.next_run" class="muted next">Next automatic run {{ formatDateTime(a.next_run) }}.</p>
    </div>
  </section>
</template>

<script>
import { expensesApi } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { formatDateTime } from '@/utils/format'

export default {
  name: 'AutomationPanel',
  data() {
    return {
      a: null,
      err: '',
      LEVEL: { automatic: 'Automatic', partly: 'Partly automatic', manual: 'Needs you', off: 'Not connected' },
      ICON: { automatic: 'fa-solid fa-circle-check', partly: 'fa-solid fa-circle-half-stroke', manual: 'fa-solid fa-hand', off: 'fa-solid fa-plug-circle-xmark' },
      BADGE: { automatic: 'ui-badge--success', partly: 'ui-badge--warning', manual: 'ui-badge--info', off: 'ui-badge--draft' }
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    formatDateTime,
    async load() {
      try {
        this.a = await expensesApi.automation()
        this.err = ''
      } catch (e) {
        this.err = apiErrorMessage(e, 'Could not load the automation status')
      }
    }
  }
}
</script>

<style scoped>
.auto {
  margin-bottom: 16px;
}
.auto .ui-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.head-ic {
  color: var(--accent);
  margin-right: 6px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rows li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.lvl {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-subtle);
  color: var(--text-3);
}
.lvl-automatic {
  background: var(--success-soft);
  color: var(--success);
}
.lvl-partly {
  background: var(--warning-soft);
  color: var(--warning);
}
.lvl-manual {
  background: var(--info-soft);
  color: var(--info);
}
.body {
  flex: 1;
  min-width: 0;
}
.top {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.when {
  margin-left: auto;
}
.body p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
.body p.todo {
  color: var(--text);
}
.todo i {
  color: var(--accent);
  margin-right: 4px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.next {
  margin: 12px 0 0;
}
@media (max-width: 640px) {
  .when {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>
