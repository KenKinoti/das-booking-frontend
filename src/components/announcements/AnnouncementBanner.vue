<template>
  <div v-if="showBanner && banner.length" class="ab" role="region" aria-label="Messages from DASYIN">
    <AnnouncementCard
      v-for="it in banner.slice(0, 3)"
      :key="it.id"
      :item="it"
      compact
      banner
      dismissible
      @cta="cta"
      @open="openItem"
      @dismiss="dismiss"
    />
    <p v-if="banner.length > 3" class="ab__more">
      <i class="fa-regular fa-bell"></i> {{ banner.length - 3 }} more urgent message{{ banner.length - 3 === 1 ? '' : 's' }} in your notifications.
    </p>
  </div>

  <teleport to="body">
    <div v-if="viewer.open" class="ui-modal-backdrop" @mousedown.self="closeViewer">
      <div class="ui-modal ab-modal" role="dialog" aria-modal="true" aria-labelledby="ab-title" @keydown.esc="closeViewer">
        <div class="ui-modal__head">
          <h2 id="ab-title"><i class="fa-solid fa-bullhorn"></i> Message from DASYIN</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" type="button" aria-label="Close" @click="closeViewer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="viewer.loading" class="ab-sk" aria-busy="true">
            <span class="ui-skeleton" style="width: 40%"></span>
            <span class="ui-skeleton" style="width: 85%; height: 22px"></span>
            <span class="ui-skeleton" style="width: 100%"></span>
            <span class="ui-skeleton" style="width: 92%"></span>
          </div>
          <div v-else-if="viewer.error" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-regular fa-envelope"></i></div>
            <h3>Not available</h3>
            <p>{{ viewer.error }}</p>
          </div>
          <AnnouncementCard v-else-if="viewer.item" :item="viewer.item" show-when hide-actions @link="go" />
        </div>
        <div v-if="viewer.item && !viewer.loading" class="ui-modal__foot">
          <button v-if="viewer.item.kind === 'promotion' && !viewer.item.is_test" type="button" class="ui-btn ui-btn--ghost ab-stop" @click="stopOffers">No more offers</button>
          <span class="ab-grow"></span>
          <button type="button" class="ui-btn" @click="closeViewer">Close</button>
          <button v-if="viewer.item.cta_label && viewer.item.cta_url" type="button" class="ui-btn ui-btn--primary" @click="cta(viewer.item)">
            {{ viewer.item.cta_label }} <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import AnnouncementCard from './AnnouncementCard.vue'
import { myAnnouncementsAPI } from '@/services/announcements'
import { notifications, refreshNotifications } from '@/composables/useNotifications'
import { homePath } from '@/composables/useAccess'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const POLL_MS = 120000

/**
 * "From DASYIN" announcements in the app shell: urgent ones as a banner at the
 * top of the dashboard (and the person's home page), and the full message in
 * a dialog whenever the URL has ?announcement=<id> — that is where the
 * notification centre, its toasts and the email's "Read" button lead.
 */
