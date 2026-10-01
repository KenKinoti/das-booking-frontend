<template>
  <section class="ui-card imp-card" data-testid="imported-card">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-file-import imp-ico"></i> {{ doc.source === 'zoho' ? 'Imported from Zoho Books' : 'Imported from a file' }}</h2>
    </div>
    <div class="ui-card__body imp-body">
      <dl v-if="credits || writeOff" class="imp-dl">
        <div v-if="credits"><dt>Credits applied</dt><dd class="tabular">{{ money(credits) }}</dd></div>
        <div v-if="writeOff"><dt>Written off</dt><dd class="tabular">{{ money(writeOff) }}</dd></div>
      </dl>
      <p v-if="doc.import_flag" class="imp-flag"><i class="fa-solid fa-circle-info"></i> <span>{{ doc.import_flag }}.</span></p>
      <div class="imp-actions">
        <a v-for="a in originals" :key="a.id" class="ui-btn ui-btn--sm" :href="a.url" target="_blank" rel="noopener" data-testid="original-pdf">
          <i class="fa-regular fa-file-pdf"></i> Original from {{ doc.source === 'zoho' ? 'Zoho' : 'import' }}
        </a>
        <a v-if="safeExternal" class="ui-btn ui-btn--ghost ui-btn--sm" :href="safeExternal" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Zoho</a>
      </div>
      <p v-if="loading" class="muted small">Loading the original…</p>
      <p v-else-if="!originals.length && doc.source === 'zoho'" class="muted small">The original PDF was not imported for this document.</p>
    </div>
  </section>
</template>

<script>
import { importsApi } from '@/services/imports'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'ImportedDocCard',
  props: { doc: { type: Object, required: true } },
  data() {
    return { originals: [], loading: false }
  },
  computed: {
    credits() {
      return Number(this.doc.credits_applied || 0)
    },
    writeOff() {
      return Number(this.doc.write_off_amount || 0)
    },
    safeExternal() {
      const u = this.doc.external_url || ''
      return /^https:\/\//i.test(u) ? u : ''
    }
  },
  watch: {
    'doc.id'() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    this.revoke()
  },
  methods: {
    money(v) {
      return formatCurrency(v, this.doc.currency)
    },
    revoke() {
      for (const a of this.originals) URL.revokeObjectURL(a.url)
      this.originals = []
    },
    async load() {
      this.revoke()
      this.loading = true
      try {
        const list = (await importsApi.attachments(this.doc.id)) || []
        const out = []
        for (const a of list.filter((x) => x.kind === 'original')) {
          const blob = await importsApi.attachmentBlob(this.doc.id, a.id)
          out.push({ id: a.id, name: a.name, url: URL.createObjectURL(new Blob([blob], { type: a.content_type || 'application/pdf' })) })
        }
        this.originals = out
      } catch {
        this.originals = []
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.imp-ico {
  color: var(--info);
  margin-right: 4px;
}
.imp-body {
  display: grid;
  gap: 10px;
}
.imp-dl {
  margin: 0;
  display: grid;
  gap: 6px;
}
.imp-dl > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.imp-dl dt {
  color: var(--text-2);
}
.imp-dl dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.imp-flag {
  margin: 0;
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-2);
  background: var(--info-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}
.imp-flag i {
  color: var(--info);
  margin-top: 2px;
}
.imp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
