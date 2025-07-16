import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTasksStore } from './tasks.js'

describe('Tasks Store - Hierarchical Operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('moveTaskUp', () => {
    it('should swap task with previous sibling', () => {
      const store = useTasksStore()
      
      store.moveTaskUp('1-2') // Move Development up
      
      const parentTask = store.tasks.find(task => task.id === '1')
      expect(parentTask.children[0].id).toBe('1-2') // Development now first
      expect(parentTask.children[1].id).toBe('1-1') // Design now second
    })

    it('should unnest task when it is first child and parent has no previous sibling', () => {
      const store = useTasksStore()
      
      store.moveTaskUp('1-1') // Move Design up (it's first in its list, parent has no prev sibling)
      
      // Design should be moved to parent level (unnested)
      const parentTask = store.tasks.find(task => task.id === '1')
      expect(parentTask.children[0].id).toBe('1-2') // Development now first child
      expect(store.tasks[0].id).toBe('1-1') // Design should be unnested to root level before Project Alpha
    })

    it('should move nested task to parent level when no previous sibling exists', () => {
      const store = useTasksStore()
      
      store.moveTaskUp('1-1-1') // Move Wireframes up (first child of Design)
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      
      // Wireframes should be moved to parent level before Design
      expect(parentTask.children[0].id).toBe('1-1-1') // Wireframes at parent level
      expect(parentTask.children[1].id).toBe('1-1') // Design after it
      expect(designTask.children[0].id).toBe('1-1-2') // Only Mockups left in Design
    })

    it('should handle root level task at the beginning', () => {
      const store = useTasksStore()
      
      store.moveTaskUp('1') // Try to move first root task up
      
      expect(store.tasks[0].id).toBe('1') // Should stay in same position
    })

    it('should handle non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.moveTaskUp('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })
  })

  describe('moveTaskDown', () => {
    it('should swap task with next sibling', () => {
      const store = useTasksStore()
      
      store.moveTaskDown('1-1') // Move Design down
      
      const parentTask = store.tasks.find(task => task.id === '1')
      expect(parentTask.children[0].id).toBe('1-2') // Development now first
      expect(parentTask.children[1].id).toBe('1-1') // Design now second
    })

    it('should move task to start of next sibling when parent has next sibling', () => {
      const store = useTasksStore()
      
      // Project Alpha ('1') has next sibling Project Beta ('2')  
      // So '1-2' (Development) should move to start of Project Beta's children
      store.moveTaskDown('1-2') // Move Development down (last child, parent has next sibling)
      
      // Development should move to Project Beta's children
      const alphaTask = store.tasks.find(task => task.id === '1')
      const betaTask = store.tasks.find(task => task.id === '2')
      
      expect(alphaTask.children.length).toBe(1) // Only Design left in Alpha
      expect(alphaTask.children[0].id).toBe('1-1') // Design still there
      
      expect(betaTask.children.length).toBe(2) // Research + Development
      expect(betaTask.children[0].id).toBe('1-2') // Development first
      expect(betaTask.children[1].id).toBe('2-1') // Research second
    })

    it('should move nested task to start of parent next sibling when available', () => {
      const store = useTasksStore()
      
      store.moveTaskDown('1-1-2') // Move Mockups down (last child of Design, Design has next sibling Development)
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      const developmentTask = parentTask.children.find(child => child.id === '1-2')
      
      // Mockups should be moved to start of Development's children
      expect(developmentTask.children[0].id).toBe('1-1-2') // Mockups now first child of Development
      expect(developmentTask.children[1].id).toBe('1-2-1') // Frontend after it
      expect(designTask.children.length).toBe(1) // Only Wireframes left in Design
    })

    it('should handle root level task at the end', () => {
      const store = useTasksStore()
      
      store.moveTaskDown('2') // Try to move last root task down
      
      expect(store.tasks[1].id).toBe('2') // Should stay in same position
    })

    it('should handle non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.moveTaskDown('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })
  })

  describe('nestTask', () => {
    it('should nest task under previous sibling', () => {
      const store = useTasksStore()
      
      store.nestTask('1-2') // Nest Development under Design
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      
      expect(parentTask.children.length).toBe(1) // Only Design left at parent level
      expect(designTask.children.length).toBe(3) // Design now has 3 children
      expect(designTask.children[2].id).toBe('1-2') // Development is last child
    })

    it('should handle nesting first task in list (should not nest)', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.nestTask('1-1') // Try to nest first task (Design)
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should nest root level task', () => {
      const store = useTasksStore()
      
      store.nestTask('2') // Nest Project Beta under Project Alpha
      
      expect(store.tasks.length).toBe(1) // Only Project Alpha left at root
      const alphaTask = store.tasks[0]
      expect(alphaTask.children.length).toBe(3) // Alpha now has 3 children
      expect(alphaTask.children[2].id).toBe('2') // Project Beta is last child
    })

    it('should handle non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.nestTask('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should initialize children array if it does not exist', () => {
      const store = useTasksStore()
      
      // Create a task without children array
      const newTaskId = store.createTask({ text: 'Task without children' })
      const anotherTaskId = store.createTask({ text: 'Task to nest', relativeToId: newTaskId, position: 'after' })
      
      store.nestTask(anotherTaskId)
      
      const newTask = store.tasks.find(task => task.id === newTaskId)
      expect(newTask.children).toBeDefined()
      expect(newTask.children.length).toBe(1)
      expect(newTask.children[0].id).toBe(anotherTaskId)
    })
  })

  describe('unnestTask', () => {
    it('should move task to parent sibling level', () => {
      const store = useTasksStore()
      
      store.unnestTask('1-1-1') // Unnest Wireframes
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const designTask = parentTask.children.find(child => child.id === '1-1')
      
      expect(parentTask.children.length).toBe(3) // Now has 3 children at parent level
      expect(parentTask.children[1].id).toBe('1-1-1') // Wireframes after Design
      expect(designTask.children.length).toBe(1) // Only Mockups left in Design
    })

    it('should handle unnesting root level task (should not unnest)', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.unnestTask('1') // Try to unnest root task
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should handle non-existent task', () => {
      const store = useTasksStore()
      const initialTasksJson = JSON.stringify(store.tasks)
      
      store.unnestTask('non-existent-id')
      
      expect(JSON.stringify(store.tasks)).toBe(initialTasksJson)
    })

    it('should place unnested task after its former parent', () => {
      const store = useTasksStore()
      
      store.unnestTask('1-2-2') // Unnest Backend
      
      const parentTask = store.tasks.find(task => task.id === '1')
      const developmentTask = parentTask.children.find(child => child.id === '1-2')
      
      expect(parentTask.children.length).toBe(3) // 3 children at parent level
      expect(parentTask.children[0].id).toBe('1-1') // Design
      expect(parentTask.children[1].id).toBe('1-2') // Development  
      expect(parentTask.children[2].id).toBe('1-2-2') // Backend (unnested)
      expect(developmentTask.children.length).toBe(1) // Only Frontend left
    })
  })

  describe('getTaskIndentation', () => {
    it('should return correct indentation for root tasks', () => {
      const store = useTasksStore()
      
      expect(store.getTaskIndentation('1')).toBe(0)
      expect(store.getTaskIndentation('2')).toBe(0)
    })

    it('should return correct indentation for nested tasks', () => {
      const store = useTasksStore()
      
      expect(store.getTaskIndentation('1-1')).toBe(1) // Design
      expect(store.getTaskIndentation('1-1-1')).toBe(2) // Wireframes
      expect(store.getTaskIndentation('1-2-2')).toBe(2) // Backend
    })

    it('should return 0 for non-existent task', () => {
      const store = useTasksStore()
      
      expect(store.getTaskIndentation('non-existent-id')).toBe(0)
    })

    it('should update indentation after nesting operations', () => {
      const store = useTasksStore()
      
      // Initially at level 1
      expect(store.getTaskIndentation('1-2')).toBe(1)
      
      // Nest under Design (level 2)
      store.nestTask('1-2')
      expect(store.getTaskIndentation('1-2')).toBe(2)
      
      // Unnest back (level 1)
      store.unnestTask('1-2')
      expect(store.getTaskIndentation('1-2')).toBe(1)
    })
  })

  describe('findTaskMeta', () => {
    it('should find root level task with correct metadata', () => {
      const store = useTasksStore()
      
      const meta = store.findTaskMeta('1')
      
      expect(meta).toBeDefined()
      expect(meta.task.id).toBe('1')
      expect(meta.parent).toBeNull()
      expect(meta.siblings).toBe(store.tasks)
      expect(meta.index).toBe(0)
    })

    it('should find nested task with correct metadata', () => {
      const store = useTasksStore()
      
      const meta = store.findTaskMeta('1-1-1')
      
      expect(meta).toBeDefined()
      expect(meta.task.id).toBe('1-1-1')
      expect(meta.parent.id).toBe('1-1')
      expect(meta.siblings.length).toBe(2) // Wireframes and Mockups
      expect(meta.index).toBe(0) // First child
    })

    it('should return null for non-existent task', () => {
      const store = useTasksStore()
      
      const meta = store.findTaskMeta('non-existent-id')
      
      expect(meta).toBeNull()
    })

    it('should find deeply nested tasks', () => {
      const store = useTasksStore()
      
      // Add a deeper nesting level for testing
      const designTask = store.tasks[0].children[0] // Design task
      designTask.children[0].children = [{
        id: 'deep-1',
        text: 'Deep Task',
        completed: false,
        children: []
      }]
      
      const meta = store.findTaskMeta('deep-1')
      
      expect(meta).toBeDefined()
      expect(meta.task.id).toBe('deep-1')
      expect(meta.parent.id).toBe('1-1-1') // Wireframes
    })
  })
})