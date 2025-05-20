<template>
  <UBadge :label="label"/>
</template>

<script lang="ts" setup>
defineProps<{
  label: string
}>()
</script>