import { defineStore } from 'pinia'

export const useHotkeysStore = defineStore('hotkeys', {
  state: () => ({
    hotkeys: [
      { action: 'New Task', combo: ['Enter'] },
      { action: 'New Line', combo: ['Shift', '+', 'Enter'] },
      { action: 'Complete Task', combo: ['Ctrl', '+', 'Enter'] },
      { action: 'Navigate', combo: ['&#x2191; / &#x2193;'] },
      { action: 'Delete Task', combo: ['Backspace', '/', 'Delete'] },
      { action: 'Reorder Task', combo: ['Ctrl', '+', '&#x2191; / &#x2193;'] },
      { action: 'Nest Task', combo: ['Tab'] },
      { action: 'Unnest Task', combo: ['Shift', '+', 'Tab'] },
    ],
  }),
  getters: {
    hotkeyList: (state) => state.hotkeys,
  },
  actions: {
    // Placeholder for future hotkey customization
    updateHotkey(action, newCombo) {
      const idx = this.hotkeys.findIndex(h => h.action === action)
      if (idx !== -1) {
        this.hotkeys[idx].combo = newCombo
      }
    },
  },
}) 