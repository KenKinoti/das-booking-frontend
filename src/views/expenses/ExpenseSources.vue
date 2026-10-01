<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Settings</div>
        <h1>Expense sources</h1>
        <p>Connect Synergy Wholesale and Gmail so supplier invoices, renewals and balances flow into Expenses.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/expenses" class="ui-btn"><i class="fa-solid fa-receipt"></i> Open expenses</router-link>
      </div>
    </header>
    <SourcesPanel />
  </div>
</template>

<script>
import SourcesPanel from '@/components/expenses/SourcesPanel.vue'

export default {
  name: 'ExpenseSources',
  components: { SourcesPanel }
}
</script>
