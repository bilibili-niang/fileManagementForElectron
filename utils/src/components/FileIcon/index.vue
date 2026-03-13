<template>
  <div class="file-icon-container" :style="containerStyle">
    <template v-if="iconName !== 'custom'">
      <v-icon :icon="iconName" :size="size" :color="iconColor"></v-icon>
    </template>
    <div v-else class="custom-file-icon" :style="customIconStyle">
      <span class="file-ext">{{ displayExt }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  extension: string
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24
})

const sizeNum = computed(() => typeof props.size === 'string' ? parseInt(props.size) : props.size)

/**
 * 文件扩展名到图标的映射
 */
const iconMap: Record<string, { icon: string; color: string }> = {
  // 图片
  jpg: { icon: 'mdi-file-image', color: '#4CAF50' },
  jpeg: { icon: 'mdi-file-image', color: '#4CAF50' },
  png: { icon: 'mdi-file-image', color: '#4CAF50' },
  gif: { icon: 'mdi-file-image', color: '#4CAF50' },
  bmp: { icon: 'mdi-file-image', color: '#4CAF50' },
  webp: { icon: 'mdi-file-image', color: '#4CAF50' },
  svg: { icon: 'mdi-svg', color: '#FF9800' },
  ico: { icon: 'mdi-file-image', color: '#4CAF50' },
  tif: { icon: 'mdi-file-image', color: '#4CAF50' },
  tiff: { icon: 'mdi-file-image', color: '#4CAF50' },
  // 文档
  pdf: { icon: 'mdi-file-pdf-box', color: '#F44336' },
  doc: { icon: 'mdi-file-word', color: '#2196F3' },
  docx: { icon: 'mdi-file-word', color: '#2196F3' },
  xls: { icon: 'mdi-file-excel', color: '#4CAF50' },
  xlsx: { icon: 'mdi-file-excel', color: '#4CAF50' },
  csv: { icon: 'mdi-file-delimited', color: '#4CAF50' },
  ppt: { icon: 'mdi-file-powerpoint', color: '#FF5722' },
  pptx: { icon: 'mdi-file-powerpoint', color: '#FF5722' },
  txt: { icon: 'mdi-file-document-outline', color: '#607D8B' },
  md: { icon: 'mdi-language-markdown', color: '#1976D2' },
  markdown: { icon: 'mdi-language-markdown', color: '#1976D2' },
  rtf: { icon: 'mdi-file-document', color: '#607D8B' },
  // 代码 - JavaScript/TypeScript
  js: { icon: 'mdi-language-javascript', color: '#F7DF1E' },
  jsx: { icon: 'mdi-react', color: '#61DAFB' },
  ts: { icon: 'mdi-language-typescript', color: '#3178C6' },
  tsx: { icon: 'mdi-react', color: '#61DAFB' },
  vue: { icon: 'mdi-vuejs', color: '#4FC08D' },
  svelte: { icon: 'mdi-svelte', color: '#FF3E00' },
  // 代码 - Web
  html: { icon: 'mdi-language-html5', color: '#E34F26' },
  htm: { icon: 'mdi-language-html5', color: '#E34F26' },
  css: { icon: 'mdi-language-css3', color: '#1572B6' },
  scss: { icon: 'mdi-sass', color: '#CC6699' },
  sass: { icon: 'mdi-sass', color: '#CC6699' },
  less: { icon: 'mdi-less', color: '#1D365D' },
  // 代码 - 后端语言
  py: { icon: 'mdi-language-python', color: '#3776AB' },
  pyc: { icon: 'mdi-language-python', color: '#3776AB' },
  java: { icon: 'mdi-language-java', color: '#007396' },
  class: { icon: 'mdi-language-java', color: '#007396' },
  jar: { icon: 'mdi-language-java', color: '#007396' },
  c: { icon: 'mdi-language-c', color: '#A8B9CC' },
  cpp: { icon: 'mdi-language-cpp', color: '#00599C' },
  h: { icon: 'mdi-language-c', color: '#A8B9CC' },
  hpp: { icon: 'mdi-language-cpp', color: '#00599C' },
  cs: { icon: 'mdi-language-csharp', color: '#239120' },
  go: { icon: 'mdi-language-go', color: '#00ADD8' },
  rs: { icon: 'mdi-language-rust', color: '#DEA584' },
  rb: { icon: 'mdi-language-ruby', color: '#CC342D' },
  php: { icon: 'mdi-language-php', color: '#777BB4' },
  swift: { icon: 'mdi-language-swift', color: '#F05138' },
  kt: { icon: 'mdi-language-kotlin', color: '#7F52FF' },
  kts: { icon: 'mdi-language-kotlin', color: '#7F52FF' },
  scala: { icon: 'mdi-language-scala', color: '#DC322F' },
  r: { icon: 'mdi-language-r', color: '#276DC3' },
  // 代码 - 配置文件
  json: { icon: 'mdi-code-json', color: '#F7DF1E' },
  xml: { icon: 'mdi-xml', color: '#FF6600' },
  xsl: { icon: 'mdi-xml', color: '#FF6600' },
  xslt: { icon: 'mdi-xml', color: '#FF6600' },
  yaml: { icon: 'mdi-code-braces', color: '#CB171E' },
  yml: { icon: 'mdi-code-braces', color: '#CB171E' },
  toml: { icon: 'mdi-cog', color: '#9C4121' },
  ini: { icon: 'mdi-cog', color: '#607D8B' },
  conf: { icon: 'mdi-cog', color: '#607D8B' },
  config: { icon: 'mdi-cog', color: '#607D8B' },
  env: { icon: 'mdi-cog', color: '#607D8B' },
  properties: { icon: 'mdi-cog', color: '#607D8B' },
  // 代码 - 数据库
  sql: { icon: 'mdi-database', color: '#F29111' },
  db: { icon: 'mdi-database', color: '#F29111' },
  sqlite: { icon: 'mdi-database', color: '#F29111' },
  sqlite3: { icon: 'mdi-database', color: '#F29111' },
  // 代码 - 脚本
  sh: { icon: 'mdi-console', color: '#4EAA25' },
  bash: { icon: 'mdi-console', color: '#4EAA25' },
  zsh: { icon: 'mdi-console', color: '#4EAA25' },
  ps1: { icon: 'mdi-console', color: '#012456' },
  bat: { icon: 'mdi-console', color: '#012456' },
  cmd: { icon: 'mdi-console', color: '#012456' },
  awk: { icon: 'mdi-console', color: '#4EAA25' },
  sed: { icon: 'mdi-console', color: '#4EAA25' },
  // 版本控制
  gitignore: { icon: 'mdi-git', color: '#F05032' },
  gitattributes: { icon: 'mdi-git', color: '#F05032' },
  // 压缩包
  zip: { icon: 'mdi-zip-box', color: '#FFC107' },
  rar: { icon: 'mdi-zip-box', color: '#FFC107' },
  '7z': { icon: 'mdi-zip-box', color: '#FFC107' },
  tar: { icon: 'mdi-zip-box', color: '#FFC107' },
  gz: { icon: 'mdi-zip-box', color: '#FFC107' },
  bz2: { icon: 'mdi-zip-box', color: '#FFC107' },
  xz: { icon: 'mdi-zip-box', color: '#FFC107' },
  lz4: { icon: 'mdi-zip-box', color: '#FFC107' },
  zst: { icon: 'mdi-zip-box', color: '#FFC107' },
  // 可执行文件
  exe: { icon: 'mdi-application', color: '#0078D6' },
  msi: { icon: 'mdi-application', color: '#0078D6' },
  dmg: { icon: 'mdi-apple', color: '#999999' },
  pkg: { icon: 'mdi-package', color: '#999999' },
  deb: { icon: 'mdi-linux', color: '#A80030' },
  rpm: { icon: 'mdi-linux', color: '#A80030' },
  app: { icon: 'mdi-application', color: '#0078D6' },
  apk: { icon: 'mdi-android', color: '#3DDC84' },
  // 视频
  mp4: { icon: 'mdi-file-video', color: '#FF5722' },
  avi: { icon: 'mdi-file-video', color: '#FF5722' },
  mkv: { icon: 'mdi-file-video', color: '#FF5722' },
  mov: { icon: 'mdi-file-video', color: '#FF5722' },
  wmv: { icon: 'mdi-file-video', color: '#FF5722' },
  flv: { icon: 'mdi-file-video', color: '#FF5722' },
  webm: { icon: 'mdi-file-video', color: '#FF5722' },
  m4v: { icon: 'mdi-file-video', color: '#FF5722' },
  mpg: { icon: 'mdi-file-video', color: '#FF5722' },
  mpeg: { icon: 'mdi-file-video', color: '#FF5722' },
  '3gp': { icon: 'mdi-file-video', color: '#FF5722' },
  // 音频
  mp3: { icon: 'mdi-file-music', color: '#E91E63' },
  wav: { icon: 'mdi-file-music', color: '#E91E63' },
  flac: { icon: 'mdi-file-music', color: '#E91E63' },
  aac: { icon: 'mdi-file-music', color: '#E91E63' },
  ogg: { icon: 'mdi-file-music', color: '#E91E63' },
  wma: { icon: 'mdi-file-music', color: '#E91E63' },
  m4a: { icon: 'mdi-file-music', color: '#E91E63' },
  opus: { icon: 'mdi-file-music', color: '#E91E63' },
  // 字体
  ttf: { icon: 'mdi-format-font', color: '#607D8B' },
  otf: { icon: 'mdi-format-font', color: '#607D8B' },
  woff: { icon: 'mdi-format-font', color: '#607D8B' },
  woff2: { icon: 'mdi-format-font', color: '#607D8B' },
  eot: { icon: 'mdi-format-font', color: '#607D8B' },
  // 其他
  log: { icon: 'mdi-text-box-outline', color: '#607D8B' },
  dockerfile: { icon: 'mdi-docker', color: '#2496ED' },
  makefile: { icon: 'mdi-wrench', color: '#607D8B' },
  cmake: { icon: 'mdi-wrench', color: '#607D8B' },
  gradle: { icon: 'mdi-wrench', color: '#607D8B' },
  lock: { icon: 'mdi-lock', color: '#607D8B' }
}

/**
 * 为未知扩展名生成颜色
 */
function getColorForExt(ext: string): string {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#9E9E9E', '#607D8B'
  ]
  const extStr = ext.trim() || 'unknown'
  let hash = 0
  for (let i = 0; i < extStr.length; i++) {
    hash = extStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const ext = computed(() => props.extension.toLowerCase())

const iconInfo = computed(() => {
  return iconMap[ext.value] || { icon: 'custom', color: getColorForExt(ext.value) }
})

const iconName = computed(() => iconInfo.value.icon)
const iconColor = computed(() => iconInfo.value.color)

const displayExt = computed(() => {
  const extStr = ext.value.trim()
  if (!extStr) {
    return 'FILE'
  }
  return extStr.slice(0, 4).toUpperCase()
})

const containerStyle = computed(() => ({
  width: `${sizeNum.value}px`,
  height: `${sizeNum.value}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const customIconStyle = computed(() => ({
  width: `${sizeNum.value}px`,
  height: `${sizeNum.value}px`,
  backgroundColor: iconColor.value,
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: `${Math.max(10, sizeNum.value * 0.35)}px`,
  fontWeight: 'bold',
  color: 'white',
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.5px'
}))
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
