import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    spellcheckEnabled: false,
  }),
  actions: {
    toggleSpellcheck() {
      this.spellcheckEnabled = !this.spellcheckEnabled
    },
  },
})