export default {
  name: 'AnnouncementBanner',
  components: { AnnouncementCard },
  data() {
    return {
      items: [],
      viewer: { open: false, id: '', item: null, loading: false, error: '' },
      timer: null,
      loadedAt: 0,
      notif: notifications
    }
  },
  computed: {
    showBanner() {
      const p = this.$route.path
      if (p === '/dashboard' || p === '/') return true
      try {
        return p === homePath()
      } catch {
        return false
      }
    },
    banner() {
      return this.items.filter((i) => i.banner)
    },
    queryId() {
      const q = this.$route.query.announcement
      return typeof q === 'string' ? q : ''
    }
  },
  watch: {
    queryId: {
      immediate: true,
      handler(id) {
        if (id) this.openId(id)
        else if (this.viewer.open) this.viewer.open = false
      }
    },
    showBanner(on) {
      if (on && Date.now() - this.loadedAt > 15000) this.load()
    },
    'notif.latestAt'(v, old) {
      if (v && v !== old) this.load()
    }
  },
  mounted() {
    this.load()
    this.timer = setInterval(() => {
      if (document.visibilityState !== 'hidden' && this.showBanner) this.load()
    }, POLL_MS)
    window.addEventListener('focus', this.onFocus)
  },
  beforeUnmount() {
    clearInterval(this.timer)
    window.removeEventListener('focus', this.onFocus)
  },
  methods: {
    onFocus() {
      if (this.showBanner && Date.now() - this.loadedAt > 30000) this.load()
    },
    async load() {
      this.loadedAt = Date.now()
      try {
        const d = await myAnnouncementsAPI.list()
        this.items = d.items || []
      } catch {
        /* offline or signed out: the next poll tries again */
      }
    },
    async openId(id) {
      this.viewer = { open: true, id, item: this.items.find((i) => i.id === id) || null, loading: true, error: '' }
      try {
        const item = await myAnnouncementsAPI.get(id)
        if (this.viewer.id !== id) return
        this.viewer.item = item
        if (!item.read_at) {
          await myAnnouncementsAPI.read(id).catch(() => {})
          this.markLocal(id, { read_at: new Date().toISOString(), banner: false })
          refreshNotifications({ silent: true })
        }
      } catch (e) {
        if (this.viewer.id === id) this.viewer.error = apiErrorMessage(e, 'This message is no longer available.')
      } finally {
        if (this.viewer.id === id) this.viewer.loading = false
      }
    },
    openItem(it) {
      this.$router.push({ path: this.$route.path, query: { ...this.$route.query, announcement: it.id } }).catch(() => {})
    },
    closeViewer() {
      this.viewer.open = false
      if (this.queryId) {
        const q = { ...this.$route.query }
        delete q.announcement
        this.$router.replace({ path: this.$route.path, query: q }).catch(() => {})
      }
    },
    markLocal(id, patch) {
      const it = this.items.find((i) => i.id === id)
      if (it) Object.assign(it, patch)
    },
    async dismiss(it) {
      this.markLocal(it.id, { banner: false, dismissed_at: new Date().toISOString() })
      try {
        await myAnnouncementsAPI.dismiss(it.id)
        refreshNotifications({ silent: true })
      } catch {
        /* shown again on the next refresh */
      }
    },
    async cta(it) {
      const url = it.cta_url
      this.markLocal(it.id, { banner: false })
      myAnnouncementsAPI.click(it.id).then(() => refreshNotifications({ silent: true })).catch(() => {})
      if (!url) return
      if (url.startsWith('/')) {
        this.viewer.open = false
        this.$router.push(url).catch(() => {})
      } else {
        window.open(url, '_blank', 'noopener')
        if (this.viewer.open) this.closeViewer()
      }
    },
    async stopOffers() {
      try {
        await myAnnouncementsAPI.savePreferences({ promotions: false })
        toast.success('You won’t get DASYIN offers any more — by email or in the app.')
        this.items = this.items.filter((i) => i.kind !== 'promotion')
        this.closeViewer()
        refreshNotifications({ silent: true })
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save that'))
      }
    },
    go(path) {
      this.viewer.open = false
      this.$router.push(path).catch(() => {})
    }
  }
}
</script>

<style scoped>
.ab {
  display: grid;
  gap: 10px;
  margin: 0 auto 18px;
  max-width: 1320px;
}
.ab__more {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}
.ab-modal {
  max-width: 620px;
}
.ab-modal :deep(.ann) {
  border: 0;
  border-left: 0;
  box-shadow: none;
  padding: 0;
  background: transparent;
}
.ab-modal .ui-modal__head h2 i {
  color: var(--accent);
  margin-right: 6px;
}
.ab-grow {
  flex: 1;
}
.ab-stop {
  color: var(--text-3);
}
.ab-sk {
  display: grid;
  gap: 10px;
}
.ab-sk .ui-skeleton {
  height: 14px;
  display: block;
}
</style>
