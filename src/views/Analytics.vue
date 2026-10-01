<template>
  <AnalyticsPage title="Analytics" />
</template>

<script>
import AnalyticsPage from '@/components/analytics/AnalyticsPage.vue'

// /analytics — overview report plus analyst views (?view=revenue|clients|payments|services|hosting|seasonality).
export default {
  name: 'AnalyticsView',
  components: { AnalyticsPage }
}
</script>
