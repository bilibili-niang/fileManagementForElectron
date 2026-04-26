import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// import { router } from './router' // 暂时不使用 Vue Router
import { setupVuetify } from './plugins/vuetify'
import { setupMockApi } from './plugins/mock-api'
import { initVConsole } from './plugins/vconsole'

/**
 * 设置 Mock API (非 Electron 环境)
 */
setupMockApi()

/**
 * 初始化 VConsole (移动端调试)
 */
initVConsole()

const app = createApp(App)
app.use(createPinia())
// app.use(router) // 暂时不使用 Vue Router
app.use(setupVuetify())
app.mount('#app')
