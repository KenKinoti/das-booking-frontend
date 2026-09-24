<template>
  <ServiceCatalog group-slug="automotive-maintenance" />
</template>

<script>
// One filtered view of the shared service catalogue (see ServiceCatalog).
import ServiceCatalog from '@/components/services/ServiceCatalog.vue'

export default {
  name: 'AutomotiveMaintenance',
  components: { ServiceCatalog }
}
</script>
