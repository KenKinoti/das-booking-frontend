import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { toast } from './composables/useToast'
import { confirmDialog } from './composables/useConfirm'

import '@fortawesome/fontawesome-free/css/all.css'
import './styles/bootstrap-theme.css'
import './styles/app.css'

initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.config.globalProperties.$toast = toast
app.config.globalProperties.$confirm = confirmDialog

app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}

app.mount('#app')
