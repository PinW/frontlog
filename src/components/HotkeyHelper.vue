<template>
  <div class="fixed bottom-8 right-8 z-50 min-w-[220px] text-[0.98rem] pointer-events-none grayscale">
    <ul class="list-none p-0 m-0">
      <li v-for="hotkey in hotkeyList" :key="hotkey.action" class="flex flex-row items-center gap-2 py-1">
        <span class="flex-1 text-gray-600 text-left">{{ hotkey.action }}</span>
        <kbd class="bg-gray-200 text-gray-600 rounded border border-gray-300 px-1.5 py-0.5 text-[0.95em] font-sans shadow-sm ml-4 text-right">{{ hotkey.combo }}</kbd>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useHotkeysStore } from '../stores/hotkeys'
import { storeToRefs } from 'pinia'

const hotkeysStore = useHotkeysStore()
const { hotkeyList } = storeToRefs(hotkeysStore)
</script> 