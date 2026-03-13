import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// import { router } from './router' // 暂时不使用 Vue Router
import { setupVuetify } from './plugins/vuetify'
import { setupMockApi } from './plugins/mock-api'

// 设置 Mock API (非 Electron 环境)
setupMockApi()

const app = createApp(App)
app.use(createPinia())
// app.use(router) // 暂时不使用 Vue Router
app.use(setupVuetify())
app.mount('#app')
