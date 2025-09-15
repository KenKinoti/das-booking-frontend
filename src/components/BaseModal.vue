<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      style="background: rgba(0, 0, 0, 0.5);"
      @click="handleOverlayClick"
    >
      <div class="modal-dialog" :class="modalSizeClass" role="document" @click.stop>
        <div class="modal-content">
          <div class="modal-header" :class="headerClass">
            <div class="d-flex align-items-center">
              <i :class="iconClass + ' me-2'"></i>
              <h5 class="modal-title mb-0">{{ title }}</h5>
            </div>
            <button
              type="button"
              class="btn-close"
              @click="$emit('close')"
              aria-label="Close"
            ></button>
          </div>

          <div class="modal-body">
            <slot name="body">
              <p v-if="message" v-html="formattedMessage"></p>
            </slot>
          </div>

          <div class="modal-footer" v-if="!hideFooter">
            <slot name="footer">
              <!-- Default actions based on modal type -->
              <template v-if="type === 'confirm'">
                <button type="button" class="btn btn-secondary" @click="$emit('close')">
                  <i class="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" class="btn btn-danger" @click="$emit('confirm')">
                  <i class="fas fa-check me-1"></i>
                  Confirm
                </button>
              </template>

              <template v-else-if="type === 'view'">
                <button type="button" class="btn btn-secondary" @click="$emit('close')">
                  <i class="fas fa-times me-1"></i>
                  Close
                </button>
                <button
                  v-if="showDelete"
                  type="button"
                  class="btn btn-danger"
                  @click="$emit('delete')"
                >
                  <i class="fas fa-trash me-1"></i>
                  Delete
                </button>
              </template>

              <template v-else>
                <button type="button" class="btn btn-primary" @click="$emit('close')">
                  <i class="fas fa-check me-1"></i>
                  OK
                </button>
              </template>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'BaseModal',
  
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => [
        'info', 'view', 'edit', 'delete', 'shift', 
        'success', 'error', 'confirm', 'warning'
      ].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large', 'xl'].includes(value)
    },
    showDelete: {
      type: Boolean,
      default: false
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    },
    hideFooter: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['close', 'delete', 'confirm'],
  
  computed: {
    typeConfig() {
      return {
        info: { headerClass: 'bg-info text-white', icon: 'fas fa-info-circle' },
        view: { headerClass: '', icon: 'fas fa-eye' },
        edit: { headerClass: 'bg-primary text-white', icon: 'fas fa-edit' },
        delete: { headerClass: 'bg-danger text-white', icon: 'fas fa-trash' },
        shift: { headerClass: 'bg-success text-white', icon: 'fas fa-calendar' },
        success: { headerClass: 'bg-success text-white', icon: 'fas fa-check-circle' },
        error: { headerClass: 'bg-danger text-white', icon: 'fas fa-exclamation-circle' },
        confirm: { headerClass: 'bg-warning text-dark', icon: 'fas fa-question-circle' },
        warning: { headerClass: 'bg-warning text-dark', icon: 'fas fa-exclamation-triangle' }
      }
    },

    config() {
      return this.typeConfig[this.type] || this.typeConfig.info
    },

    headerClass() {
      return this.config.headerClass
    },

    iconClass() {
      return this.config.icon
    },

    modalSizeClass() {
      return {
        'modal-sm': this.size === 'small',
        'modal-lg': this.size === 'large',
        'modal-xl': this.size === 'xl'
      }
    },

    formattedMessage() {
      return this.message ? this.message.replace(/\n/g, '<br>') : ''
    }
  },
  
  mounted() {
    // Handle escape key
    document.addEventListener('keydown', this.handleEscape)
  },
  
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleEscape)
  },
  
  methods: {
    handleOverlayClick() {
      if (this.closeOnOverlay) {
        this.$emit('close')
      }
    },
    
    handleEscape(e) {
      if (e.key === 'Escape' && this.show) {
        this.$emit('close')
      }
    }
  }
}
</script>

<style scoped>
/* Custom modal animations and enhancements */
.modal {
  animation: fadeIn 0.2s ease-out;
}

.modal-dialog {
  animation: slideIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Ensure proper z-index for modal */
.modal {
  z-index: 1055;
}

/* Icon spacing */
.modal-title i {
  margin-right: 0.5rem;
}
</style>