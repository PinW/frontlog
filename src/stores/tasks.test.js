import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTasksStore } from './tasks.js'

describe('Tasks Store - Basic CRUD Operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create a task at the root when no relativeToId is provided', () => {
      const store = useTasksStore()
      
      const newTaskId = store.createTask({ text: 'New Task' })
      
      expect(newTaskId).toBeDefined()
      expect(store.tasks).toHaveLength(3) // 2 default + 1 new
      expect(store.tasks[0].text).toBe('New Task')
      expect(store.tasks[0].completed).toBe(false)
      expect(store.tasks[0].children).toEqual([])
    })

    it('should create a task after a specified task', () => {
      const store = useTasksStore()
      
      const newTaskId = store.createTask({ 
        text: 'After Task', 
        relativeToId: '1', 
        position: 'after' 
      })
      
      expect(store.tasks).toHaveLength(3)
      expect(store.tasks[1].id).toBe(newTaskId)
      expect(store.tasks[1].text).toBe('After Task')
    })

    it('should create a task before a specified task', () => {
      const store = useTasksStore()
      
      const newTaskId = store.createTask({ 
        text: 'Before Task', 
        relativeToId: '1', 
        position: 'before' 
      })
      
      expect(store.tasks).toHaveLength(3)
      expect(store.tasks[0].id).toBe(newTaskId)
      expect(store.tasks[0].text).toBe('Before Task')
    })

    it('should trim whitespace from task text', () => {
      const store = useTasksStore()
      
      const newTaskId = store.createTask({ text: '  Whitespace Task  ' })
      
      const newTask = store.tasks.find(task => task.id === newTaskId)
      expect(newTask.text).toBe('Whitespace Task')
    })

    it('should handle empty text', () => {
      const store = useTasksStore()
      
      const newTaskId = store.createTask({ text: '' })
      
      const newTask = store.tasks.find(task => task.id === newTaskId)
      expect(newTask.text).toBe('')
    })
  })

  describe('removeTask', () => {
    it('should remove a task without children', () => {
      const store = useTasksStore()
      
      store.removeTask('2-1')
      
      expect(store.tasks).toHaveLength(2) // Still 2 root tasks
      const parentTask = store.tasks.find(task => task.id === '2')
      expect(parentTask.children).toHaveLength(0)
    })

    it('should remove a task and promote its children', () => {
      const store = useTasksStore()
      
      store.removeTask('1-1') // Remove Design task which has children
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const childrenIds = parentTask.children.map(child => child.id)
      
      // Children of the removed task should be promoted
      expect(childrenIds).toContain('1-1-1') // Wireframes
      expect(childrenIds).toContain('1-1-2') // Mockups
      expect(childrenIds).toContain('1-2') // Development (was already there)
    })

    it('should handle removing non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.removeTask('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should remove root level task and promote its children', () => {
      const store = useTasksStore()
      const initialCount = store.tasks.length
      
      store.removeTask('2') // Project Beta has 1 child (Research)
      
      expect(store.tasks).toHaveLength(initialCount) // Same count because child was promoted
      expect(store.tasks.find(task => task.id === '2')).toBeUndefined()
      expect(store.tasks.find(task => task.id === '2-1')).toBeDefined() // Research promoted to root
    })
  })

  describe('toggleTaskCompletion', () => {
    it('should toggle task completion from false to true', () => {
      const store = useTasksStore()
      
      store.toggleTaskCompletion('1')
      
      const task = store.tasks.find(task => task.id === '1')
      expect(task.completed).toBe(true)
      expect(task.completionDate).toBeDefined()
    })

    it('should toggle task completion from true to false', () => {
      const store = useTasksStore()
      const task = store.tasks.find(task => task.id === '1')
      task.completed = true
      task.completionDate = '2023-01-01T00:00:00.000Z'
      
      store.toggleTaskCompletion('1')
      
      expect(task.completed).toBe(false)
      expect(task.completionDate).toBeNull()
    })

    it('should handle toggling non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.toggleTaskCompletion('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should toggle nested task completion', () => {
      const store = useTasksStore()
      
      store.toggleTaskCompletion('1-1-1')
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      const wireframesTask = designTask.children.find(child => child.id === '1-1-1')
      
      expect(wireframesTask.completed).toBe(true)
      expect(wireframesTask.completionDate).toBeDefined()
    })
  })

  describe('updateTaskText', () => {
    it('should update task text', () => {
      const store = useTasksStore()
      
      store.updateTaskText({ id: '1', newText: 'Updated Project Alpha' })
      
      const task = store.tasks.find(task => task.id === '1')
      expect(task.text).toBe('Updated Project Alpha')
    })

    it('should update nested task text', () => {
      const store = useTasksStore()
      
      store.updateTaskText({ id: '1-1-1', newText: 'Updated Wireframes' })
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      const wireframesTask = designTask.children.find(child => child.id === '1-1-1')
      
      expect(wireframesTask.text).toBe('Updated Wireframes')
    })

    it('should handle updating non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.updateTaskText({ id: 'non-existent-id', newText: 'New Text' })
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })
  })

  describe('clearAllTasks', () => {
    it('should clear all tasks and create a new empty task', () => {
      const store = useTasksStore()
      
      const newTaskId = store.clearAllTasks()
      
      expect(store.tasks).toHaveLength(1)
      expect(store.tasks[0].text).toBe('')
      expect(store.tasks[0].completed).toBe(false)
      expect(store.activeTaskId).toBe(newTaskId)
    })
  })

  describe('selectNextTask and selectPreviousTask', () => {
    it('should select next task in flattened list', () => {
      const store = useTasksStore()
      store.activeTaskId = '1'
      
      store.selectNextTask()
      
      // Should move to first child of task '1'
      expect(store.activeTaskId).toBe('1-1')
    })

    it('should wrap around to first task when at the end', () => {
      const store = useTasksStore()
      store.activeTaskId = '2-1' // Last task in the flattened list
      
      store.selectNextTask()
      
      expect(store.activeTaskId).toBe('1') // Should wrap to first task
    })

    it('should select previous task in flattened list', () => {
      const store = useTasksStore()
      store.activeTaskId = '1-1'
      
      store.selectPreviousTask()
      
      expect(store.activeTaskId).toBe('1')
    })

    it('should wrap around to last task when at the beginning', () => {
      const store = useTasksStore()
      store.activeTaskId = '1' // First task
      
      store.selectPreviousTask()
      
      expect(store.activeTaskId).toBe('2-1') // Should wrap to last task
    })

    it('should handle empty task list', () => {
      const store = useTasksStore()
      store.tasks = []
      store.activeTaskId = null
      
      store.selectNextTask()
      store.selectPreviousTask()
      
      expect(store.activeTaskId).toBeNull()
    })
  })
})