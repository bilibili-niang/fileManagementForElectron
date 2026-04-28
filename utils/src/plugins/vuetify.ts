import 'vuetify/styles'
import {createVuetify} from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import {aliases, mdi} from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import {zhHans} from 'vuetify/locale'

/**
 * 配置 Vuetify 主题
 * 支持浅色和深色模式
 */
export function setupVuetify() {
  return createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {mdi}
    },
    locale: {
      locale: 'zhHans',
      messages: {
        zhHans
      }
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#1976d2',
            secondary: '#424242',
            accent: '#82b1ff',
            error: '#ff5252',
            info: '#2196f3',
            success: '#4caf50',
            warning: '#fb8c00',
            background: '#f5f5f5',
            surface: '#ffffff'
          }
        },
        dark: {
          dark: true,
          colors: {
            primary: '#90caf9',
            secondary: '#616161',
            accent: '#448aff',
            error: '#ef5350',
            info: '#42a5f5',
            success: '#66bb6a',
            warning: '#ffa726',
            background: '#121212',
            surface: '#1e1e1e'
          }
        }
      }
    }
  })
}
