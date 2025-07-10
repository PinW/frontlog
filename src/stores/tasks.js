import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

// defineStore takes the store name, a setup function, and an options object
export const useTasksStore = defineStore('tasks', () => {
  // --- STATE ---
  // State is now defined with ref()
  const tasks = ref([
    {
      id: '1',
      text: 'Project Alpha',
      completed: false,
      children: [
        {
          id: '1-1',
          text: 'Design',
          completed: false,
          children: [
            {
              id: '1-1-1',
              text: 'Wireframes',
              completed: false,
              children: []
            },
            {
              id: '1-1-2',
              text: 'Mockups',
              completed: false,
              children: []
            }
          ]
        },
        {
          id: '1-2',
          text: 'Development',
          completed: false,
          children: [
            {
              id: '1-2-1',
              text: 'Frontend',
              completed: false,
              children: []
            },
            {
              id: '1-2-2',
              text: 'Backend',
              completed: false,
              children: []
            }
          ]
        }
      ]
    },
    {
      id: '2',
      text: 'Project Beta',
      completed: false,
      children: [
        {
          id: '2-1',
          text: 'Research',
          completed: false,
          children: []
        }
      ]
    }
  ])
  const activeTaskId = ref(null)

  // --- GETTERS ---
  const taskList = computed(() => tasks.value)
  const taskCount = computed(() => tasks.value.length)

  /**
   * Returns a flat array of all tasks in visual order (preorder traversal).
   */
  const flattenedTaskList = computed(() => {
    function flatten(arr, result = []) {
      for (const task of arr) {
        result.push(task)
        if (task.children && task.children.length) {
          flatten(task.children, result)
        }
      }
      return result
    }
    return flatten(tasks.value)
  })

  // --- ACTIONS ---
  /**
   * Inserts a new task after the given task ID at the same hierarchy level.
   * If prevTaskId is null, inserts at the start of the root.
   * @param {string|null} prevTaskId - The ID of the task after which to insert, or null for root start.
   * @param {string} text - The content of the new task.
   * @returns {string} The new task's ID.
   */
  function insertTaskAfter(prevTaskId, text) {
    const trimmedText = text ? text.trim() : ''
    const newTask = {
      id: uuidv4(),
      text: trimmedText,
      completed: false,
      children: []
    }
    if (!prevTaskId) {
      tasks.value.unshift(newTask)
      return newTask.id
    }
    // Helper to recursively find and insert after prevTaskId
    function recursiveInsert(arr) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id === prevTaskId) {
          arr.splice(i + 1, 0, newTask)
          return true
        }
        if (arr[i].children && arr[i].children.length) {
          if (recursiveInsert(arr[i].children)) return true
        }
      }
      return false
    }
    recursiveInsert(tasks.value)
    return newTask.id
  }

  /**
   * Removes a task from the list by its ID.
   * @param {string} taskId - The ID of the task to remove.
   */
  function removeTask(taskId) {
    function recursiveRemove(arr) {
      const idx = arr.findIndex(task => task.id === taskId)
      if (idx !== -1) {
        const [removed] = arr.splice(idx, 1)
        if (removed && removed.children && removed.children.length) {
          // Insert children after the removed task's position
          arr.splice(idx, 0, ...removed.children)
        }
        return true
      }
      for (const task of arr) {
        if (task.children && task.children.length) {
          if (recursiveRemove(task.children)) return true
        }
      }
      return false
    }
    recursiveRemove(tasks.value)
  }

  /**
   * Toggles the 'completed' status of a task.
   * @param {string} taskId - The ID of the task to toggle.
   */
  function toggleTaskCompletion(taskId) {
    const task = tasks.value.find(task => task.id === taskId)
    if (task) {
      task.completed = !task.completed
      task.completionDate = task.completed ? new Date().toISOString() : null
    }
  }

  /**
   * Clears all tasks from the list.
   */
  function clearAllTasks() {
    tasks.value = []
  }

  /**
   * Selects the next task in the flattened list.
   */
  function selectNextTask() {
    const flat = flattenedTaskList.value
    if (flat.length === 0) return
    const currentIndex = flat.findIndex(task => task.id === activeTaskId.value)
    const nextIndex = (currentIndex + 1) % flat.length
    activeTaskId.value = flat[nextIndex].id
  }

  /**
   * Selects the previous task in the flattened list.
   */
  function selectPreviousTask() {
    const flat = flattenedTaskList.value
    if (flat.length === 0) return
    const currentIndex = flat.findIndex(task => task.id === activeTaskId.value)
    const previousIndex = (currentIndex - 1 + flat.length) % flat.length
    activeTaskId.value = flat[previousIndex].id
  }

  /**
   * Updates the text of a specific task.
   * @param { {id: string, newText: string} } payload
   */
  function updateTaskText({ id, newText }) {
    function recursiveUpdate(arr) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          arr[i].text = newText;
          return true;
        }
        if (arr[i].children && arr[i].children.length) {
          if (recursiveUpdate(arr[i].children)) {
            // Force reactivity on the children array
            arr[i].children = [...arr[i].children];
            return true;
          }
        }
      }
      return false;
    }
    recursiveUpdate(tasks.value);
    // Force reactivity on the root array
    tasks.value = [...tasks.value];
  }

  /**
   * Moves a task up in the list.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskUp(taskId) {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index > 0) {
      const taskToMove = tasks.value[index]
      tasks.value.splice(index, 1) // Remove task from current position
      tasks.value.splice(index - 1, 0, taskToMove) // Insert task at new position
    }
  }

  /**
   * Moves a task down in the list.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskDown(taskId) {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index < tasks.value.length - 1 && index !== -1) {
      const taskToMove = tasks.value[index]
      tasks.value.splice(index, 1) // Remove task from current position
      tasks.value.splice(index + 1, 0, taskToMove) // Insert task at new position
    }
  }

  /**
   * Nests a task under another task.
   * @param {string} taskId - The ID of the task to nest.
   * @param {string} parentId - The ID of the parent task.
   */
  function nestTask(taskId, parentId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.parentId = parentId
    }
  }

  /**
   * Unnests a task.
   * @param {string} taskId - The ID of the task to unnest.
   */
  function unnestTask(taskId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task && task.parentId) {
      const parentTask = tasks.value.find(t => t.id === task.parentId)
      if (parentTask) {
        task.parentId = parentTask.parentId
      } else {
        task.parentId = null // Should not happen if parentId is valid, but as a fallback
      }
    }
  }

  // --- RETURN ---
  return {
    tasks,
    activeTaskId,
    taskList,
    taskCount,
    flattenedTaskList,
    insertTaskAfter,
    removeTask,
    toggleTaskCompletion,
    clearAllTasks,
    selectNextTask,
    selectPreviousTask,
    updateTaskText,
    moveTaskUp,
    moveTaskDown,
    nestTask,
    unnestTask,
  }

}, {
  // --- STORE OPTIONS ---
  // This is where plugin configurations like 'persist' go.
  persist: true,
})