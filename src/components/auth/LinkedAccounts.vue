<template>
  <section class="ui-card" data-testid="linked-accounts">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-link"></i>&nbsp; Sign-in methods</h2>
    </div>
    <div class="ui-card__body">
      <div v-if="loading" class="la-skel">
        <div v-for="n in 2" :key="n" class="ui-skeleton" style="height: 44px; margin-bottom: 10px"></div>
      </div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      <template v-else>
        <ul class="la-list">
          <li class="la-row">
            <span class="la-ico"><i class="fa-solid fa-key"></i></span>
            <span class="la-main"><strong>Email and password</strong><small>{{ email }}</small></span>
          </li>
          <li v-for="i in identities" :key="i.id" class="la-row" :data-testid="`identity-${i.provider}`">
            <span class="la-ico la-ico--brand"><ProviderLogo :provider="i.provider" /></span>
            <span class="la-main">
              <strong>Signed in with {{ name(i.provider) }}<template v-if="i.email"> ({{ i.email }})</template></strong>
              <small>Linked {{ date(i.linked_at) }}<template v-if="i.last_used"> · last used {{ dateTime(i.last_used) }}</template></small>
            </span>
            <button class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy === i.id" :data-testid="`unlink-${i.provider}`" @click="unlink(i)">
              <i :class="busy === i.id ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-link-slash'"></i> Unlink
            </button>
          </li>
        </ul>
        <div v-if="linkable.length" class="la-link">
          <p class="muted small">Link an account to sign in with one click. The email doesn't have to match.</p>
          <div class="la-btns">
            <ProviderButton v-for="p in linkable" :key="p.id" :provider="p.id" verb="Link" :busy="busy === p.id" @click="link(p.id)" />
          </div>
        </div>
        <p v-else-if="!providers.some((p) => p.enabled)" class="muted small la-none">Sign-in with Google or Microsoft isn't enabled for this workspace.</p>
      </template>
    </div>
  </section>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { ssoApi, PROVIDER_NAMES } from '@/services/sso'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime } from '@/utils/format'
import ProviderButton from './ProviderButton.vue'
import ProviderLogo from './ProviderLogo.vue'

export default {
  name: 'LinkedAccounts',
  components: { ProviderButton, ProviderLogo },
  props: { email: { type: String, default: '' } },
  data() {
    return { identities: [], providers: [], loading: true, error: '', busy: '' }
  },
  computed: {
    linkable() {
      return this.providers.filter((p) => p.enabled)
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    name(p) {
      return PROVIDER_NAMES[p] || p
    },
    date: formatDate,
    dateTime: formatDateTime,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const d = await ssoApi.identities()
        this.identities = d?.identities || []
        this.providers = d?.providers || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load your sign-in methods')
      } finally {
        this.loading = false
      }
    },
    async link(provider) {
      this.busy = provider
      try {
        const { url } = await ssoApi.link(provider, '/profile')
        window.location.assign(url)
      } catch (e) {
        this.busy = ''
        toast.error(apiErrorMessage(e, 'Could not start linking'))
      }
    },
    async unlink(i) {
      const ok = await confirmDialog({
        title: `Unlink ${this.name(i.provider)}?`,
        message: `You won't be able to sign in with ${this.name(i.provider)}${i.email ? ` (${i.email})` : ''} any more — unless it uses the same email as your DASYIN account. You can link it again later.`,
        confirmText: 'Unlink',
        danger: true
      })
      if (!ok) return
      this.busy = i.id
      try {
        await ssoApi.unlink(i.id)
        this.identities = this.identities.filter((x) => x.id !== i.id)
        toast.success(`${this.name(i.provider)} unlinked`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not unlink'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.la-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.la-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  min-width: 0;
}
.la-ico {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
  flex-shrink: 0;
}
.la-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}
.la-main strong {
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.la-main small {
  font-size: 12px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}
.la-link {
  margin-top: 16px;
}
.la-link p {
  margin: 0 0 10px;
}
.la-btns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 10px;
  max-width: 560px;
}
.la-none {
  margin: 14px 0 0;
}
</style>
