<template>
  <div class="rte" :class="{ 'is-focus': focused, 'is-invalid': invalid }">
    <div class="rte__bar" role="toolbar" :aria-label="`${label} formatting`">
      <button v-for="b in buttons" :key="b.cmd" type="button" class="rte__btn" :class="{ 'is-on': active[b.cmd] }" :title="b.title" :aria-label="b.title" :aria-pressed="!!active[b.cmd]" @mousedown.prevent @click="exec(b.cmd)">
        <i :class="b.icon"></i>
      </button>
      <span class="rte__sep" aria-hidden="true"></span>
      <button type="button" class="rte__btn" :class="{ 'is-on': linkOpen }" title="Add a link" aria-label="Add a link" @mousedown.prevent @click="openLink"><i class="fa-solid fa-link"></i></button>
      <button type="button" class="rte__btn" title="Remove link" aria-label="Remove link" @mousedown.prevent @click="exec('unlink')"><i class="fa-solid fa-link-slash"></i></button>
      <button type="button" class="rte__btn" title="Clear formatting" aria-label="Clear formatting" @mousedown.prevent @click="clearFormat"><i class="fa-solid fa-text-slash"></i></button>
      <slot name="extra" />
    </div>
    <div v-if="linkOpen" class="rte__link">
      <input ref="linkInput" v-model="linkUrl" class="ui-input" type="text" placeholder="https://… or an in-app page like /plan" aria-label="Link address" @keydown.enter.prevent="applyLink" @keydown.esc.prevent="linkOpen = false" />
      <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" @click="applyLink">Add link</button>
      <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="linkOpen = false">Cancel</button>
      <span v-if="linkError" class="rte__err">{{ linkError }}</span>
    </div>
    <div
      ref="ed"
      class="rte__ed"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="label"
      :data-placeholder="placeholder"
      @input="onInput"
      @paste="onPaste"
      @focus="focused = true"
      @blur="onBlur"
      @keyup="sync"
      @mouseup="sync"
      @keydown="onKey"
    ></div>
  </div>
</template>

<script>
import { safeLink } from '@/utils/richtext'

/**
 * A small rich-text editor for announcements: paragraphs, bold, italic,
 * bullet and numbered lists and links. Pasted content arrives as plain text;
 * the server keeps only these elements anyway.
 */
export default {
  name: 'RichTextEditor',
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: 'Message' },
    placeholder: { type: String, default: 'Write your message…' },
    invalid: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'edited'],
  data() {
    return {
      focused: false,
      active: {},
      linkOpen: false,
      linkUrl: 'https://',
      linkError: '',
      saved: null,
      last: '',
      buttons: [
        { cmd: 'bold', icon: 'fa-solid fa-bold', title: 'Bold (Ctrl+B)' },
        { cmd: 'italic', icon: 'fa-solid fa-italic', title: 'Italic (Ctrl+I)' },
        { cmd: 'insertUnorderedList', icon: 'fa-solid fa-list-ul', title: 'Bullet list' },
        { cmd: 'insertOrderedList', icon: 'fa-solid fa-list-ol', title: 'Numbered list' }
      ]
    }
  },
  watch: {
    modelValue(v) {
      if (v !== this.last) this.setHtml(v)
    }
  },
  mounted() {
    this.setHtml(this.modelValue)
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      /* older browsers */
    }
  },
  methods: {
    setHtml(v) {
      const el = this.$refs.ed
      if (!el) return
      el.innerHTML = v || ''
      this.last = v || ''
    },
    emit() {
      const html = this.$refs.ed.innerHTML
      this.last = html
      this.$emit('update:modelValue', html)
    },
    onInput() {
      this.emit()
      this.$emit('edited')
      this.sync()
    },
    onBlur() {
      this.focused = false
    },
    onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        this.openLink()
      }
    },
    sync() {
      const st = {}
      for (const b of this.buttons) {
        try {
          st[b.cmd] = document.queryCommandState(b.cmd)
        } catch {
          st[b.cmd] = false
        }
      }
      this.active = st
    },
    focus() {
      this.$refs.ed?.focus()
    },
    exec(cmd, arg = null) {
      this.restore()
      this.$refs.ed.focus()
      try {
        document.execCommand(cmd, false, arg)
      } catch {
        /* unsupported command */
      }
      this.emit()
      this.$emit('edited')
      this.sync()
    },
    clearFormat() {
      this.exec('removeFormat')
      this.exec('unlink')
    },
    saveSelection() {
      const sel = window.getSelection()
      if (sel && sel.rangeCount && this.$refs.ed.contains(sel.anchorNode)) this.saved = sel.getRangeAt(0).cloneRange()
    },
    restore() {
      if (!this.saved) return
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(this.saved)
      this.saved = null
    },
    openLink() {
      this.saveSelection()
      this.linkError = ''
      this.linkUrl = 'https://'
      this.linkOpen = true
      this.$nextTick(() => this.$refs.linkInput?.select())
    },
    applyLink() {
      const url = safeLink(this.linkUrl)
      if (!url) {
        this.linkError = 'Use an https:// address, mailto: or an in-app page starting with /'
        return
      }
      const range = this.saved
      this.linkOpen = false
      if (range && range.collapsed) {
        // No text selected: insert the address itself as the link.
        this.restore()
        this.$refs.ed.focus()
        document.execCommand('insertHTML', false, `<a href="${url.replace(/"/g, '&quot;')}">${url.replace(/</g, '&lt;')}</a>&nbsp;`)
        this.emit()
        this.$emit('edited')
        return
      }
      this.exec('createLink', url)
    },
    onPaste(e) {
      const text = e.clipboardData?.getData('text/plain')
      if (text == null) return
      e.preventDefault()
      const html = text
        .replace(/\r\n?/g, '\n')
        .split(/\n{2,}/)
        .map((p) => '<p>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>')
        .join('')
      document.execCommand(text.includes('\n') ? 'insertHTML' : 'insertText', false, text.includes('\n') ? html : text)
      this.emit()
      this.$emit('edited')
    }
  }
}
</script>

<style scoped>
.rte {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition: border-color 0.15s, box-shadow 0.15s;
  min-width: 0;
}
.rte.is-focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.rte.is-invalid {
  border-color: var(--danger);
}
.rte__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
.rte__btn {
  width: 32px;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.rte__btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.rte__btn.is-on {
  background: var(--accent-soft);
  color: var(--accent);
}
.rte__sep {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}
.rte__link {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border);
}
.rte__link .ui-input {
  flex: 1 1 220px;
  min-width: 0;
}
.rte__err {
  flex-basis: 100%;
  font-size: 12.5px;
  color: var(--danger);
}
.rte__ed {
  min-height: 150px;
  max-height: 420px;
  overflow-y: auto;
  padding: 12px 14px;
  color: var(--text);
  font-size: 14.5px;
  line-height: 1.6;
  outline: none;
  overflow-wrap: anywhere;
}
.rte__ed:empty::before {
  content: attr(data-placeholder);
  color: var(--text-3);
  pointer-events: none;
}
.rte__ed :deep(p),
.rte__ed :deep(div) {
  margin: 0 0 10px;
}
.rte__ed :deep(ul),
.rte__ed :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}
.rte__ed :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
</style>
