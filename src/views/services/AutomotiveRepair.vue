<template>
  <ServiceCatalog group-slug="automotive-repair" />
</template>

<script>
// One filtered view of the shared service catalogue (see ServiceCatalog).
import ServiceCatalog from '@/components/services/ServiceCatalog.vue'

export default {
  name: 'AutomotiveRepair',
  components: { ServiceCatalog }
}
</script>
