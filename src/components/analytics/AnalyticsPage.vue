<template>
  <AnalyticsReport v-if="view === 'overview'" :title="title">
    <template #tabs><AnalyticsTabs :model-value="view" @update:model-value="setView" /></template>
  </AnalyticsReport>
  <AdvancedAnalytics v-else :key="view" :view="view" :title="title">
    <template #tabs><AnalyticsTabs :model-value="view" @update:model-value="setView" /></template>
  </AdvancedAnalytics>
</template>

<script>
import AnalyticsReport from '@/components/dashboard/AnalyticsReport.vue'
import AnalyticsTabs, { VIEWS } from './AnalyticsTabs.vue'
import AdvancedAnalytics from './AdvancedAnalytics.vue'

// /analytics and /reports-analytics: the overview report plus the analyst
// views (?view=revenue|clients|payments|services|hosting|seasonality).
export default {
  name: 'AnalyticsPage',
  components: { AnalyticsReport, AnalyticsTabs, AdvancedAnalytics },
  props: { title: { type: String, default: 'Analytics' } },
  computed: {
    view() {
      const v = this.$route.query.view
      return VIEWS.some((x) => x.key === v) ? v : 'overview'
    }
  },
  methods: {
    setView(v) {
      const q = { ...this.$route.query, view: v === 'overview' ? undefined : v }
      // Filters belong to one view.
      delete q.client
      delete q.line
      delete q.month
      this.$router.replace({ query: q })
    }
  }
}
</script>
