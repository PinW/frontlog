<template>
  <div class="fixed top-4 right-4">
    <button @click="toggleSettings" class="p-2 rounded-full hover:bg-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
    <div v-if="showSettings" class="absolute top-12 right-0 bg-white p-4 rounded-lg shadow-lg">
      <h3 class="text-lg font-semibold mb-2">Settings</h3>
      <div class="flex items-center justify-between">
        <label for="spellcheck">Spellcheck</label>
        <input type="checkbox" id="spellcheck" :checked="spellcheckEnabled" @change="toggleSpellcheck">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const showSettings = ref(false)

const settingsStore = useSettingsStore()
const { spellcheckEnabled } = storeToRefs(settingsStore)
const { toggleSpellcheck } = settingsStore

const toggleSettings = () => {
  showSettings.value = !showSettings.value
}
</script>
