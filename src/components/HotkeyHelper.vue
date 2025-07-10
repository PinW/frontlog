<template>
  <div class="fixed bottom-8 right-8 z-50 pointer-events-none opacity-80 hidden md:block">
    <ul class="grid grid-cols-2 gap-x-4 gap-y-2 list-none p-0 m-0">
      <li
        v-for="hotkey in hotkeyList"
        :key="hotkey.action"
        class="contents"
      >
        <span class="text-gray-600 text-left truncate py-1 justify-self-start">{{ hotkey.action }}</span>
        <div class="flex items-center gap-1 justify-self-end">
          <template v-for="(part, index) in hotkey.combo" :key="index">
            <kbd 
              v-if="part !== '/' && part !== '+' && part !== 'or' && part !== '(' && part!== ')'"
              class="bg-gray-100 text-gray-600 rounded border border-gray-300 px-1.5 py-0.5 text-[0.95em] font-sans shadow-[1px_1px_0_rgba(0,0,0,0.05)] whitespace-nowrap"
            >
              <span v-html="part"></span>
            </kbd>
            <span
              v-else 
              class="text-gray-500 text-[0.9em] font-medium px-0.5"
            >
              {{ part === '/' ? '/' : part }}
            </span>
          </template>
        </div>
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