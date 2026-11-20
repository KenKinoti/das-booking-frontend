<template>
  <!-- A section of the match page: always open on wider screens, collapsible on phones. -->
  <section :id="id" class="fb-panel fbsec" :class="{ 'is-closed': phone && !open }" :data-section="id" :aria-labelledby="id + '-h'">
    <header class="fb-panel__head fbsec__head">
      <div class="fbsec__titles">
        <h2 :id="id + '-h'">
          <button v-if="phone" type="button" class="fbsec__toggle" :aria-expanded="open" :aria-controls="id + '-b'" @click="open = !open">
            <span>{{ title }}</span><i class="fa-solid fa-chevron-down" :class="{ 'is-open': open }"></i>
          </button>
          <template v-else>{{ title }}</template>
        </h2>
        <p v-if="subtitle && (!phone || open)">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions && (!phone || open)" class="fbsec__actions"><slot name="actions" /></div>
    </header>
    <div v-show="!phone || open" :id="id + '-b'" class="fb-panel__body">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'FbSection',
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    openOnPhone: { type: Boolean, default: false }
  },
  data() {
    return { phone: false, open: this.openOnPhone, mq: null }
  },
  mounted() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mq = window.matchMedia('(max-width: 640px)')
      this.phone = this.mq.matches
      this.mq.addEventListener?.('change', this.onMq)
    }
  },
  beforeUnmount() {
    this.mq?.removeEventListener?.('change', this.onMq)
  },
  methods: {
    onMq(e) {
      this.phone = e.matches
    },
    reveal() {
      this.open = true
    }
  }
}
</script>

<style scoped>
.fbsec {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 64px);
}
.fbsec__head h2 {
  margin: 0;
}
.fbsec__titles {
  min-width: 0;
  flex: 1 1 auto;
}
.fbsec__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.fbsec__toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.fbsec__toggle i {
  font-size: 12px;
  color: var(--text-3);
  transition: transform 0.15s;
}
.fbsec__toggle i.is-open {
  transform: rotate(180deg);
}
.fbsec.is-closed .fb-panel__head {
  padding-bottom: 14px;
}
</style>
