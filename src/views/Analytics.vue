<template>
  <AnalyticsReport title="Analytics" />
</template>

<script>
import AnalyticsReport from '@/components/dashboard/AnalyticsReport.vue'

// /analytics — same report as /reports-analytics (one coherent analytics page).
export default {
  name: 'AnalyticsView',
  components: { AnalyticsReport }
}
</script>
