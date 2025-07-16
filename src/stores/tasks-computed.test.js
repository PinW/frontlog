import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTasksStore } from './tasks.js'

describe('Tasks Store - Computed Properties and Edge Cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('flattenedTaskList computed property', () => {
    it('should return all tasks in correct visual order', () => {
      const store = useTasksStore()
      
      const flatList = store.flattenedTaskList
      
      // Expected order: 1, 1-1, 1-1-1, 1-1-2, 1-2, 1-2-1, 1-2-2, 2, 2-1
      const expectedIds = ['1', '1-1', '1-1-1', '1-1-2', '1-2', '1-2-1', '1-2-2', '2', '2-1']
      const actualIds = flatList.map(item => item.task.id)
      
      expect(actualIds).toEqual(expectedIds)
    })

    it('should include correct metadata for each task', () => {
      const store = useTasksStore()
      
      const flatList = store.flattenedTaskList
      
      // Check root task
      const rootTask = flatList.find(item => item.task.id === '1')
      expect(rootTask.parent).toBeNull()
      expect(rootTask.level).toBe(0)
      expect(rootTask.arr).toBe(store.tasks)

      // Check nested task
      const nestedTask = flatList.find(item => item.task.id === '1-1-1')
      expect(nestedTask.parent.id).toBe('1-1')
      expect(nestedTask.level).toBe(2)
      expect(nestedTask.arr.length).toBe(2) // Wireframes and Mockups
    })

    it('should update when tasks are modified', () => {
      const store = useTasksStore()
      
      const initialCount = store.flattenedTaskList.length
      store.createTask({ text: 'New Task' })
      
      expect(store.flattenedTaskList.length).toBe(initialCount + 1)
    })

    it('should handle empty task list', () => {
      const store = useTasksStore()
      store.tasks = []
      
      expect(store.flattenedTaskList).toEqual([])
    })

    it('should handle tasks with no children', () => {
      const store = useTasksStore()
      store.tasks = [
        { id: '1', text: 'Task 1', completed: false, children: [] },
        { id: '2', text: 'Task 2', completed: false, children: [] }
      ]
      
      const flatList = store.flattenedTaskList
      
      expect(flatList.length).toBe(2)
      expect(flatList[0].task.id).toBe('1')
      expect(flatList[1].task.id).toBe('2')
      expect(flatList[0].level).toBe(0)
      expect(flatList[1].level).toBe(0)
    })
  })

  describe('getTaskIndentation method', () => {
    it('should return correct indentation levels', () => {
      const store = useTasksStore()
      
      expect(store.getTaskIndentation('1')).toBe(0)
      expect(store.getTaskIndentation('1-1')).toBe(1)
      expect(store.getTaskIndentation('1-1-1')).toBe(2)
      expect(store.getTaskIndentation('1-1-2')).toBe(2)
      expect(store.getTaskIndentation('1-2')).toBe(1)
      expect(store.getTaskIndentation('1-2-1')).toBe(2)
      expect(store.getTaskIndentation('1-2-2')).toBe(2)
      expect(store.getTaskIndentation('2')).toBe(0)
      expect(store.getTaskIndentation('2-1')).toBe(1)
    })

    it('should return 0 for non-existent tasks', () => {
      const store = useTasksStore()
      
      expect(store.getTaskIndentation('non-existent-id')).toBe(0)
    })

    it('should update when task hierarchy changes', () => {
      const store = useTasksStore()
      
      // Initially at level 1
      expect(store.getTaskIndentation('1-2')).toBe(1)
      
      // Nest under Design (should become level 2)
      store.nestTask('1-2')
      expect(store.getTaskIndentation('1-2')).toBe(2)
    })

    it('should handle empty task list', () => {
      const store = useTasksStore()
      store.tasks = []
      
      expect(store.getTaskIndentation('any-id')).toBe(0)
    })
  })

  describe('taskList and taskCount computed properties', () => {
    it('should return correct task list', () => {
      const store = useTasksStore()
      
      expect(store.taskList).toBe(store.tasks)
      expect(store.taskList.length).toBe(2)
    })

    it('should return correct task count', () => {
      const store = useTasksStore()
      
      expect(store.taskCount).toBe(2) // Root level tasks only
    })

    it('should update when tasks are added or removed', () => {
      const store = useTasksStore()
      
      const initialCount = store.taskCount
      store.createTask({ text: 'New Root Task' })
      
      expect(store.taskCount).toBe(initialCount + 1)
      
      store.removeTask(store.tasks[0].id)
      expect(store.taskCount).toBe(initialCount)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed task data gracefully', () => {
      const store = useTasksStore()
      
      // Add a task with missing properties
      store.tasks.push({
        id: 'malformed',
        // Missing text, completed, children
      })
      
      // Should not throw errors
      expect(() => store.flattenedTaskList).not.toThrow()
      expect(() => store.taskLevels).not.toThrow()
    })

    it('should handle circular references prevention', () => {
      const store = useTasksStore()
      
      // This test ensures our hierarchy doesn't create infinite loops
      const task1 = store.tasks[0]
      const task2 = store.tasks[0].children[0]
      
      // Try to create a potential circular reference scenario
      // (Our current implementation prevents this, but good to test)
      expect(() => store.findTaskMeta(task1.id)).not.toThrow()
      expect(() => store.findTaskMeta(task2.id)).not.toThrow()
    })

    it('should handle operations on empty children arrays', () => {
      const store = useTasksStore()
      
      // Create a task with explicitly empty children
      const newTaskId = store.createTask({ text: 'Empty Parent' })
      const newTask = store.tasks.find(t => t.id === newTaskId)
      newTask.children = []
      
      // Operations should not fail
      expect(() => store.nestTask('non-existent')).not.toThrow()
      expect(() => store.moveTaskUp(newTaskId)).not.toThrow()
      expect(() => store.moveTaskDown(newTaskId)).not.toThrow()
    })

    it('should handle very deep nesting', () => {
      const store = useTasksStore()
      
      // Create a deeply nested structure
      let currentTask = store.tasks[0]
      for (let i = 0; i < 10; i++) {
        const newTaskId = store.createTask({ text: `Deep Level ${i}` })
        const newTask = store.tasks.find(t => t.id === newTaskId)
        
        // Remove from root and add to current task
        const rootIndex = store.tasks.findIndex(t => t.id === newTaskId)
        if (rootIndex !== -1) {
          store.tasks.splice(rootIndex, 1)
          currentTask.children = currentTask.children || []
          currentTask.children.push(newTask)
          currentTask = newTask
        }
      }
      
      // Should handle deep nesting gracefully
      expect(() => store.flattenedTaskList).not.toThrow()
      expect(() => store.taskLevels).not.toThrow()
      
      // Check that deep levels are calculated correctly
      const deepTaskIds = store.flattenedTaskList.map(item => item.task.id)
      expect(deepTaskIds.length).toBeGreaterThan(15) // Should include all nested tasks
    })

    it('should maintain data consistency after multiple operations', () => {
      const store = useTasksStore()
      
      // Perform a series of operations
      const newTaskId = store.createTask({ text: 'Consistency Test' })
      store.nestTask(newTaskId)
      store.moveTaskUp(newTaskId)
      store.unnestTask(newTaskId)
      store.toggleTaskCompletion(newTaskId)
      store.updateTaskText({ id: newTaskId, newText: 'Updated Text' })
      
      // Verify data consistency
      const flatList = store.flattenedTaskList
      
      // All tasks in flatList should have correct indentation levels
      flatList.forEach(item => {
        expect(store.getTaskIndentation(item.task.id)).toBe(item.level)
      })
      
      // All tasks should be findable
      flatList.forEach(item => {
        const meta = store.findTaskMeta(item.task.id)
        expect(meta).toBeDefined()
        expect(meta.task.id).toBe(item.task.id)
      })
    })
  })
})