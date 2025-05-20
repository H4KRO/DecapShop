<template>
  <h1>{{ label }} - {{ count }}</h1>
</template>

<script lang="ts" setup>
defineProps<{
  label: string,
  count: number,
}>()
</script>