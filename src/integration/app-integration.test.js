import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import App from '../App.vue'
import { useTasksStore } from '../stores/tasks.js'

// Mock vuedraggable for integration tests
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    template: '<div><slot /></div>',
    props: ['list', 'itemKey', 'tag', 'group', 'handle', 'move'],
    emits: ['choose', 'unchoose', 'start', 'end']
  }
}))

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useEventListener: vi.fn()
}))

describe('App Integration Tests', () => {
  let wrapper
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTasksStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Task List Rendering', () => {
    it('should render the task management interface', () => {
      wrapper = mount(App)
      
      // Should render main container and draggable area
      const mainContainer = wrapper.find('.min-h-screen')
      expect(mainContainer.exists()).toBe(true)
      
      // Should render draggable component when tasks exist
      const draggableComponent = wrapper.findComponent({ name: 'draggable' })
      expect(draggableComponent.exists()).toBe(true)
    })

    it('should have access to task data through store', () => {
      wrapper = mount(App)
      
      // Should have access to task data from store
      expect(store.tasks.length).toBeGreaterThan(0)
      expect(store.flattenedTaskList.length).toBeGreaterThan(0)
      
      // Should find the default project names in store
      const taskTexts = store.flattenedTaskList.map(item => item.task.text)
      expect(taskTexts).toContain('Project Alpha')
      expect(taskTexts).toContain('Project Beta')
    })

    it('should show hotkey helper component', () => {
      wrapper = mount(App)
      
      const hotkeyHelper = wrapper.findComponent({ name: 'HotkeyHelper' })
      expect(hotkeyHelper.exists()).toBe(true)
    })

    it('should show settings component', () => {
      wrapper = mount(App)
      
      const settings = wrapper.findComponent({ name: 'Settings' })
      expect(settings.exists()).toBe(true)
    })
  })

  describe('Task Creation and Management', () => {
    it('should be able to create new tasks', () => {
      wrapper = mount(App)
      
      const initialTaskCount = store.flattenedTaskList.length
      
      // Create a new task programmatically
      const newTaskId = store.createTask({ text: 'New Integration Test Task' })
      
      expect(store.flattenedTaskList.length).toBe(initialTaskCount + 1)
      expect(store.flattenedTaskList.some(item => item.task.id === newTaskId)).toBe(true)
    })

    it('should be able to toggle task completion', () => {
      wrapper = mount(App)
      
      const firstTask = store.flattenedTaskList[0].task
      const initialCompleted = firstTask.completed
      
      store.toggleTaskCompletion(firstTask.id)
      
      expect(firstTask.completed).toBe(!initialCompleted)
    })

    it('should update active task when selection changes', () => {
      wrapper = mount(App)
      
      const firstTaskId = store.flattenedTaskList[0].task.id
      store.activeTaskId = firstTaskId
      
      expect(store.activeTaskId).toBe(firstTaskId)
    })
  })

  describe('Hierarchical Operations', () => {
    it('should handle nesting operations', () => {
      wrapper = mount(App)
      
      // Create two tasks at root level
      const firstTaskId = store.createTask({ text: 'Parent Task' })
      const secondTaskId = store.createTask({ text: 'Child Task', relativeToId: firstTaskId, position: 'after' })
      
      // Nest the second task under the first
      store.nestTask(secondTaskId)
      
      const parentTask = store.tasks.find(task => task.id === firstTaskId)
      expect(parentTask.children.some(child => child.id === secondTaskId)).toBe(true)
    })

    it('should handle unnesting operations', () => {
      wrapper = mount(App)
      
      // Use existing nested task from default data
      const nestedTaskId = '1-1-1' // Wireframes task
      const originalParentId = '1-1' // Design task
      
      store.unnestTask(nestedTaskId)
      
      // Task should be moved to parent level
      const originalParent = store.tasks[0].children.find(child => child.id === originalParentId)
      const parentOfParent = store.tasks[0]
      
      expect(originalParent.children.some(child => child.id === nestedTaskId)).toBe(false)
      expect(parentOfParent.children.some(child => child.id === nestedTaskId)).toBe(true)
    })

    it('should maintain proper indentation levels', () => {
      wrapper = mount(App)
      
      // Check that indentation levels are correct for nested structure
      expect(store.getTaskIndentation('1')).toBe(0) // Root level
      expect(store.getTaskIndentation('1-1')).toBe(1) // First level nesting
      expect(store.getTaskIndentation('1-1-1')).toBe(2) // Second level nesting
    })
  })

  describe('Navigation and Selection', () => {
    it('should handle task navigation', () => {
      wrapper = mount(App)
      
      const flatList = store.flattenedTaskList
      if (flatList.length > 1) {
        // Set active task to first
        store.activeTaskId = flatList[0].task.id
        
        // Navigate to next task
        store.selectNextTask()
        
        expect(store.activeTaskId).toBe(flatList[1].task.id)
        
        // Navigate to previous task
        store.selectPreviousTask()
        
        expect(store.activeTaskId).toBe(flatList[0].task.id)
      }
    })

    it('should wrap around navigation at boundaries', () => {
      wrapper = mount(App)
      
      const flatList = store.flattenedTaskList
      if (flatList.length > 0) {
        // Set to last task
        const lastTaskId = flatList[flatList.length - 1].task.id
        store.activeTaskId = lastTaskId
        
        // Navigate to next (should wrap to first)
        store.selectNextTask()
        
        expect(store.activeTaskId).toBe(flatList[0].task.id)
        
        // Navigate to previous (should wrap to last)
        store.selectPreviousTask()
        
        expect(store.activeTaskId).toBe(lastTaskId)
      }
    })
  })

  describe('Task Clearing', () => {
    it('should clear all tasks and create a new empty one', () => {
      wrapper = mount(App)
      
      const newTaskId = store.clearAllTasks()
      
      expect(store.tasks.length).toBe(1)
      expect(store.tasks[0].text).toBe('')
      expect(store.tasks[0].id).toBe(newTaskId)
      expect(store.activeTaskId).toBe(newTaskId)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', () => {
      wrapper = mount(App)
      
      // Perform multiple operations
      const newTaskId = store.createTask({ text: 'Consistency Test' })
      store.activeTaskId = newTaskId
      store.toggleTaskCompletion(newTaskId)
      store.updateTaskText({ id: newTaskId, newText: 'Updated Consistency Test' })
      
      // Verify the task exists and has correct data
      const task = store.flattenedTaskList.find(item => item.task.id === newTaskId)
      expect(task).toBeDefined()
      expect(task.task.text).toBe('Updated Consistency Test')
      expect(task.task.completed).toBe(true)
      expect(store.activeTaskId).toBe(newTaskId)
    })

    it('should handle rapid successive operations', () => {
      wrapper = mount(App)
      
      const initialCount = store.flattenedTaskList.length
      
      // Rapidly create multiple tasks
      const taskIds = []
      for (let i = 0; i < 5; i++) {
        taskIds.push(store.createTask({ text: `Rapid Task ${i}` }))
      }
      
      expect(store.flattenedTaskList.length).toBe(initialCount + 5)
      
      // Verify all tasks exist
      taskIds.forEach(id => {
        const task = store.flattenedTaskList.find(item => item.task.id === id)
        expect(task).toBeDefined()
      })
    })
  })
})