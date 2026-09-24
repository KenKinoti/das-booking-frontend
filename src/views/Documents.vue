<template>
  <div class="ui-page ui-page--wide" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDropFiles">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Documents</div>
        <h1>Documents</h1>
        <p>Contracts, certificates, policies and other files, stored securely with your organisation's data.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--primary" @click="pickFiles"><i class="fa-solid fa-cloud-arrow-up"></i> Upload files</button>
        <input ref="fileInput" type="file" multiple hidden @change="onPicked" />
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': !expiring && !category && !kind }" @click="resetFilters">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-folder-open"></i></span>Documents</div>
        <div class="ui-kpi__value"><span v-if="!stats" class="ui-skeleton sk-val"></span><template v-else>{{ stats.total }}</template></div>
        <div class="ui-kpi__meta">{{ stats ? bytes(stats.total_size) : '—' }} stored</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-clock-rotate-left"></i></span>Added this week</div>
        <div class="ui-kpi__value"><span v-if="!stats" class="ui-skeleton sk-val"></span><template v-else>{{ stats.uploaded_this_week }}</template></div>
        <div class="ui-kpi__meta">Last 7 days</div>
      </div>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': expiring }" @click="toggleExpiring">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-hourglass-half"></i></span>Expiring soon</div>
        <div class="ui-kpi__value"><span v-if="!stats" class="ui-skeleton sk-val"></span><template v-else>{{ stats.expiring_soon }}</template></div>
        <div class="ui-kpi__meta">Within 30 days · click to filter</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': expiring }" @click="toggleExpiring">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>Expired</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': stats?.expired }"><span v-if="!stats" class="ui-skeleton sk-val"></span><template v-else>{{ stats.expired }}</template></div>
        <div class="ui-kpi__meta">Need renewing</div>
      </button>
    </div>

    <section class="ui-card" :class="{ 'is-dragover': dragDepth > 0 }">
      <div class="toolbar">
        <div class="ui-tabs cats" role="tablist">
          <button class="ui-tab" :class="{ 'is-active': !category }" role="tab" :aria-selected="!category" @click="setCategory('')">All <span class="count">{{ stats?.total ?? 0 }}</span></button>
          <button v-for="c in topCategories" :key="c.category" class="ui-tab" :class="{ 'is-active': category === c.category }" role="tab" :aria-selected="category === c.category" @click="setCategory(c.category)">
            {{ catLabel(c.category) }} <span class="count">{{ c.count }}</span>
          </button>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search title, file name…" aria-label="Search documents" @input="debouncedLoad" />
          </div>
          <select v-model="kind" class="ui-select sel" aria-label="File type" @change="reload">
            <option value="">All file types</option>
            <option value="pdf">PDF</option>
            <option value="image">Images</option>
            <option value="word">Documents</option>
            <option value="sheet">Spreadsheets</option>
          </select>
          <select v-model="sort" class="ui-select sel" aria-label="Sort" @change="reload">
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Title A–Z</option>
            <option value="size">Largest first</option>
            <option value="expiry">Expiry date</option>
          </select>
        </div>
      </div>

      <div v-if="expiring" class="filter-note">
        <i class="fa-solid fa-filter"></i> Showing documents expired or expiring within 30 days
        <button class="link-btn" @click="toggleExpiring">Clear</button>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !docs.length" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 36px; height: 36px; border-radius: 10px"></div>
          <div class="ui-skeleton" style="flex: 2"></div>
          <div class="ui-skeleton" style="width: 100px"></div>
          <div class="ui-skeleton" style="width: 80px"></div>
        </div>
      </div>

      <div v-else-if="!docs.length" class="ui-empty dropzone" @click="hasFilters ? null : pickFiles()">
        <div class="ui-empty__icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
        <h3>{{ hasFilters ? 'No documents match your filters' : 'Drop files here to upload' }}</h3>
        <p>{{ hasFilters ? 'Try a different search, category or file type.' : 'Or click to choose files. Up to 10 MB each: PDFs, images, Office documents and more.' }}</p>
        <button v-if="hasFilters" class="ui-btn" style="margin-top: 14px" @click.stop="resetFilters">Clear filters</button>
      </div>

      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Document</th>
              <th class="hide-sm">Category</th>
              <th class="num hide-md">Size</th>
              <th class="hide-lg">Uploaded by</th>
              <th class="hide-md">Added</th>
              <th class="hide-sm">Expiry</th>
              <th class="actions-col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in docs" :key="d.id" class="is-clickable" @click="preview(d)">
              <td>
                <div class="doc">
                  <span class="doc__icon" :class="`k-${kindOf(d)}`"><i :class="iconOf(d)"></i></span>
                  <span class="doc__text">
                    <span class="doc__title">{{ d.title }}</span>
                    <small>{{ d.original_filename }}<template v-if="d.description"> · {{ d.description }}</template></small>
                  </span>
                </div>
              </td>
              <td class="hide-sm"><span class="cat-pill">{{ catLabel(d.category) }}</span></td>
              <td class="num hide-md muted">{{ bytes(d.file_size) }}</td>
              <td class="hide-lg muted">{{ uploader(d) }}</td>
              <td class="hide-md muted nowrap">{{ date(d.created_at) }}</td>
              <td class="hide-sm nowrap">
                <template v-if="d.expiry_date">
                  <span class="ui-badge" :class="expiryBadge(d)">{{ expiryText(d) }}</span>
                </template>
                <span v-else class="muted">—</span>
              </td>
              <td class="actions-col" @click.stop>
                <div class="row-actions">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon hide-sm" title="Preview" aria-label="Preview" @click="preview(d)"><i class="fa-regular fa-eye"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Download" aria-label="Download" :disabled="busy === d.id" @click="download(d)">
                    <i :class="busy === d.id ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-download'"></i>
                  </button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit details" aria-label="Edit details" @click="openEdit(d)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger hide-sm" title="Delete" aria-label="Delete" @click="remove(d)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="pagination.total > perPage" class="pager">
        <span class="muted">{{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, pagination.total) }} of {{ pagination.total }}</span>
        <div class="ui-actions">
          <button class="ui-btn ui-btn--sm" :disabled="page <= 1" @click="go(page - 1)"><i class="fa-solid fa-chevron-left"></i> Prev</button>
          <button class="ui-btn ui-btn--sm" :disabled="page * perPage >= pagination.total" @click="go(page + 1)">Next <i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </footer>

      <div v-if="dragDepth > 0" class="drop-overlay"><i class="fa-solid fa-cloud-arrow-up"></i> Drop to upload</div>
    </section>

    <p class="storage-note"><i class="fa-solid fa-database"></i> Files are stored in your organisation's database, so they survive restarts and redeploys. Maximum 10 MB per file.</p>

    <!-- Upload modal -->
    <div v-if="queue.length" class="ui-modal-backdrop" @mousedown.self="closeUpload">
      <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-label="Upload documents" @submit.prevent="uploadAll">
        <div class="ui-modal__head">
          <div>
            <h2>Upload {{ queue.length }} file{{ queue.length === 1 ? '' : 's' }}</h2>
            <p class="sub">Give each file a clear title and category so it's easy to find later.</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" :disabled="uploading" @click="closeUpload"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="bulk">
            <div class="ui-field">
              <label for="bulk-cat">Category for all</label>
              <select id="bulk-cat" v-model="bulkCategory" class="ui-select" :disabled="uploading" @change="applyBulk">
                <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="bulk-exp">Expiry for all (optional)</label>
              <input id="bulk-exp" v-model="bulkExpiry" type="date" class="ui-input" :disabled="uploading" @change="applyBulk" />
            </div>
          </div>
          <ul class="queue">
            <li v-for="(item, i) in queue" :key="item.key" class="qitem" :class="{ 'is-done': item.status === 'done', 'is-error': item.status === 'error' }">
              <span class="doc__icon" :class="`k-${kindOf({ file_type: item.file.type, name: item.file.name })}`"><i :class="iconOf({ file_type: item.file.type, name: item.file.name })"></i></span>
              <div class="qitem__main">
                <div class="qitem__row">
                  <input v-model.trim="item.title" class="ui-input" :aria-label="`Title for ${item.file.name}`" :disabled="uploading || item.status === 'done'" placeholder="Title" />
                  <select v-model="item.category" class="ui-select" :aria-label="`Category for ${item.file.name}`" :disabled="uploading || item.status === 'done'">
                    <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                  <input v-model="item.expiry_date" type="date" class="ui-input" :aria-label="`Expiry for ${item.file.name}`" :disabled="uploading || item.status === 'done'" title="Expiry date (optional)" />
                </div>
                <div class="qitem__meta">
                  <span>{{ item.file.name }} · {{ bytes(item.file.size) }}</span>
                  <span v-if="item.file.size > maxSize" class="err">Too large (max 10 MB)</span>
                  <span v-else-if="item.status === 'error'" class="err">{{ item.error }}</span>
                  <span v-else-if="item.status === 'done'" class="ok"><i class="fa-solid fa-check"></i> Uploaded</span>
                  <span v-else-if="item.status === 'uploading'" class="progress"><span :style="{ width: item.progress + '%' }"></span></span>
                </div>
              </div>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Remove from list" aria-label="Remove from list" :disabled="uploading" @click="queue.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
            </li>
          </ul>
          <button type="button" class="ui-btn ui-btn--sm" :disabled="uploading" @click="pickFiles"><i class="fa-solid fa-plus"></i> Add more files</button>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" :disabled="uploading" @click="closeUpload">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="uploading || !uploadable.length">
            <i :class="uploading ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-cloud-arrow-up'"></i>
            Upload {{ uploadable.length }} file{{ uploadable.length === 1 ? '' : 's' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Edit modal -->
    <div v-if="editing" class="ui-modal-backdrop" @mousedown.self="editing = null">
      <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-label="Edit document" @submit.prevent="saveEdit">
        <div class="ui-modal__head">
          <div>
            <h2>Edit document</h2>
            <p class="sub">{{ editing.original_filename }} · {{ bytes(editing.file_size) }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="editing = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="ed-title">Title <span class="req">*</span></label>
            <input id="ed-title" v-model.trim="editForm.title" class="ui-input" :class="{ 'is-invalid': !editForm.title }" />
          </div>
          <div class="ui-grid-2" style="margin-top: 16px">
            <div class="ui-field">
              <label for="ed-cat">Category</label>
              <select id="ed-cat" v-model="editForm.category" class="ui-select">
                <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="ed-exp">Expiry date</label>
              <input id="ed-exp" v-model="editForm.expiry_date" type="date" class="ui-input" />
            </div>
          </div>
          <div class="ui-field" style="margin-top: 16px">
            <label for="ed-desc">Description</label>
            <textarea id="ed-desc" v-model="editForm.description" class="ui-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="editing = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !editForm.title"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Save</button>
        </div>
      </form>
    </div>

    <!-- Preview -->
    <div v-if="viewing" class="ui-modal-backdrop" @mousedown.self="closePreview">
      <div class="ui-modal preview" role="dialog" aria-modal="true" :aria-label="viewing.title">
        <div class="ui-modal__head">
          <div class="preview__title">
            <span class="doc__icon" :class="`k-${kindOf(viewing)}`"><i :class="iconOf(viewing)"></i></span>
            <div>
              <h2>{{ viewing.title }}</h2>
              <p class="sub">{{ catLabel(viewing.category) }} · {{ bytes(viewing.file_size) }} · added {{ date(viewing.created_at) }} by {{ uploader(viewing) }}</p>
            </div>
          </div>
          <div class="ui-actions">
            <button class="ui-btn ui-btn--sm" @click="download(viewing)"><i class="fa-solid fa-download"></i> Download</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="closePreview"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <div class="ui-modal__body preview__body">
          <div v-if="previewLoading" class="preview__msg"><i class="fa-solid fa-circle-notch spin"></i> Loading preview…</div>
          <div v-else-if="previewError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ previewError }}</span></div>
          <img v-else-if="previewUrl && kindOf(viewing) === 'image'" :src="previewUrl" :alt="viewing.title" class="preview__img" />
          <iframe v-else-if="previewUrl && ['pdf'].includes(kindOf(viewing))" :src="previewUrl" class="preview__frame" :title="viewing.title"></iframe>
          <pre v-else-if="previewText !== null" class="preview__text">{{ previewText }}</pre>
          <div v-else class="preview__msg">
            <i :class="iconOf(viewing)" class="big"></i>
            <p>No preview for this file type.</p>
            <button class="ui-btn ui-btn--primary" @click="download(viewing)"><i class="fa-solid fa-download"></i> Download {{ viewing.original_filename }}</button>
          </div>
          <p v-if="viewing.description" class="preview__desc">{{ viewing.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { documentsService, DOCUMENT_CATEGORIES, categoryLabel, fileKind, KIND_ICONS, formatBytes } from '@/services/documents'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, downloadBlob, isoDate } from '@/utils/format'

let seq = 0

export default {
  name: 'Documents',
  data() {
    return {
      docs: [],
      pagination: {},
      stats: null,
      loading: false,
      error: '',
      q: '',
      category: this.$route.query.category || '',
      kind: '',
      sort: '',
      expiring: this.$route.query.expiring === '1',
      page: 1,
      perPage: 25,
      timer: null,
      busy: null,
      dragDepth: 0,
      queue: [],
      uploading: false,
      bulkCategory: 'general',
      bulkExpiry: '',
      maxSize: 10 * 1024 * 1024,
      editing: null,
      editForm: {},
      saving: false,
      viewing: null,
      previewUrl: '',
      previewText: null,
      previewLoading: false,
      previewError: ''
    }
  },
  computed: {
    hasFilters() {
      return !!(this.q || this.category || this.kind || this.expiring)
    },
    topCategories() {
      return (this.stats?.categories || []).slice(0, 6)
    },
    categoryOptions() {
      const extra = (this.stats?.categories || []).map((c) => c.category).filter((c) => !DOCUMENT_CATEGORIES.some((d) => d.value === c))
      return [...DOCUMENT_CATEGORIES, ...extra.map((c) => ({ value: c, label: categoryLabel(c) }))]
    },
    uploadable() {
      return this.queue.filter((i) => i.status !== 'done' && i.file.size <= this.maxSize)
    }
  },
  created() {
    this.load()
    this.loadStats()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
    this.revokePreview()
  },
  methods: {
    date: formatDate,
    bytes: formatBytes,
    catLabel: categoryLabel,
    kindOf: fileKind,
    iconOf(d) {
      return KIND_ICONS[fileKind(d)]
    },
    uploader(d) {
      const u = d.uploaded_by_user
      return u && (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u?.email || '—'
    },
    daysLeft(d) {
      return Math.round((new Date(String(d.expiry_date).slice(0, 10) + 'T00:00:00') - new Date(isoDate() + 'T00:00:00')) / 86400000)
    },
    expiryText(d) {
      const n = this.daysLeft(d)
      if (n < 0) return `Expired ${formatDate(d.expiry_date)}`
      if (n === 0) return 'Expires today'
      if (n <= 30) return `${n} day${n === 1 ? '' : 's'} left`
      return formatDate(d.expiry_date)
    },
    expiryBadge(d) {
      const n = this.daysLeft(d)
      if (n < 0) return 'ui-badge--danger'
      if (n <= 30) return 'ui-badge--warning'
      return 'ui-badge--draft'
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const params = { page: this.page, limit: this.perPage, search: this.q || undefined, category: this.category || undefined, file_type: this.kind || undefined, sort: this.sort || undefined }
        if (this.expiring) {
          params.expiring = 30
          if (!this.sort) params.sort = 'expiry'
        }
        const { documents, pagination } = await documentsService.list(params)
        this.docs = documents
        this.pagination = pagination
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load documents')
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        this.stats = await documentsService.stats()
      } catch {
        this.stats = { total: 0, total_size: 0, uploaded_this_week: 0, expiring_soon: 0, expired: 0, categories: [] }
      }
    },
    refresh() {
      this.load()
      this.loadStats()
    },
    reload() {
      this.page = 1
      this.load()
    },
    go(p) {
      this.page = p
      this.load()
    },
    debouncedLoad() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.reload, 250)
    },
    setCategory(c) {
      this.category = c
      this.reload()
    },
    toggleExpiring() {
      this.expiring = !this.expiring
      this.reload()
    },
    resetFilters() {
      this.q = ''
      this.category = ''
      this.kind = ''
      this.expiring = false
      this.reload()
    },
    // ----- Upload -----
    pickFiles() {
      this.$refs.fileInput.value = ''
      this.$refs.fileInput.click()
    },
    onPicked(e) {
      this.addFiles([...(e.target.files || [])])
    },
    onDragEnter(e) {
      if ([...(e.dataTransfer?.types || [])].includes('Files')) this.dragDepth++
    },
    onDragLeave() {
      if (this.dragDepth > 0) this.dragDepth--
    },
    onDropFiles(e) {
      this.dragDepth = 0
      const files = [...(e.dataTransfer?.files || [])]
      if (files.length) this.addFiles(files)
    },
    addFiles(files) {
      for (const file of files) {
        this.queue.push({
          key: ++seq,
          file,
          title: file.name.replace(/\.[^.]+$/, ''),
          category: this.category || this.bulkCategory,
          expiry_date: this.bulkExpiry,
          status: 'pending',
          progress: 0,
          error: ''
        })
      }
    },
    applyBulk() {
      for (const i of this.queue) {
        if (i.status === 'done') continue
        i.category = this.bulkCategory
        i.expiry_date = this.bulkExpiry
      }
    },
    closeUpload() {
      if (this.uploading) return
      this.queue = []
    },
    async uploadAll() {
      this.uploading = true
      let ok = 0
      for (const item of this.uploadable) {
        item.status = 'uploading'
        item.progress = 0
        try {
          await documentsService.upload({ file: item.file, title: item.title, category: item.category, expiry_date: item.expiry_date }, (p) => (item.progress = p))
          item.status = 'done'
          ok++
        } catch (e) {
          item.status = 'error'
          item.error = apiErrorMessage(e, 'Upload failed')
        }
      }
      this.uploading = false
      if (ok) toast.success(`${ok} file${ok === 1 ? '' : 's'} uploaded`)
      if (this.queue.every((i) => i.status === 'done')) this.queue = []
      this.refresh()
    },
    // ----- Edit / delete -----
    openEdit(d) {
      this.editing = d
      this.editForm = { title: d.title, category: d.category, description: d.description || '', expiry_date: d.expiry_date ? isoDate(d.expiry_date) : '' }
    },
    async saveEdit() {
      this.saving = true
      try {
        await documentsService.update(this.editing.id, { ...this.editForm })
        toast.success('Document updated')
        this.editing = null
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the document'))
      } finally {
        this.saving = false
      }
    },
    async remove(d) {
      const ok = await confirmDialog({ title: `Delete “${d.title}”?`, message: `${d.original_filename} will be permanently deleted. This cannot be undone.`, confirmText: 'Delete document', danger: true })
      if (!ok) return
      try {
        await documentsService.remove(d.id)
        toast.success('Document deleted')
        if (this.viewing?.id === d.id) this.closePreview()
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the document'))
      }
    },
    async download(d) {
      this.busy = d.id
      try {
        const blob = await documentsService.file(d.id)
        downloadBlob(blob, d.original_filename || d.title)
      } catch (e) {
        toast.error(await this.blobError(e, 'Could not download the file'))
      } finally {
        this.busy = null
      }
    },
    async blobError(e, fallback) {
      try {
        if (e?.response?.data instanceof Blob) {
          const j = JSON.parse(await e.response.data.text())
          return j.error?.message || j.message || fallback
        }
      } catch {
        /* ignore */
      }
      return apiErrorMessage(e, fallback)
    },
    // ----- Preview -----
    revokePreview() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = ''
      this.previewText = null
    },
    async preview(d) {
      this.revokePreview()
      this.viewing = d
      this.previewError = ''
      const kind = fileKind(d)
      if (!['image', 'pdf', 'text'].includes(kind)) return
      this.previewLoading = true
      try {
        const blob = await documentsService.file(d.id, true)
        if (kind === 'text') this.previewText = (await blob.slice(0, 200000).text()) || '(empty file)'
        else this.previewUrl = URL.createObjectURL(new Blob([blob], { type: d.file_type }))
      } catch (e) {
        this.previewError = await this.blobError(e, 'Could not load the preview')
      } finally {
        this.previewLoading = false
      }
    },
    closePreview() {
      this.viewing = null
      this.revokePreview()
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }
.kpi-danger { background: var(--danger-soft); color: var(--danger); }
.txt-danger { color: var(--danger); }

.sk-val {
  display: inline-block;
  width: 60px;
  height: 26px;
}

.ui-card {
  position: relative;
}

.ui-card.is-dragover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 650;
  color: var(--accent);
  background: var(--accent-soft);
  backdrop-filter: blur(2px);
  border-radius: var(--radius-lg);
  pointer-events: none;
  z-index: 3;
}

.drop-overlay i {
  font-size: 30px;
  margin-bottom: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cats {
  max-width: 100%;
  overflow-x: auto;
  flex-wrap: nowrap;
}

.cats .ui-tab {
  white-space: nowrap;
}

.search {
  width: 260px;
}

.sel {
  width: 160px;
}

.filter-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--warning-soft);
  border-bottom: 1px solid var(--border);
}

.link-btn {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  align-items: center;
}

.dropzone {
  margin: 16px;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.doc {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 240px;
}

.doc__icon {
  --k: var(--text-2);
  --ks: var(--neutral-soft);
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 17px;
  flex-shrink: 0;
  color: var(--k);
  background: var(--ks);
}

.k-pdf { --k: var(--danger); --ks: var(--danger-soft); }
.k-image { --k: var(--accent); --ks: var(--accent-soft); }
.k-sheet { --k: var(--success); --ks: var(--success-soft); }
.k-word { --k: var(--info); --ks: var(--info-soft); }
.k-slides { --k: var(--warning); --ks: var(--warning-soft); }

.doc__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.doc__title {
  font-weight: 600;
}

.doc__text small {
  color: var(--text-3);
  font-size: 12.5px;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-pill {
  display: inline-block;
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-2);
  white-space: nowrap;
}

.muted {
  color: var(--text-3);
}

.nowrap {
  white-space: nowrap;
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.danger:hover {
  color: var(--danger);
}

.is-loading {
  opacity: 0.6;
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.storage-note {
  margin: 14px 4px 0;
  font-size: 12.5px;
  color: var(--text-3);
}

.storage-note i {
  margin-right: 6px;
}

.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.bulk {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  margin-bottom: 14px;
}

.queue {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 46vh;
  overflow-y: auto;
}

.qitem {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.qitem.is-done {
  border-color: var(--success);
  background: var(--success-soft);
}

.qitem.is-error {
  border-color: var(--danger);
}

.qitem__main {
  flex: 1;
  min-width: 0;
}

.qitem__row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 150px;
  gap: 8px;
}

.qitem__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.qitem__meta .err {
  color: var(--danger);
}

.qitem__meta .ok {
  color: var(--success);
  font-weight: 600;
}

.progress {
  flex: 1;
  max-width: 180px;
  height: 5px;
  background: var(--neutral-soft);
  border-radius: 5px;
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}

.preview {
  max-width: 980px;
}

.preview__title {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.preview__title h2 {
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview__body {
  min-height: 240px;
}

.preview__img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.preview__frame {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.preview__text {
  max-height: 65vh;
  overflow: auto;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12.5px;
  white-space: pre-wrap;
  color: var(--text);
}

.preview__msg {
  text-align: center;
  padding: 48px 12px;
  color: var(--text-3);
}

.preview__msg .big {
  font-size: 40px;
  margin-bottom: 12px;
}

.preview__desc {
  margin: 14px 0 0;
  color: var(--text-2);
  white-space: pre-wrap;
}

.req {
  color: var(--danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 1200px) {
  .hide-lg {
    display: none;
  }
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .sel {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .qitem__row,
  .bulk {
    grid-template-columns: 1fr;
  }
  .doc {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
