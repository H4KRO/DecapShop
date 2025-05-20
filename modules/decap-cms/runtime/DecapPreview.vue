<template>
  <MDCRenderer v-if="ast" :body="ast.body" :data="ast.data" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const ast = ref()

onMounted(() => {
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'preview-content') {
      ast.value = await parseMarkdown(event.data.markdown || '')
    }
  })
})
</script>
