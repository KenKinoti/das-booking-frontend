<template>
  <div v-if="currentOrganizationContext" class="org-context-banner">
    <div class="org-context-content">
      <div class="context-left">
        <i class="fas fa-user-shield"></i>
        <span class="context-text">
          Logged in as <strong>{{ currentOrganizationContext.name }}</strong>
        </span>
      </div>
      <button @click="exitOrganizationContext" class="exit-context-btn" title="Return to Super Admin">
        <i class="fas fa-sign-out-alt"></i>
        Exit
      </button>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationContext } from '@/composables/useOrganizationContext'
import { showSuccessToast } from '@/utils/errorHandler'

export default {
  name: 'OrganizationContext',
  setup() {
    const router = useRouter()
    const {
      currentOrganizationContext,
      clearOrganizationContext,
      setupContextListener
    } = useOrganizationContext()

    const exitOrganizationContext = () => {
      const orgName = currentOrganizationContext.value?.name
      clearOrganizationContext()
      showSuccessToast(`Exited organization context: ${orgName}`)

      // Navigate to super admin dashboard
      router.push('/super-admin')
    }

    // Set up cross-tab context synchronization
    let removeContextListener
    onMounted(() => {
      removeContextListener = setupContextListener()
    })

    onUnmounted(() => {
      if (removeContextListener) {
        removeContextListener()
      }
    })

    return {
      currentOrganizationContext,
      exitOrganizationContext
    }
  }
}
</script>

<style scoped>
/* Organization Context Banner - Bright Green Theme */
.org-context-banner {
  background: linear-gradient(135deg, #059669, #10b981);
  color: white;
  padding: 6px 0;
  margin: 0;
  border-radius: 0;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  border: none;
  border-bottom: 1px solid #34d399;
  position: sticky;
  top: 0;
  z-index: 1000;
  line-height: 1.3;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 3px 6px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 3px 6px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.3);
  }
}

.org-context-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 12px;
  height: 31px;
}

.context-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
}

.context-text {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}

.org-context-content i {
  font-size: 11px;
  color: #d1fae5;
}


.context-text strong {
  font-weight: 700;
  color: #fef3c7;
}

.exit-context-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  height: 22px;
  line-height: 1.3;
  backdrop-filter: blur(2px);
  animation: pulse-button 3s ease-in-out infinite;
  margin: 3px 0;
}

@keyframes pulse-button {
  0%, 100% {
    transform: scale(1);
    background: rgba(255, 255, 255, 0.2);
  }
  50% {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.25);
  }
}

.exit-context-btn:hover {
  background: rgba(255, 255, 255, 0.35) !important;
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.08) translateY(-0.5px) !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  animation: none;
}

.exit-context-btn:active {
  transform: scale(1.02) translateY(0px) !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.exit-context-btn i {
  font-size: 10px;
}

/* Dark theme support */
[data-bs-theme="dark"] .org-context-banner {
  background: linear-gradient(135deg, #047857, #059669);
  border: 1px solid #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

[data-bs-theme="dark"] .context-text strong {
  color: #fef3c7;
}

[data-bs-theme="dark"] .exit-context-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(3px);
}

[data-bs-theme="dark"] .exit-context-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Responsive design */
@media (max-width: 768px) {
  .org-context-content {
    padding: 0 10px;
    height: 29px;
  }

  .context-left {
    gap: 4px;
  }

  .context-text {
    font-size: 11px;
  }

  .exit-context-btn {
    font-size: 11px;
    padding: 2px 5px;
    height: 20px;
    gap: 2px;
    margin: 2px 0;
  }

  .exit-context-btn i {
    font-size: 9px;
  }
}
</style>