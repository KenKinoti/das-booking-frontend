<template>
  <div class="ui-page ui-page--wide hub">
    <header class="ui-page-head no-print">
      <div>
        <div class="ui-eyebrow">Small business</div>
        <h1>{{ settings && settings.trading_name ? settings.trading_name : 'Business hub' }}</h1>
        <p>Your money in, money out, reminders and reports — all in one simple place.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="!ready" @click="openQuick('expense')"><i class="fa-solid fa-receipt"></i> Quick expense</button>
        <button class="ui-btn ui-btn--primary" :disabled="!ready" @click="openQuick('income')"><i class="fa-solid fa-plus"></i> Quick sale</button>
      </div>
    </header>

    <nav class="hub-tabs no-print" aria-label="Business hub sections">
      <div class="ui-tabs" role="tablist">
        <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" @click="setTab(t.key)">
          <i :class="t.icon"></i><span>{{ t.label }}</span>
          <span v-if="t.key === 'reminders' && overdueCount" class="count danger-count">{{ overdueCount }}</span>
        </button>
      </div>
    </nav>

    <div v-if="error" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <div v-else-if="!ready" class="ui-card"><div class="ui-card__body"><div class="ui-skeleton" style="height: 320px"></div></div></div>

    <template v-else>
      <HubOverview
        v-if="tab === 'overview'"
        :settings="settings"
        :refresh-key="refreshKey"
        @add="openQuick"
        @edit="openEdit"
        @tab="setTab"
        @add-reminder="openReminder(null)"
        @edit-reminder="openReminder"
        @changed="changed"
        @overdue="overdueCount = $event"
      />
      <CashBook
        v-else-if="tab === 'cashbook'"
        :settings="settings"
        :categories="categories"
        :refresh-key="refreshKey"
        @add="openFull"
        @edit="openEdit"
        @changed="changed"
        @manage-categories="showCategories = true"
      />
      <HubReminders v-else-if="tab === 'reminders'" :settings="settings" :refresh-key="refreshKey" @add="openReminder(null)" @edit="openReminder" @changed="changed" />
      <HubReports v-else-if="tab === 'reports'" :settings="settings" :refresh-key="refreshKey" />
      <BusinessProfile v-else-if="tab === 'profile'" :settings="settings" @saved="onSettingsSaved" @manage-categories="showCategories = true" />
    </template>

    <EntryModal
      v-if="entryModal"
      :settings="settings"
      :categories="categories"
      :entry-id="entryModal.id"
      :preset-type="entryModal.type"
      :quick="entryModal.quick"
      @close="entryModal = null"
      @saved="onEntrySaved"
      @deleted="onEntryDeleted"
    />
    <ReminderModal v-if="reminderModal" :settings="settings" :reminder="reminderModal.reminder" @close="reminderModal = null" @saved="onReminderSaved" />
    <CategoryModal v-if="showCategories" :categories="categories" @close="showCategories = false" @changed="reloadCategories" />
  </div>
</template>

<script>
import { smallbizApi } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import HubOverview from './HubOverview.vue'
import CashBook from './CashBook.vue'
import HubReminders from './HubReminders.vue'
import HubReports from './HubReports.vue'
import BusinessProfile from './BusinessProfile.vue'
import EntryModal from '@/components/smallbiz/EntryModal.vue'
import ReminderModal from '@/components/smallbiz/ReminderModal.vue'
import CategoryModal from '@/components/smallbiz/CategoryModal.vue'

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'fa-solid fa-gauge-high' },
  { key: 'cashbook', label: 'Cash book', icon: 'fa-solid fa-book' },
  { key: 'reminders', label: 'Reminders', icon: 'fa-regular fa-bell' },
  { key: 'reports', label: 'Reports', icon: 'fa-solid fa-chart-column' },
  { key: 'profile', label: 'Business profile', icon: 'fa-regular fa-id-card' }
]

export default {
  name: 'BusinessHub',
  components: { HubOverview, CashBook, HubReminders, HubReports, BusinessProfile, EntryModal, ReminderModal, CategoryModal },
  data() {
    return {
      tabs: TABS,
      settings: null,
      categories: [],
      error: null,
      refreshKey: 0,
      entryModal: null,
      reminderModal: null,
      showCategories: false,
      overdueCount: 0
    }
  },
  computed: {
    ready() {
      return !!this.settings
    },
    tab() {
      const t = this.$route.query.tab
      return TABS.some((x) => x.key === t) ? t : 'overview'
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.error = null
      try {
        const [s, cats, rem] = await Promise.all([smallbizApi.settings(), smallbizApi.categories(), smallbizApi.reminders({ status: 'overdue' })])
        this.settings = s
        this.categories = cats
        this.overdueCount = rem.length
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your business hub')
      }
    },
    async reloadCategories() {
      try {
        this.categories = await smallbizApi.categories()
        this.refreshKey++
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reload categories'))
      }
    },
    setTab(key) {
      if (key === this.tab) return
      this.$router.replace({ query: { ...this.$route.query, tab: key === 'overview' ? undefined : key } })
    },
    openQuick(type) {
      this.entryModal = { id: null, type, quick: true }
    },
    openFull(type) {
      this.entryModal = { id: null, type: type || 'expense', quick: false }
    },
    openEdit(entry) {
      this.entryModal = { id: entry.id, type: entry.type, quick: false }
    },
    openReminder(reminder) {
      this.reminderModal = { reminder }
    },
    changed() {
      this.refreshKey++
      smallbizApi
        .reminders({ status: 'overdue' })
        .then((r) => (this.overdueCount = r.length))
        .catch(() => {})
    },
    onEntrySaved(entry, isNew) {
      this.entryModal = null
      const what = entry.type === 'income' ? 'Money in' : 'Money out'
      toast.success(isNew ? `${what} recorded` : 'Entry updated')
      this.changed()
    },
    onEntryDeleted() {
      this.entryModal = null
      toast.success('Entry deleted')
      this.changed()
    },
    onReminderSaved(r, isNew) {
      this.reminderModal = null
      toast.success(isNew ? 'Reminder added' : 'Reminder updated')
      this.changed()
    },
    onSettingsSaved(s) {
      this.settings = s
      this.changed()
    }
  }
}
</script>

<style scoped>
.hub-tabs {
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.hub-tabs .ui-tabs {
  flex-wrap: nowrap;
}

.hub-tabs .ui-tab {
  white-space: nowrap;
}

.danger-count {
  background: var(--danger-soft) !important;
  color: var(--danger) !important;
}

@media (max-width: 640px) {
  .ui-page-head .ui-actions {
    width: 100%;
  }
  .ui-page-head .ui-actions .ui-btn {
    flex: 1;
    justify-content: center;
  }
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
