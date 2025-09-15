<template>
  <div class="invoice-templates">
    <div class="template-selector">
      <h3 class="selector-title">
        <i class="bi bi-palette"></i>
        Choose Your Perfect Invoice Template
      </h3>
      <div class="templates-grid">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          :class="{ 'selected': selectedTemplate?.id === template.id }"
          @click="selectTemplate(template)"
        >
          <div class="template-preview">
            <div :class="['preview-content', template.style]">
              <div class="preview-header">
                <div class="preview-logo">LOGO</div>
                <div class="preview-title">INVOICE</div>
              </div>
              <div class="preview-body">
                <div class="preview-line long"></div>
                <div class="preview-line medium"></div>
                <div class="preview-line short"></div>
                <div class="preview-table">
                  <div class="preview-row"></div>
                  <div class="preview-row"></div>
                  <div class="preview-row total"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="template-info">
            <h4 class="template-name">{{ template.name }}</h4>
            <p class="template-description">{{ template.description }}</p>
            <div class="template-features">
              <span v-for="feature in template.features" :key="feature" class="feature-tag">
                {{ feature }}
              </span>
            </div>
          </div>
          <div class="template-actions">
            <button class="btn-preview" @click.stop="previewTemplate(template)">
              <i class="bi bi-eye"></i>
              Preview
            </button>
            <button
              class="btn-select"
              :class="{ 'selected': selectedTemplate?.id === template.id }"
              @click.stop="selectTemplate(template)"
            >
              <i class="bi bi-check-circle"></i>
              {{ selectedTemplate?.id === template.id ? 'Selected' : 'Select' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Preview Modal -->
    <div v-if="showPreview" class="preview-modal" @click="closePreview">
      <div class="preview-modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ previewingTemplate?.name }} - Preview</h3>
          <button class="close-btn" @click="closePreview">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="preview-container">
            <InvoicePreview :template="previewingTemplate" :invoice="sampleInvoice" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" @click="closePreview">Close</button>
          <button class="btn btn-primary" @click="selectAndClose(previewingTemplate)">
            <i class="bi bi-check-circle"></i>
            Select This Template
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InvoicePreview from './InvoicePreview.vue'

export default {
  name: 'InvoiceTemplates',
  components: {
    InvoicePreview
  },
  props: {
    selectedTemplate: {
      type: Object,
      default: null
    }
  },
  emits: ['template-selected'],
  data() {
    return {
      showPreview: false,
      previewingTemplate: null,
      templates: [
        {
          id: 'modern-blue',
          name: 'Modern Blue',
          description: 'Clean, professional design with blue accents. Perfect for tech and consulting businesses.',
          style: 'modern-blue',
          features: ['Email-optimized', 'Mobile-friendly', 'Professional'],
          colors: {
            primary: '#3b82f6',
            secondary: '#e5e7eb',
            accent: '#1e40af'
          }
        },
        {
          id: 'elegant-purple',
          name: 'Elegant Purple',
          description: 'Sophisticated design with elegant typography. Ideal for creative agencies and luxury brands.',
          style: 'elegant-purple',
          features: ['Luxury feel', 'Typography-focused', 'Creative'],
          colors: {
            primary: '#8b5cf6',
            secondary: '#f3f4f6',
            accent: '#6d28d9'
          }
        },
        {
          id: 'minimal-green',
          name: 'Minimal Green',
          description: 'Ultra-clean minimalist design. Perfect for startups and modern businesses.',
          style: 'minimal-green',
          features: ['Ultra-clean', 'Minimalist', 'Modern'],
          colors: {
            primary: '#10b981',
            secondary: '#f9fafb',
            accent: '#047857'
          }
        },
        {
          id: 'corporate-navy',
          name: 'Corporate Navy',
          description: 'Traditional corporate style with navy blue. Excellent for established businesses.',
          style: 'corporate-navy',
          features: ['Corporate', 'Traditional', 'Trustworthy'],
          colors: {
            primary: '#1e40af',
            secondary: '#f8fafc',
            accent: '#1e3a8a'
          }
        },
        {
          id: 'creative-gradient',
          name: 'Creative Gradient',
          description: 'Eye-catching gradient design. Perfect for creative businesses and agencies.',
          style: 'creative-gradient',
          features: ['Eye-catching', 'Modern', 'Creative'],
          colors: {
            primary: '#ec4899',
            secondary: '#fdf2f8',
            accent: '#be185d'
          }
        },
        {
          id: 'monochrome-elegant',
          name: 'Monochrome Elegant',
          description: 'Sophisticated black and white design. Timeless and professional.',
          style: 'monochrome-elegant',
          features: ['Timeless', 'Elegant', 'Professional'],
          colors: {
            primary: '#1f2937',
            secondary: '#f9fafb',
            accent: '#374151'
          }
        }
      ],
      sampleInvoice: {
        invoice_number: 'INV-2024-001',
        issue_date: '2024-01-15',
        due_date: '2024-02-15',
        customer: {
          name: 'Acme Corporation',
          email: 'billing@acme.com',
          address: '123 Business Ave\nSuite 100\nNew York, NY 10001'
        },
        company: {
          name: 'Your Business Name',
          email: 'hello@yourbusiness.com',
          phone: '+1 (555) 123-4567',
          address: '456 Company St\nBusiness District\nYour City, State 12345',
          logo: null
        },
        items: [
          {
            description: 'Consulting Services',
            quantity: 10,
            rate: 150.00,
            amount: 1500.00
          },
          {
            description: 'Project Management',
            quantity: 5,
            rate: 120.00,
            amount: 600.00
          },
          {
            description: 'Implementation Support',
            quantity: 8,
            rate: 100.00,
            amount: 800.00
          }
        ],
        subtotal: 2900.00,
        tax_rate: 8.25,
        tax_amount: 239.25,
        total: 3139.25,
        notes: 'Thank you for your business! Payment is due within 30 days.',
        terms: 'Net 30 days. Late payments may incur a 1.5% monthly service charge.'
      }
    }
  },
  methods: {
    selectTemplate(template) {
      this.$emit('template-selected', template)
    },

    previewTemplate(template) {
      this.previewingTemplate = template
      this.showPreview = true
    },

    closePreview() {
      this.showPreview = false
      this.previewingTemplate = null
    },

    selectAndClose(template) {
      this.selectTemplate(template)
      this.closePreview()
    }
  }
}
</script>

<style scoped>
.invoice-templates {
  padding: 0;
}

.template-selector {
  margin-bottom: 2rem;
}

.selector-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selector-title i {
  color: var(--bs-primary);
  font-size: 1.25rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: var(--card-bg);
  border: 2px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--bs-box-shadow-lg);
  border-color: var(--bs-primary);
}

.template-card.selected {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.template-preview {
  height: 200px;
  background: #f8f9fa;
  padding: 1rem;
  overflow: hidden;
}

.preview-content {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 4px;
  padding: 0.75rem;
  position: relative;
  transform: scale(0.8);
  transform-origin: top left;
}

/* Template Styles */
.preview-content.modern-blue {
  border-top: 4px solid #3b82f6;
}

.preview-content.elegant-purple {
  background: linear-gradient(135deg, #faf5ff 0%, #ffffff 100%);
  border-left: 4px solid #8b5cf6;
}

.preview-content.minimal-green {
  border: 1px solid #d1d5db;
  border-top: 3px solid #10b981;
}

.preview-content.corporate-navy {
  background: #fafbfc;
  border-top: 6px solid #1e40af;
}

.preview-content.creative-gradient {
  background: linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%);
  border: 2px solid #ec4899;
  border-radius: 8px;
}

.preview-content.monochrome-elegant {
  border: 2px solid #1f2937;
  border-radius: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.preview-logo {
  font-size: 0.625rem;
  font-weight: bold;
  color: #6b7280;
  padding: 2px 6px;
  border: 1px solid #d1d5db;
  border-radius: 2px;
}

.preview-title {
  font-size: 0.75rem;
  font-weight: bold;
  color: #374151;
}

.preview-body {
  space-y: 0.5rem;
}

.preview-line {
  height: 2px;
  background: #e5e7eb;
  border-radius: 1px;
  margin-bottom: 0.25rem;
}

.preview-line.long {
  width: 80%;
}

.preview-line.medium {
  width: 60%;
}

.preview-line.short {
  width: 40%;
}

.preview-table {
  margin-top: 0.75rem;
  space-y: 0.25rem;
}

.preview-row {
  height: 3px;
  background: #f3f4f6;
  border-radius: 1px;
  margin-bottom: 0.25rem;
}

.preview-row.total {
  background: #d1d5db;
  height: 4px;
}

.template-info {
  padding: 1.5rem;
}

.template-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.template-description {
  color: var(--bs-gray-600);
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.template-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.feature-tag {
  background: var(--bs-primary);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius-sm);
  font-weight: 500;
}

.template-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
}

.btn-preview,
.btn-select {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--bs-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-preview {
  background: var(--bs-gray-100);
  color: var(--bs-gray-700);
}

.btn-preview:hover {
  background: var(--bs-gray-200);
}

.btn-select {
  background: var(--bs-primary);
  color: white;
}

.btn-select:hover {
  background: color-mix(in srgb, var(--bs-primary) 90%, black);
}

.btn-select.selected {
  background: var(--bs-success);
}

/* Preview Modal */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.preview-modal-content {
  background: var(--card-bg);
  border-radius: var(--bs-border-radius-lg);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--bs-gray-500);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--bs-border-radius);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bs-gray-100);
  color: var(--bs-gray-700);
}

.modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

.preview-container {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: var(--bs-border-radius);
  display: flex;
  justify-content: center;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--bs-border-color);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }

  .template-actions {
    flex-direction: column;
  }

  .preview-modal {
    padding: 0.5rem;
  }
}

/* Dark theme support */
[data-theme="dark"] .preview-content {
  background: var(--bs-gray-800);
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .preview-header {
  border-color: var(--bs-gray-600);
}

[data-theme="dark"] .preview-logo {
  background: var(--bs-gray-700);
  border-color: var(--bs-gray-600);
  color: var(--bs-gray-300);
}

[data-theme="dark"] .preview-title {
  color: var(--bs-gray-100);
}

[data-theme="dark"] .preview-line {
  background: var(--bs-gray-600);
}

[data-theme="dark"] .preview-row {
  background: var(--bs-gray-700);
}

[data-theme="dark"] .preview-row.total {
  background: var(--bs-gray-500);
}
</style>