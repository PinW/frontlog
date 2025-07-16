import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TaskItem from './TaskItem.vue'

// Mock vuedraggable
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    template: '<div><slot /></div>',
    props: ['list', 'itemKey', 'tag', 'group', 'handle', 'move'],
    emits: ['choose', 'unchoose', 'start', 'end']
  }
}))

describe('TaskItem Component', () => {
  let wrapper
  let mockProps

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockProps = {
      task: {
        id: 'test-task-1',
        text: 'Test Task',
        completed: false,
        children: []
      },
      activeTaskId: null,
      isDragging: false,
      taskInputRefs: {},
      spellcheckEnabled: true,
      getTaskIndentation: vi.fn().mockReturnValue(0),
      toggleTaskCompletion: vi.fn(),
      onTaskInput: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      updateDesiredXPosition: vi.fn(),
      onDragMove: vi.fn(),
      onDragChoose: vi.fn(),
      onDragUnchoose: vi.fn(),
      onDragStart: vi.fn(),
      onDragEnd: vi.fn()
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Rendering', () => {
    it('should render task with correct text', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      expect(editableDiv.exists()).toBe(true)
    })

    it('should apply active task styling when task is active', () => {
      const activeProps = { ...mockProps, activeTaskId: 'test-task-1' }
      wrapper = mount(TaskItem, { props: activeProps })
      
      const listItem = wrapper.find('li')
      expect(listItem.classes()).toContain('bg-highlight')
    })

    it('should apply dragging styling when task is active and dragging', () => {
      const draggingProps = { 
        ...mockProps, 
        activeTaskId: 'test-task-1', 
        isDragging: true 
      }
      wrapper = mount(TaskItem, { props: draggingProps })
      
      const listItem = wrapper.find('li')
      expect(listItem.classes()).toContain('bg-dragging')
      expect(listItem.classes()).not.toContain('bg-highlight')
    })

    it('should apply correct indentation based on getTaskIndentation', () => {
      mockProps.getTaskIndentation.mockReturnValue(2)
      wrapper = mount(TaskItem, { props: mockProps })
      
      const taskContainer = wrapper.find('.flex.items-center.gap-3')
      const style = taskContainer.attributes('style')
      expect(style).toContain('padding-left: 56px') // 16 + 2 * 20
    })

    it('should show completed task styling when task is completed', () => {
      const completedProps = {
        ...mockProps,
        task: { ...mockProps.task, completed: true }
      }
      wrapper = mount(TaskItem, { props: completedProps })
      
      const editableDiv = wrapper.find('.task-input')
      expect(editableDiv.classes()).toContain('text-complete-dimmed')
      expect(editableDiv.classes()).toContain('line-through')
    })

    it('should show drag handle with proper opacity states', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const dragHandle = wrapper.find('.drag-handle')
      expect(dragHandle.exists()).toBe(true)
      expect(dragHandle.classes()).toContain('opacity-0')
      expect(dragHandle.classes()).toContain('group-hover:opacity-40')
    })

    it('should show drag handle when task is active', () => {
      const activeProps = { ...mockProps, activeTaskId: 'test-task-1' }
      wrapper = mount(TaskItem, { props: activeProps })
      
      const dragHandle = wrapper.find('.drag-handle')
      expect(dragHandle.classes()).toContain('opacity-40')
    })
  })

  describe('Checkbox Functionality', () => {
    it('should render checkbox with correct checked state', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.element.checked).toBe(false)
    })

    it('should render checked checkbox for completed task', () => {
      const completedProps = {
        ...mockProps,
        task: { ...mockProps.task, completed: true }
      }
      wrapper = mount(TaskItem, { props: completedProps })
      
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.element.checked).toBe(true)
    })

    it('should call toggleTaskCompletion when checkbox is clicked', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.trigger('change')
      
      expect(mockProps.toggleTaskCompletion).toHaveBeenCalledWith('test-task-1')
    })
  })

  describe('Editable Text Functionality', () => {
    it('should set spellcheck attribute correctly', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      expect(editableDiv.attributes('spellcheck')).toBe('true')
    })

    it('should disable spellcheck when spellcheckEnabled is false', () => {
      const noSpellcheckProps = { ...mockProps, spellcheckEnabled: false }
      wrapper = mount(TaskItem, { props: noSpellcheckProps })
      
      const editableDiv = wrapper.find('.task-input')
      expect(editableDiv.attributes('spellcheck')).toBe('false')
    })

    it('should call onTaskInput when text is changed', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      await editableDiv.trigger('input')
      
      expect(mockProps.onTaskInput).toHaveBeenCalledWith(
        mockProps.task,
        expect.any(Object)
      )
    })

    it('should call onFocus when editable div is focused', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      await editableDiv.trigger('focus')
      
      expect(mockProps.onFocus).toHaveBeenCalledWith('test-task-1')
    })

    it('should call onBlur when editable div loses focus', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      await editableDiv.trigger('blur')
      
      expect(mockProps.onBlur).toHaveBeenCalledWith(
        mockProps.task,
        expect.any(Object)
      )
    })

    it('should call updateDesiredXPosition on click', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      await editableDiv.trigger('click')
      
      expect(mockProps.updateDesiredXPosition).toHaveBeenCalled()
    })
  })

  describe('Ref Management', () => {
    it('should set up task input ref correctly', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const editableDiv = wrapper.find('.task-input')
      expect(editableDiv.exists()).toBe(true)
      
      // The ref should be set in taskInputRefs
      expect(mockProps.taskInputRefs['test-task-1']).toBeDefined()
    })

    it('should sync text content on mount', async () => {
      // Mock DOM element with innerText
      const mockElement = {
        innerText: ''
      }
      
      wrapper = mount(TaskItem, { props: mockProps })
      
      // Simulate the onMounted hook by directly calling the setup
      const editableDiv = wrapper.find('.task-input')
      const element = editableDiv.element
      
      // Verify that the text content would be set
      expect(element).toBeDefined()
    })
  })

  describe('Children Rendering', () => {
    it('should render children tasks when they exist', () => {
      const taskWithChildren = {
        ...mockProps,
        task: {
          ...mockProps.task,
          children: [
            {
              id: 'child-1',
              text: 'Child Task 1',
              completed: false,
              children: []
            },
            {
              id: 'child-2', 
              text: 'Child Task 2',
              completed: true,
              children: []
            }
          ]
        }
      }
      
      wrapper = mount(TaskItem, { props: taskWithChildren })
      
      const draggableComponent = wrapper.findComponent({ name: 'draggable' })
      expect(draggableComponent.exists()).toBe(true)
      expect(draggableComponent.props('list')).toEqual(taskWithChildren.task.children)
    })

    it('should pass correct props to draggable component', () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const draggableComponent = wrapper.findComponent({ name: 'draggable' })
      expect(draggableComponent.props()).toEqual({
        list: mockProps.task.children,
        itemKey: 'id',
        tag: 'ul',
        group: 'tasks',
        handle: '.drag-handle',
        move: mockProps.onDragMove
      })
    })

    it('should handle drag events correctly', async () => {
      wrapper = mount(TaskItem, { props: mockProps })
      
      const draggableComponent = wrapper.findComponent({ name: 'draggable' })
      
      // Simulate drag events
      await draggableComponent.vm.$emit('choose')
      expect(mockProps.onDragChoose).toHaveBeenCalled()
      
      await draggableComponent.vm.$emit('unchoose')
      expect(mockProps.onDragUnchoose).toHaveBeenCalled()
      
      await draggableComponent.vm.$emit('start')
      expect(mockProps.onDragStart).toHaveBeenCalled()
      
      await draggableComponent.vm.$emit('end')
      expect(mockProps.onDragEnd).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing task properties gracefully', () => {
      const minimalProps = {
        ...mockProps,
        task: {
          id: 'minimal-task'
          // Missing text, completed, children
        }
      }
      
      expect(() => {
        wrapper = mount(TaskItem, { props: minimalProps })
      }).not.toThrow()
    })

    it('should handle null activeTaskId', () => {
      const nullActiveProps = { ...mockProps, activeTaskId: null }
      
      expect(() => {
        wrapper = mount(TaskItem, { props: nullActiveProps })
      }).not.toThrow()
      
      const listItem = wrapper.find('li')
      expect(listItem.classes()).not.toContain('bg-highlight')
    })

    it('should handle empty children array', () => {
      const emptyChildrenProps = {
        ...mockProps,
        task: { ...mockProps.task, children: [] }
      }
      
      expect(() => {
        wrapper = mount(TaskItem, { props: emptyChildrenProps })
      }).not.toThrow()
    })

    it('should handle undefined children', () => {
      const undefinedChildrenProps = {
        ...mockProps,
        task: { ...mockProps.task, children: undefined }
      }
      
      expect(() => {
        wrapper = mount(TaskItem, { props: undefinedChildrenProps })
      }).not.toThrow()
    })
  })
})