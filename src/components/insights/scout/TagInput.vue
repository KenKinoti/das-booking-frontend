<template>
  <div class="tags" :class="{ disabled }" @click="focus">
    <span v-for="(t, i) in modelValue" :key="t + i" class="tag">
      {{ label ? label(t) : t }}
      <button
        v-if="!disabled"
        type="button"
        class="x"
        :aria-label="'Remove ' + (label ? label(t) : t)"
        @click.stop="remove(i)"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
    <input
      v-if="!disabled"
      ref="inp"
      v-model="text"
      class="tags__input"
      type="text"
      :placeholder="modelValue.length ? '' : placeholder"
      :aria-label="ariaLabel || placeholder"
      :data-testid="testid"
      @keydown.enter.prevent="add"
      @keydown.tab="text.trim() && (add(), $event.preventDefault())"
      @keydown.backspace="!text && modelValue.length && remove(modelValue.length - 1)"
      @keyup="onComma"
      @blur="add"
    />
  </div>
</template>

<script>
// Chips with a free-text input: Enter, comma or leaving the field adds.
export default {
  name: 'TagInput',
  props: {
    modelValue: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Type and press Enter' },
    ariaLabel: { type: String, default: '' },
    max: { type: Number, default: 25 },
    maxLength: { type: Number, default: 60 },
    disabled: { type: Boolean, default: false },
    testid: { type: String, default: undefined },
    label: { type: Function, default: null },
    normalize: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  data() {
    return { text: '' }
  },
  methods: {
    focus() {
      this.$refs.inp?.focus()
    },
    onComma(e) {
      if (e.key === ',' || this.text.includes(',')) this.add()
    },
    add() {
      const parts = this.text
        .split(',')
        .map((s) => s.trim().slice(0, this.maxLength))
        .filter(Boolean)
      this.text = ''
      if (!parts.length) return
      const out = [...this.modelValue]
      for (let p of parts) {
        if (this.normalize) p = this.normalize(p)
        if (!p || out.length >= this.max) continue
        if (!out.some((x) => String(x).toLowerCase() === String(p).toLowerCase())) out.push(p)
      }
      this.$emit('update:modelValue', out)
    },
    remove(i) {
      const out = [...this.modelValue]
      out.splice(i, 1)
      this.$emit('update:modelValue', out)
    },
  },
}
</script>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 38px;
  padding: 5px 8px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: text;
}

.tags:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.tags.disabled {
  background: var(--bg-subtle);
  cursor: default;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 12.5px;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.disabled .tag {
  padding-right: 9px;
}

.x {
  border: 0;
  background: transparent;
  color: var(--text-3);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
}

.x:hover {
  color: var(--text);
  background: var(--surface);
}

.tags__input {
  flex: 1;
  min-width: 120px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  padding: 3px 2px;
}
</style>
