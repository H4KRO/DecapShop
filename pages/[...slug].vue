<script setup>
const route = useRoute()

const path = `/${['pages', ...route.path.split('/')].filter(r => r != '').join('/')}`

const { data } = await useAsyncData('page', () => queryCollection('pages').path(path).first())
//console.log(data)
</script>

<template>
  <UBadge label="TEST"/>
  <div v-if="data">
    <ContentRenderer :value="data" />
  </div>
  <div v-else>
    <h1>Page non trouvée</h1>
  </div>
</template>
