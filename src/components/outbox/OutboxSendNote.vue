<template>
  <!-- Pending review (v2.19): what happens when you press Send — and, for admins, "Send now — I've reviewed it". -->
  <div v-if="on" class="obn" :class="{ 'is-now': modelValue, 'is-compact': compact }" data-testid="outbox-note" :data-send-now="modelValue ? '1' : '0'">
    <span class="obn__icon" aria-hidden="true"><i :class="modelValue ? 'fa-solid fa-paper-plane' : 'fa-solid fa-inbox'"></i></span>
    <div class="obn__text">
      <strong v-if="!modelValue">{{ title || (scheduled ? 'When it’s time, this waits in Pending review' : 'This will wait in Pending review') }}</strong>
      <strong v-else>{{ scheduled ? 'Approved now — it goes out at its time' : 'This goes to the client as soon as you send it' }}</strong>
      <span v-if="!modelValue">
        {{ waitText }}
        <router-link to="/outbox" class="obn__link" data-testid="outbox-note-link" @click="$emit('navigate')">Open Pending review</router-link>
      </span>
      <span v-else>You’re confirming you have checked {{ thing }} yourself — it skips Pending review.</span>
      <label v-if="canSendNow && allowNow" class="obn__check" data-testid="outbox-send-now-label">
        <input :checked="modelValue" type="checkbox" data-testid="outbox-send-now" @change="$emit('update:modelValue', $event.target.checked)" />
        <span>{{ scheduled ? 'Approve it now — I’ve reviewed it' : 'Send now — I’ve reviewed it' }}</span>
      </label>
    </div>
  </div>
</template>

<script>
import { outbox, ensureOutboxMe, reviewOn } from './outboxState'

/**
 * The note every Send dialog / composer that writes to clients shows (pkg/outbox):
 *   <OutboxSendNote v-model="sendNow" thing="this email" />
 * Staff always wait; people who may approve (outbox.approve) see the checkbox when the organisation
 * allows "admins can send at once". Hidden when the organisation switched review off.
 */
export default {
  name: 'OutboxSendNote',
  props: {
    modelValue: { type: Boolean, default: false },
    thing: { type: String, default: 'this message' },
    scheduled: { type: Boolean, default: false }, // a scheduled / recurring send: each send waits when its time comes
    compact: { type: Boolean, default: false },
    allowNow: { type: Boolean, default: true }, // false: no "Send now" tick here (e.g. repeating schedules always wait)
    title: { type: String, default: '' } // replaces the "This will wait in Pending review" line
  },
  emits: ['update:modelValue', 'navigate'],
  computed: {
    me() {
      return outbox.me
    },
    on() {
      return reviewOn()
    },
    canSendNow() {
      return !!this.me?.can_send_now
    },
    waitText() {
      if (this.me?.can_approve) return this.scheduled ? 'Each send is checked by you (or another admin) before it reaches the client — nothing goes out unapproved.' : 'Nothing reaches the client until you (or another admin) approve it. You can still edit it there.'
      return 'An owner or admin checks it before it reaches the client. You’ll see it in Pending review until then.'
    }
  },
  watch: {
    on(v) {
      if (!v && this.modelValue) this.$emit('update:modelValue', false)
    },
    allowNow(v) {
      if (!v && this.modelValue) this.$emit('update:modelValue', false)
    }
  },
  created() {
    ensureOutboxMe()
  }
}
</script>

<style scoped>
.obn {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid color-mix(in srgb, var(--warning) 45%, var(--border));
  background: var(--warning-soft);
  color: var(--text);
}
.obn.is-now {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: var(--accent-soft);
}
.obn__icon {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--warning);
  font-size: 14px;
}
.obn.is-now .obn__icon {
  color: var(--accent);
}
.obn__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  font-size: 13px;
  color: var(--text-2);
}
.obn__text strong {
  color: var(--text);
  font-size: 13.5px;
}
.obn__link {
  margin-left: 4px;
  white-space: nowrap;
}
.obn__check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  min-height: 36px;
  padding: 4px 12px 4px 10px;
  align-self: flex-start;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.obn__check input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.obn.is-compact {
  padding: 10px 12px;
}
.obn.is-compact .obn__icon {
  width: 28px;
  height: 28px;
}
@media (max-width: 640px) {
  .obn__check {
    min-height: 44px;
    width: 100%;
  }
  .obn__check input {
    width: 22px;
    height: 22px;
  }
}
</style>
