import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    spellcheckEnabled: true,
  }),
  actions: {
    toggleSpellcheck() {
      this.spellcheckEnabled = !this.spellcheckEnabled
    },
  },
  persist: true,
})
