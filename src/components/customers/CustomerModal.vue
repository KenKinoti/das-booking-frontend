<template>
  <BaseCustomerModal :show="show" :customer="customer" @close="$emit('close')" @saved="(c) => $emit('saved', c)" />
</template>

<script>
// Kept for older imports; the customer form lives in components/CustomerModal.vue.
import BaseCustomerModal from '../CustomerModal.vue'

export default {
  name: 'CustomersCustomerModal',
  components: { BaseCustomerModal },
  props: {
    show: { type: Boolean, default: false },
    customer: { type: Object, default: null }
  },
  emits: ['close', 'saved']
}
</script>
