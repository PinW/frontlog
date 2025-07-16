import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings.js'

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have spellcheck disabled by default', () => {
      const store = useSettingsStore()
      
      expect(store.spellcheckEnabled).toBe(false)
    })
  })

  describe('toggleSpellcheck action', () => {
    it('should toggle spellcheck from false to true', () => {
      const store = useSettingsStore()
      
      expect(store.spellcheckEnabled).toBe(false)
      
      store.toggleSpellcheck()
      
      expect(store.spellcheckEnabled).toBe(true)
    })

    it('should toggle spellcheck from true to false', () => {
      const store = useSettingsStore()
      store.spellcheckEnabled = true
      
      store.toggleSpellcheck()
      
      expect(store.spellcheckEnabled).toBe(false)
    })

    it('should toggle multiple times correctly', () => {
      const store = useSettingsStore()
      
      // Initially false
      expect(store.spellcheckEnabled).toBe(false)
      
      // Toggle to true
      store.toggleSpellcheck()
      expect(store.spellcheckEnabled).toBe(true)
      
      // Toggle to false
      store.toggleSpellcheck()
      expect(store.spellcheckEnabled).toBe(false)
      
      // Toggle to true again
      store.toggleSpellcheck()
      expect(store.spellcheckEnabled).toBe(true)
    })
  })

  describe('reactivity', () => {
    it('should be reactive to state changes', () => {
      const store = useSettingsStore()
      
      // Direct state modification should be reactive
      store.spellcheckEnabled = true
      expect(store.spellcheckEnabled).toBe(true)
      
      store.spellcheckEnabled = false
      expect(store.spellcheckEnabled).toBe(false)
    })
  })
})