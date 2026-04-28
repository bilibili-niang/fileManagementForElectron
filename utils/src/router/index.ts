import {
  createRouter,
  createWebHashHistory
} from 'vue-router'
import FileCategory
  from '@/views/FileCategory/index.vue'
import FileSearch
  from '@/views/FileSearch/index.vue'
import Settings from '@/views/Settings/index.vue'
import QrCodeGenerator
  from '@/views/QrCodeGenerator/index.vue'
import NetworkMock
  from '@/views/NetworkMock/index.vue'
import ApiDocs from '@/views/ApiDocs/index.vue'
import FileShare from '@/views/FileShare'

const routes = [
  {path: '/', redirect: '/qrcode'},
  {
    path: '/category',
    name: 'Category',
    component: FileCategory,
    meta: {title: '分类浏览', icon: 'mdi-folder'}
  },
  {
    path: '/search',
    name: 'Search',
    component: FileSearch,
    meta: {title: '文件搜索', icon: 'mdi-magnify'}
  },
  {
    path: '/qrcode',
    name: 'QrCode',
    component: QrCodeGenerator,
    meta: {
      title: '二维码生成',
      icon: 'mdi-qrcode'
    }
  },
  {
    path: '/fileShare',
    name: 'FileShare',
    component: FileShare,
    meta: {
      title: '文件共享',
      icon: 'mdi-folder-sync'
    }
  },
  {
    path: '/api-docs',
    name: 'ApiDocs',
    component: ApiDocs,
    meta: {title: 'API 文档', icon: 'mdi-api'}
  },
  {
    path: '/network-mock',
    name: 'NetworkMock',
    component: NetworkMock,
    meta: {title: '网络模拟', icon: 'mdi-network'}
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: {title: '设置', icon: 'mdi-cog'}
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
