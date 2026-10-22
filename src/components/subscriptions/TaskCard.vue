<template>
  <article class="task" :class="[`task--${task.kind}`, `is-${task.status}`]" :data-testid="`task-${task.kind}`">
    <header class="task__head">
      <span class="task__icon" aria-hidden="true"><i :class="meta.icon"></i></span>
      <div class="task__title">
        <strong>{{ task.title || meta.label }}</strong>
        <small>
          <template v-if="showSubscription">{{ task.customer_name }} · {{ task.subscription_number }} · </template>{{ task.service }}
          <template v-if="task.supplier_plan"> · {{ task.supplier_plan }}</template>
          <template v-if="task.automated"> · done through the Synergy Wholesale API</template>
        </small>
      </div>
      <span class="ui-badge" :class="{ open: 'ui-badge--warning', done: 'ui-badge--success', dismissed: 'ui-badge--draft' }[task.status]">{{ { open: 'To do', done: task.automated ? 'Done (API)' : 'Done', dismissed: 'Not needed' }[task.status] }}</span>
    </header>
    <ol v-if="!task.automated" class="task__steps">
      <li v-for="(s, i) in task.steps" :key="i">{{ s }}</li>
    </ol>
    <p v-if="task.note" class="task__note"><i class="fa-regular fa-note-sticky"></i> {{ task.note }}</p>
    <footer class="task__foot">
      <small>{{ task.status === 'open' ? `Since ${date(task.due_date)}` : `${task.automated ? 'Done automatically' : 'Closed'} ${date(task.done_at)}` }}</small>
      <span class="task__btns">
        <router-link v-if="showSubscription" :to="{ path: '/subscriptions', query: { sub: task.subscription_id } }" class="ui-btn ui-btn--sm ui-btn--ghost">Open subscription</router-link>
        <template v-if="task.status === 'open'">
          <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" @click="set('dismissed')">Not needed</button>
          <button type="button" class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy" data-testid="task-done" @click="set('done')"><i class="fa-solid fa-check"></i> Mark done</button>
        </template>
        <button v-else type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="busy" @click="set('open')">Reopen</button>
      </span>
    </footer>
  </article>
</template>

<script>
import { subscriptionsApi, TASK_KINDS, supplierLabel } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

export default {
  name: 'TaskCard',
  props: {
    task: { type: Object, required: true },
    showSubscription: { type: Boolean, default: false }
  },
  emits: ['changed'],
  data() {
    return { busy: false }
  },
  computed: {
    meta() {
      return TASK_KINDS[this.task.kind] || { label: this.task.kind, icon: 'fa-solid fa-list-check' }
    },
    supplier() {
      return supplierLabel(this.task.supplier)
    }
  },
  methods: {
    date(d) {
      return formatDate(d)
    },
    async set(status) {
      this.busy = true
      try {
        await subscriptionsApi.updateTask(this.task.id, status, '')
        toast.success(status === 'done' ? `${this.meta.label}: done` : status === 'open' ? 'Task reopened' : 'Task closed')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the task'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.task {
  border: 1px solid var(--border);
  border-left: 4px solid var(--warning);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 12px 14px;
  margin-bottom: 12px;
}
.task--suspend {
  border-left-color: var(--danger);
}
.task--restore {
  border-left-color: var(--success);
}
.task.is-done,
.task.is-dismissed {
  opacity: 0.75;
}
.task__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.task__icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--warning-soft);
  color: var(--warning);
}
.task--suspend .task__icon {
  background: var(--danger-soft);
  color: var(--danger);
}
.task--restore .task__icon {
  background: var(--success-soft);
  color: var(--success);
}
.task__title {
  flex: 1;
  min-width: 0;
}
.task__title small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}
.task__steps {
  margin: 10px 0 6px;
  padding-left: 22px;
  font-size: 13.5px;
  line-height: 1.55;
}
.task__note {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-2);
}
.task__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.task__foot small {
  color: var(--text-3);
}
.task__btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
