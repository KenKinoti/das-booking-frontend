<template>
  <ServiceCatalog group-slug="beauty-spa" />
</template>

<script>
// One filtered view of the shared service catalogue (see ServiceCatalog).
import ServiceCatalog from '@/components/services/ServiceCatalog.vue'

export default {
  name: 'BeautySpa',
  components: { ServiceCatalog }
}
</script>
