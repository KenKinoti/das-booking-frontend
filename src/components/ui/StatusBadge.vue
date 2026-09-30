<template>
  <span
    class="status-badge"
    :class="[`is-${meta.tone}`, { 'is-strike': meta.strike && strike, 'is-sm': size === 'sm', 'is-dot': dot }]"
    :title="tooltip"
    :aria-label="ariaLabel"
    role="status"
  >
    <i v-if="!dot && showIcon" :class="meta.icon" aria-hidden="true"></i>
    <span class="status-badge__label">{{ text }}</span>
  </span>
</template>

<script>
import { statusInfo } from '@/utils/statuses'

/**
 * <StatusBadge domain="booking" :status="b.status" />
 * Props: domain (see utils/statuses.js STATUS_DOMAINS), status, label
 * (override text), hint (override tooltip), size ('sm'), dot (compact dot +
 * label, no icon), icon (false hides the icon), strike (false disables the
 * struck-through look for void-like states).
 */
export default {
  name: 'StatusBadge',
  props: {
    status: { type: String, default: '' },
    domain: { type: String, default: '' },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    size: { type: String, default: '' },
    dot: { type: Boolean, default: false },
    icon: { type: Boolean, default: true },
    strike: { type: Boolean, default: true }
  },
  computed: {
    meta() {
      return statusInfo(this.domain, this.status)
    },
    text() {
      return this.label || this.meta.label
    },
    showIcon() {
      return this.icon && !!this.meta.icon
    },
    tooltip() {
      return this.hint || this.meta.hint || this.text
    },
    ariaLabel() {
      const h = this.hint || this.meta.hint
      return h ? `Status: ${this.text}. ${h}` : `Status: ${this.text}`
    }
  }
}
</script>

<style>
.status-badge {
  --tone: var(--text-2);
  --tone-bg: var(--neutral-soft);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  max-width: 100%;
  padding: 0 10px 0 8px;
  border-radius: 999px;
  background: var(--tone-bg);
  color: var(--tone);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
  cursor: default;
}

.status-badge > i {
  font-size: 11px;
  width: 12px;
  text-align: center;
}

.status-badge__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge.is-info { --tone: var(--info); --tone-bg: var(--info-soft); }
.status-badge.is-accent { --tone: var(--accent); --tone-bg: var(--accent-soft); }
.status-badge.is-success { --tone: var(--success); --tone-bg: var(--success-soft); }
.status-badge.is-warning { --tone: var(--warning); --tone-bg: var(--warning-soft); }
.status-badge.is-danger { --tone: var(--danger); --tone-bg: var(--danger-soft); }
.status-badge.is-muted { --tone: var(--text-3); --tone-bg: var(--neutral-soft); }
.status-badge.is-strike .status-badge__label { text-decoration: line-through; }

.status-badge.is-sm {
  height: 20px;
  padding: 0 8px 0 6px;
  font-size: 11px;
  gap: 5px;
}

.status-badge.is-sm > i {
  font-size: 10px;
}

.status-badge.is-dot {
  padding-left: 9px;
}

.status-badge.is-dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
