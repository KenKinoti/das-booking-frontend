<template>
  <transition name="wn">
    <aside v-if="visible" class="wn" role="status" aria-live="polite">
      <div class="wn__badge" aria-hidden="true"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
      <div class="wn__body">
        <div class="wn__title">
          <strong>What’s new in {{ versionShort }}</strong>
          <span class="wn__pill">{{ versionLabel }}</span>
        </div>
        <p class="wn__lead">{{ lead }}</p>
        <ul class="wn__list">
          <li v-for="h in highlights" :key="h.text"><i :class="h.icon"></i><span>{{ h.text }}</span></li>
        </ul>
      </div>
      <div class="wn__actions">
        <router-link to="/faq#about" class="ui-btn ui-btn--sm" @click="dismiss">See all changes</router-link>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon wn__close" aria-label="Dismiss what’s new" title="Dismiss" @click="dismiss">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </aside>
  </transition>
</template>

<script>
import { APP_NAME } from '@/config'
import { VERSION_LABEL, VERSION_SHORT, RELEASE_HIGHLIGHTS, RELEASE_LEAD } from '@/version'

const KEY = 'whatsnew.dismissed'

export default {
  name: 'WhatsNew',
  data() {
    let dismissed = ''
    try {
      dismissed = localStorage.getItem(KEY) || ''
    } catch {
      dismissed = ''
    }
    return {
      visible: dismissed !== VERSION_SHORT,
      appName: APP_NAME,
      versionLabel: VERSION_LABEL,
      versionShort: VERSION_SHORT,
      highlights: RELEASE_HIGHLIGHTS,
      lead: RELEASE_LEAD
    }
  },
  methods: {
    dismiss() {
      this.visible = false
      try {
        // Remembered per release family, so the next release shows its own notice
        localStorage.setItem(KEY, VERSION_SHORT)
      } catch {
        /* private mode — the notice simply shows again next visit */
      }
    }
  }
}
</script>

<style scoped>
.wn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0 0 20px;
  padding: 14px 14px 14px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  background: color-mix(in srgb, var(--accent-soft) 70%, var(--surface));
  box-shadow: var(--shadow-xs);
}

.wn__badge {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 14px;
}

.wn__body {
  flex: 1;
  min-width: 0;
}

.wn__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 14.5px;
}

.wn__pill {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wn__lead {
  margin: 2px 0 0;
  color: var(--text-2);
  font-size: 13.5px;
}

.wn__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 18px;
  font-size: 13px;
  color: var(--text-2);
}

.wn__list li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.wn__list i {
  width: 14px;
  text-align: center;
  color: var(--accent);
  font-size: 12px;
}

.wn__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.wn-enter-active,
.wn-leave-active {
  transition: opacity 0.18s, transform 0.18s var(--ease);
}

.wn-enter-from,
.wn-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 760px) {
  .wn {
    flex-wrap: wrap;
    position: relative;
    padding: 14px;
  }
  .wn__badge {
    width: 32px;
    height: 32px;
  }
  .wn__body {
    flex-basis: calc(100% - 90px);
  }
  .wn__list {
    display: none;
  }
  .wn__actions {
    width: 100%;
  }
  .wn__actions .ui-btn:not(.wn__close) {
    flex: 1;
  }
  .wn__close {
    position: absolute;
    top: 8px;
    right: 8px;
  }
  .wn__title {
    padding-right: 36px;
  }
}
</style>
