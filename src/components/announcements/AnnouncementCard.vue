<template>
  <article class="ann" :class="[`is-${tone}`, { 'is-compact': compact, 'is-banner': banner }]" :aria-label="`From DASYIN: ${item.title || 'Announcement'}`">
    <div class="ann__icon" aria-hidden="true"><i :class="kind.icon"></i></div>
    <div class="ann__main">
      <div class="ann__meta">
        <span class="ann__from"><i class="fa-solid fa-certificate"></i> From DASYIN</span>
        <span class="ann__kind">{{ kind.label }}</span>
        <span v-if="item.is_test" class="ann__test">Test</span>
        <span v-if="when" class="ann__when">{{ when }}</span>
      </div>
      <h3 class="ann__title">{{ item.title || 'Your title' }}</h3>
      <img v-if="item.image_url && !compact" class="ann__img" :src="item.image_url" alt="" loading="lazy" @error="imgBroken = true" v-show="!imgBroken" />
      <div v-if="compact" class="ann__text">{{ preview }}</div>
      <div v-else class="ann__body" v-html="item.body || '<p>Your message</p>'" @click="onBodyClick"></div>
      <div class="ann__actions" v-if="!hideActions">
        <button v-if="item.cta_label && item.cta_url" type="button" class="ui-btn ui-btn--sm" :class="tone === 'danger' ? 'ui-btn--danger' : 'ui-btn--primary'" @click="$emit('cta', item)">
          {{ item.cta_label }} <i class="fa-solid fa-arrow-right"></i>
        </button>
        <button v-if="compact" type="button" class="ui-btn ui-btn--sm" @click="$emit('open', item)"><i class="fa-regular fa-envelope-open"></i> Read more</button>
        <button v-if="dismissible" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="$emit('dismiss', item)"><i class="fa-solid fa-check"></i> Got it</button>
      </div>
    </div>
  </article>
</template>

<script>
import { KINDS } from '@/services/announcements'

/**
 * One "From DASYIN" announcement as people see it in the app: the urgent
 * banner on the dashboard (compact), the full message (viewer) and the
 * composer's live preview. The body is HTML the server sanitised.
 */
export default {
  name: 'AnnouncementCard',
  props: {
    item: { type: Object, required: true },
    compact: { type: Boolean, default: false },
    banner: { type: Boolean, default: false },
    dismissible: { type: Boolean, default: false },
    hideActions: { type: Boolean, default: false },
    showWhen: { type: Boolean, default: false }
  },
  emits: ['cta', 'open', 'dismiss', 'link'],
  data() {
    return { imgBroken: false }
  },
  computed: {
    kind() {
      return KINDS[this.item.kind] || KINDS.update
    },
    tone() {
      if (this.item.kind === 'urgent' || this.item.priority === 'urgent') return 'danger'
      return this.kind.tone
    },
    preview() {
      const t = (this.item.body_text || '').replace(/\s+/g, ' ').trim()
      return t.length > 180 ? t.slice(0, 178).trim() + '…' : t
    },
    when() {
      if (!this.showWhen || !this.item.delivered_at) return ''
      return new Date(this.item.delivered_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }
  },
  watch: {
    'item.image_url'() {
      this.imgBroken = false
    }
  },
  methods: {
    onBodyClick(e) {
      const a = e.target.closest?.('a')
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault()
        this.$emit('link', href)
      }
    }
  }
}
</script>

<style scoped>
.ann {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--tone);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  min-width: 0;
}
.ann.is-success { --tone: var(--success); --tone-soft: var(--success-soft); }
.ann.is-warning { --tone: var(--warning); --tone-soft: var(--warning-soft); }
.ann.is-danger { --tone: var(--danger); --tone-soft: var(--danger-soft); }
.ann.is-banner { background: color-mix(in srgb, var(--tone-soft) 55%, var(--surface)); border-color: color-mix(in srgb, var(--tone) 30%, var(--border)); border-left-color: var(--tone); }

.ann__icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--tone-soft);
  color: var(--tone);
  font-size: 16px;
}
.ann__main {
  flex: 1;
  min-width: 0;
}
.ann__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 2px;
}
.ann__from {
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.01em;
}
.ann__from i {
  font-size: 10px;
}
.ann__kind {
  font-weight: 600;
  color: var(--tone);
}
.ann__test {
  font-weight: 700;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--warning-soft);
  color: var(--warning);
}
.ann__title {
  margin: 2px 0 6px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  overflow-wrap: anywhere;
}
.ann.is-compact .ann__title {
  font-size: 15px;
  margin-bottom: 2px;
}
.ann__img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  margin: 6px 0 10px;
  border: 1px solid var(--border);
}
.ann__text {
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.ann__body {
  color: var(--text);
  font-size: 14.5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.ann__body :deep(p) {
  margin: 0 0 10px;
}
.ann__body :deep(ul),
.ann__body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}
.ann__body :deep(li) {
  margin: 0 0 4px;
}
.ann__body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
.ann__body :deep(:last-child) {
  margin-bottom: 0;
}
.ann__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ann__actions:empty {
  display: none;
}

@media (max-width: 520px) {
  .ann {
    padding: 14px;
    gap: 12px;
  }
  .ann__icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>
