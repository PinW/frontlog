import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

// defineStore takes the store name, a setup function, and an options object
export const useTasksStore = defineStore('tasks', () => {
  // --- STATE ---
  // State is now defined with ref()
  const tasks = ref([])
  const activeTaskId = ref(null)

  // --- GETTERS ---
  const taskList = computed(() => tasks.value)
  const taskCount = computed(() => tasks.value.length)

  // --- ACTIONS ---
  /**
   * Adds a new task to the list.
   * @param {string} text - The content of the new task.
   */
  function addTask(text) {
    const trimmedText = text ? text.trim() : ''
    if (!trimmedText) return

    // All state access must use .value
    tasks.value.unshift({
      id: uuidv4(),
      text: trimmedText,
      completed: false
    })
  }

  /**
   * Inserts a new task at a specific index in the list.
   * @param {number} index - The index after which to insert the new task.
   * @param {string} text - The content of the new task.
   * If index is -1, inserts at the start.
   */
  function insertTaskAt(index, text, insertAbove = false) {
    const trimmedText = text ? text.trim() : ''
    // Allow empty string for quick-add
    const newTask = {
      id: uuidv4(),
      text: trimmedText,
      completed: false
    }
    if (index < 0) {
      tasks.value.unshift(newTask)
    } else {
      tasks.value.splice(insertAbove ? index : index + 1, 0, newTask)
    }
    return newTask.id
  }

  /**
   * Removes a task from the list by its ID.
   * @param {string} taskId - The ID of the task to remove.
   */
  function removeTask(taskId) {
    tasks.value = tasks.value.filter(task => task.id !== taskId)
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
   * Selects the next task in the list.
   */
  function selectNextTask() {
    if (tasks.value.length === 0) return
    const currentIndex = tasks.value.findIndex(task => task.id === activeTaskId.value)
    const nextIndex = (currentIndex + 1) % tasks.value.length
    activeTaskId.value = tasks.value[nextIndex].id
  }

  /**
   * Selects the previous task in the list.
   */
  function selectPreviousTask() {
    if (tasks.value.length === 0) return
    const currentIndex = tasks.value.findIndex(task => task.id === activeTaskId.value)
    const previousIndex = (currentIndex - 1 + tasks.value.length) % tasks.value.length
    activeTaskId.value = tasks.value[previousIndex].id
  }

  /**
   * Updates the text of a specific task.
   * @param { {id: string, newText: string} } payload
   */
  function updateTaskText({ id, newText }) {
    const task = tasks.value.find(task => task.id === id)
    if (task) {
      task.text = newText
    }
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

  // --- RETURN ---
  return {
    tasks,
    activeTaskId,
    taskList,
    taskCount,
    addTask,
    insertTaskAt,
    removeTask,
    toggleTaskCompletion,
    clearAllTasks,
    selectNextTask,
    selectPreviousTask,
    updateTaskText,
    moveTaskUp,
    moveTaskDown,
  }

}, {
  // --- STORE OPTIONS ---
  // This is where plugin configurations like 'persist' go.
  persist: true,
})