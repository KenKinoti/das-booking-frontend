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
    <section class="ui-card syn-card">
      <div class="ui-card__head">
        <h2><i class="fa-solid fa-file-csv"></i> Synergy Wholesale files</h2>
        <router-link to="/expenses?tab=synergy" class="ui-btn ui-btn--sm">Synergy analytics <i class="fa-solid fa-arrow-right"></i></router-link>
      </div>
      <div class="ui-card__body">
        <SynergyUpload />
      </div>
    </section>
    <SourcesPanel />
  </div>
</template>

<script>
import SourcesPanel from '@/components/expenses/SourcesPanel.vue'
import SynergyUpload from '@/components/expenses/SynergyUpload.vue'

export default {
  name: 'ExpenseSources',
  components: { SourcesPanel, SynergyUpload }
}
</script>

<style scoped>
.syn-card {
  margin-bottom: 16px;
}
.syn-card .ui-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
