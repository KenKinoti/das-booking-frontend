<template>
  <AnalyticsPage title="Reports & analytics" />
</template>

<script>
import AnalyticsPage from '@/components/analytics/AnalyticsPage.vue'

// /reports-analytics — same page as /analytics (overview + analyst views).
export default {
  name: 'UnifiedAnalytics',
  components: { AnalyticsPage }
}
</script>
