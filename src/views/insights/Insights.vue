<template>
  <div class="ui-page ui-page--wide dviz" data-testid="insights-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Overview</div>
        <h1>Insights</h1>
        <p>Where to grow: signals from your own invoices, hosting and quotes, plus market data for Kenya, Australia and East Africa.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/analytics?view=revenue" class="ui-btn"><i class="fa-solid fa-chart-line"></i> Analytics</router-link>
      </div>
    </header>

    <div class="ui-tabs tabs" role="tablist" aria-label="Insights sections">
      <button v-for="t in TABS" :key="t.key" type="button" role="tab" class="ui-tab" :class="{ 'is-active': tab === t.key }" :aria-selected="tab === t.key" :data-tab="t.key" @click="setTab(t.key)">
        <i :class="t.icon"></i> {{ t.label }}
      </button>
    </div>

    <OpportunitiesPanel v-if="tab === 'opportunities'" />
    <MarketIndicators v-else-if="tab === 'market'" />
    <DataExport v-else />
  </div>
</template>

<script>
import '@/components/dashboard/dashviz.css'
import OpportunitiesPanel from '@/components/insights/OpportunitiesPanel.vue'
import MarketIndicators from '@/components/insights/MarketIndicators.vue'
import DataExport from '@/components/insights/DataExport.vue'

const TABS = [
  { key: 'opportunities', label: 'Opportunities', icon: 'fa-solid fa-lightbulb' },
  { key: 'market', label: 'Market indicators', icon: 'fa-solid fa-earth-africa' },
  { key: 'data', label: 'Data export & API', icon: 'fa-solid fa-database' }
]

export default {
  name: 'InsightsView',
  components: { OpportunitiesPanel, MarketIndicators, DataExport },
  data() {
    return { TABS }
  },
  computed: {
    tab() {
      const t = this.$route.query.tab
      return TABS.some((x) => x.key === t) ? t : 'opportunities'
    }
  },
  methods: {
    setTab(t) {
      this.$router.replace({ query: { tab: t === 'opportunities' ? undefined : t } })
    }
  }
}
</script>

<style scoped>
.tabs {
  margin-bottom: 16px;
  overflow-x: auto;
  flex-wrap: nowrap;
}

.ui-tab {
  white-space: nowrap;
}

.ui-tab i {
  margin-right: 4px;
  opacity: 0.8;
}
</style>
