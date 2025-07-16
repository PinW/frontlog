import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Settings from './Settings.vue'
import { useSettingsStore } from '../stores/settings.js'

describe('Settings Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render settings component with spellcheck toggle', () => {
    const wrapper = mount(Settings)
    
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Spellcheck')
  })

  it('should display current spellcheck state visually', () => {
    const wrapper = mount(Settings)
    const settingsStore = useSettingsStore()
    
    // Default should be false
    expect(settingsStore.spellcheckEnabled).toBe(false)
    
    // Should show inactive state (gray background)
    const button = wrapper.find('button')
    expect(button.classes()).toContain('bg-gray-400')
    expect(button.classes()).not.toContain('bg-blue-600')
  })

  it('should toggle spellcheck when button is clicked', async () => {
    const wrapper = mount(Settings)
    const settingsStore = useSettingsStore()
    
    const button = wrapper.find('button')
    
    // Initially off
    expect(settingsStore.spellcheckEnabled).toBe(false)
    
    // Click to turn on
    await button.trigger('click')
    expect(settingsStore.spellcheckEnabled).toBe(true)
    
    // Click to turn off
    await button.trigger('click')
    expect(settingsStore.spellcheckEnabled).toBe(false)
  })

  it('should update visual state when spellcheck state changes', async () => {
    const wrapper = mount(Settings)
    const button = wrapper.find('button')
    
    // Initially shows inactive state
    expect(button.classes()).toContain('bg-gray-400')
    expect(button.classes()).not.toContain('bg-blue-600')
    
    // After clicking, should show active state
    await button.trigger('click')
    expect(button.classes()).toContain('bg-blue-600')
    expect(button.classes()).not.toContain('bg-gray-400')
    
    // After clicking again, should show inactive state
    await button.trigger('click')
    expect(button.classes()).toContain('bg-gray-400')
    expect(button.classes()).not.toContain('bg-blue-600')
  })
})