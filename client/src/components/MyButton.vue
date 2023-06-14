<script setup lang="ts">

defineProps({
  buttonType: {
    type: String,
    default: "primary",
  },
});

</script>

<template>
  <button class="btn" :class="`btn-${buttonType}`" type="button">
    <slot></slot>
  </button>
</template>