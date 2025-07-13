<template>
  <div class="fixed top-2 right-2 flex items-center gap-2 opacity-80">
    <span class="text-gray-600 text-[0.95em]">Spellcheck</span>
    <button
      @click="toggleSpellcheck"
      :class="[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
        spellcheckEnabled ? 'bg-blue-600' : 'bg-gray-400'
      ]"
    >
      <span
        :class="[
          'inline-block h-3 w-3 transform rounded-full transition-transform bg-gray-100',
          spellcheckEnabled ? 'translate-x-5' : 'translate-x-1'
        ]"
      />
    </button>
  </div>
</template>

<script setup>
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const { spellcheckEnabled } = storeToRefs(settingsStore)
const { toggleSpellcheck } = settingsStore
</script>
