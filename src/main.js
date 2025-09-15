import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Initialize global theme
import { globalTheme } from './composables/useTheme'

// Import FontAwesome icons
import '@fortawesome/fontawesome-free/css/all.css'

// Import CSS
import './assets/css/main.css'
import './styles/bootstrap-theme.css'

console.log('Starting booking platform app...')

try {
  const app = createApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  app.use(router)
  
  console.log('Mounting booking platform...')
  app.mount('#app')
  console.log('✅ Booking platform loaded successfully!')
} catch (error) {
  console.error('❌ Error during app initialization:', error)
}
