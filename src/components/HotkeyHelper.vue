<template>
  <div class="fixed bottom-8 right-8 z-50 min-w-[220px] text-[0.98rem] pointer-events-none grayscale">
    <ul class="grid grid-cols-2 gap-x-4 gap-y-1 list-none p-0 m-0">
      <li
        v-for="hotkey in hotkeyList"
        :key="hotkey.action"
        class="contents"
      >
        <span class="text-gray-600 text-left truncate py-1 justify-self-start">{{ hotkey.action }}</span>
        <kbd class="bg-gray-200 text-gray-600 rounded border border-gray-300 px-1.5 py-0.5 text-[0.95em] font-sans shadow-sm text-right whitespace-nowrap py-1 justify-self-end">{{ hotkey.combo }}</kbd>
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