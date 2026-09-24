<template>
  <ServiceCatalog group-slug="hair-services" />
</template>

<script>
// One filtered view of the shared service catalogue (see ServiceCatalog).
import ServiceCatalog from '@/components/services/ServiceCatalog.vue'

export default {
  name: 'HairServices',
  components: { ServiceCatalog }
}
</script>
