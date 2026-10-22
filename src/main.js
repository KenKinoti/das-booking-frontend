import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { toast } from './composables/useToast'
import { confirmDialog } from './composables/useConfirm'
import { initPwa } from './composables/usePwa'
import { tableCards } from './directives/tableCards'
import StatusBadge from './components/ui/StatusBadge.vue'
import OverflowMenu from './components/ui/OverflowMenu.vue'

import '@fortawesome/fontawesome-free/css/all.css'
import './styles/bootstrap-theme.css'
import './styles/app.css'
import './styles/seasons.css'
import './components/seasons/install' // seasonal themes: data-season controller, greeting, ornament, admin route
import './components/subscriptions/install' // client subscriptions: /subscriptions pages + public "Your services" page

initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.config.globalProperties.$toast = toast
app.config.globalProperties.$confirm = confirmDialog

// Shared UI: <StatusBadge domain="booking" :status="b.status" /> and
// <table class="ui-table" v-table-cards> (stacked cards on phones)
app.component('StatusBadge', StatusBadge)
app.component('OverflowMenu', OverflowMenu)
app.directive('table-cards', tableCards)

app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}

app.mount('#app')

// Installable app: service worker (production builds only), update prompt,
// install banner / iOS instructions.
initPwa()
