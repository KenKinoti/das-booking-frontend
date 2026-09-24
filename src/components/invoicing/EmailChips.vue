<template>
  <div class="chips-wrap">
  <div class="chips-field" :class="{ 'is-invalid': !!error, 'is-disabled': disabled }" @click="focus">
    <span v-for="e in modelValue" :key="e" class="echip" :class="{ 'echip--primary': primary }" :title="labelFor(e) ? `${labelFor(e)} <${e}>` : e">
      <i v-if="icon" :class="icon" aria-hidden="true"></i>
      <span class="echip__text">
        <template v-if="labelFor(e)"><strong>{{ labelFor(e) }}</strong> <span class="echip__mail">{{ e }}</span></template>
        <template v-else>{{ e }}</template>
      </span>
      <button v-if="!disabled" type="button" class="echip__x" :aria-label="`Remove ${e}`" @click.stop="remove(e)"><i class="fa-solid fa-xmark"></i></button>
    </span>
    <input
      v-if="!disabled && (!max || modelValue.length < max)"
      ref="input"
      v-model="draft"
      :id="id"
      class="chips-field__input"
      type="email"
      :placeholder="modelValue.length ? addPlaceholder : placeholder"
      :aria-label="ariaLabel"
      autocomplete="off"
      @keydown="onKey"
      @blur="commit"
      @paste="onPaste"
    />
  </div>
  <p v-if="error" class="chips-error" role="alert">{{ error }}</p>
  </div>
</template>

<script>
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

export default {
  name: 'EmailChips',
  props: {
    modelValue: { type: Array, default: () => [] },
    names: { type: Object, default: () => ({}) },
    id: { type: String, default: undefined },
    placeholder: { type: String, default: 'Add email addresses' },
    addPlaceholder: { type: String, default: 'Add another…' },
    ariaLabel: { type: String, default: 'Email addresses' },
    exclude: { type: Array, default: () => [] },
    icon: { type: String, default: '' },
    primary: { type: Boolean, default: false },
    max: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  data() {
    return { draft: '', error: '' }
  },
  methods: {
    labelFor(e) {
      return this.names[e] || ''
    },
    focus() {
      this.$refs.input?.focus()
    },
    add(list) {
      const next = [...this.modelValue]
      const bad = []
      for (const raw of list) {
        const e = raw.trim().toLowerCase()
        if (!e) continue
        if (!EMAIL.test(e)) {
          bad.push(raw.trim())
          continue
        }
        if (next.includes(e) || this.exclude.map((x) => String(x).toLowerCase()).includes(e)) continue
        if (this.max && next.length >= this.max) break
        next.push(e)
      }
      this.error = bad.length ? `“${bad.join('”, “')}” ${bad.length > 1 ? "aren't valid email addresses" : "isn't a valid email address"}` : ''
      if (next.length !== this.modelValue.length) this.$emit('update:modelValue', next)
      return !bad.length
    },
    commit() {
      if (!this.draft.trim()) {
        this.error = ''
        return
      }
      if (this.add(this.draft.split(/[\s,;]+/))) this.draft = ''
    },
    onKey(e) {
      if (['Enter', ',', ';', 'Tab'].includes(e.key) && this.draft.trim()) {
        if (e.key !== 'Tab') e.preventDefault()
        this.commit()
      } else if (e.key === 'Backspace' && !this.draft && this.modelValue.length) {
        this.remove(this.modelValue[this.modelValue.length - 1])
      }
    },
    onPaste(e) {
      const text = e.clipboardData?.getData('text') || ''
      if (/[\s,;]/.test(text.trim())) {
        e.preventDefault()
        const parts = text.split(/[\s,;]+/)
        if (this.add(parts)) this.draft = ''
        else this.draft = parts.filter((p) => p && !EMAIL.test(p.trim())).join(' ')
      }
    },
    remove(e) {
      this.$emit(
        'update:modelValue',
        this.modelValue.filter((x) => x !== e)
      )
    }
  }
}
</script>

<style scoped>
.chips-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: text;
}

.chips-field:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.chips-field.is-invalid {
  border-color: var(--danger);
}

.chips-field.is-disabled {
  background: var(--surface-2);
  cursor: default;
}

.chips-field input.chips-field__input {
  flex: 1;
  min-width: 140px;
  min-height: 0;
  height: auto;
  border: 0;
  outline: 0;
  box-shadow: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  padding: 3px 2px;
}

.echip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 2px 4px 2px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 12.5px;
  line-height: 20px;
}

.echip--primary {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
}

.echip > i {
  font-size: 11px;
  opacity: 0.8;
}

.echip__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.echip__text strong {
  font-weight: 600;
}

.echip__mail {
  color: var(--text-3);
}

.echip--primary .echip__mail {
  color: inherit;
  opacity: 0.8;
}

.echip__x {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}

.echip__x:hover {
  opacity: 1;
  background: var(--surface-hover);
}

.chips-error {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--danger);
}
</style>
