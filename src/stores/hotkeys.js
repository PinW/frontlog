import { defineStore } from 'pinia'

export const useHotkeysStore = defineStore('hotkeys', {
  state: () => ({
    hotkeys: [
      { action: 'Add New Task', combo: 'Enter' },
      { action: 'New Line', combo: 'Shift+Enter' },
      { action: 'Toggle Complete', combo: 'Ctrl+Enter' },
      { action: 'Navigate', combo: 'Arrow Up / Down' },
      { action: 'Delete Task', combo: 'Backspace / Delete' },
      { action: 'Reorder Task', combo: 'Ctrl+Arrow Up / Down' },
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