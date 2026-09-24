<template>
  <AnalyticsReport title="Reports & analytics" />
</template>

<script>
import AnalyticsReport from '@/components/dashboard/AnalyticsReport.vue'

// /reports-analytics — real business analytics from /api/v1/analytics/overview.
export default {
  name: 'UnifiedAnalytics',
  components: { AnalyticsReport }
}
</script>
