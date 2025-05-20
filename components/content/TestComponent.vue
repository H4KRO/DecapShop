<template>
  <div>
    <h1>{{ label }}</h1>
    <h2>{{ count }}</h2>
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  label: string,
  count: number,
}>()
</script>