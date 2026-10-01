<template>
  <div v-if="visible" class="btb-wrap">
    <section class="btb" role="region" aria-labelledby="btb-title" data-testid="business-type-banner">
      <div class="btb__icon" aria-hidden="true"><i class="fa-solid fa-shapes"></i></div>
      <div class="btb__body">
        <h2 id="btb-title">Choose your business type to tailor DASYIN</h2>
        <p>Mechanic, salon, clinic, agency… DASYIN then shows the modules, words and staff roles that fit. Everything you use today stays on until you choose.</p>
      </div>
      <div class="btb__actions">
        <router-link to="/setup" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-wand-magic-sparkles"></i> Choose business type</router-link>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="dismiss">Not now</button>
      </div>
    </section>
  </div>
</template>

<script>
import { access } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'

const KEY = 'business_type_banner_dismissed'

function dismissedList() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') || []
  } catch {
    return []
  }
}

/**
 * Admins of an organisation that never chose a business type (existing
 * "general" organisations) are invited to choose one. Shown on the
 * dashboard; "Not now" hides it for this organisation on this device.
 */
export default {
  name: 'BusinessTypeBanner',
  data() {
    return { access, dismissed: dismissedList() }
  },
  computed: {
    orgId() {
      return useAuthStore().user?.organization_id || ''
    },
    visible() {
      if (!this.access.loaded || !this.access.showBanner || useAuthStore().isSuperAdmin) return false
      if (this.$route.path !== '/dashboard') return false
      return !this.dismissed.includes(this.orgId)
    }
  },
  methods: {
    dismiss() {
      const list = [...dismissedList(), this.orgId].slice(-20)
      this.dismissed = list
      try {
        localStorage.setItem(KEY, JSON.stringify(list))
      } catch {
        /* storage unavailable: hidden for this session only */
      }
    }
  }
}
</script>

<style scoped>
.btb-wrap {
  padding: 20px 32px 0;
}

.btb {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.btb__icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 16px;
}

.btb__body {
  flex: 1;
  min-width: 0;
}

.btb__body h2 {
  margin: 0 0 2px;
  font-size: 14.5px;
  font-weight: 650;
  color: var(--text);
}

.btb__body p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.btb__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 991px) {
  .btb-wrap {
    padding: 16px max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
  }
}

@media (max-width: 640px) {
  .btb {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .btb__body {
    flex-basis: calc(100% - 52px);
  }

  .btb__actions {
    width: 100%;
  }

  .btb__actions .ui-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
