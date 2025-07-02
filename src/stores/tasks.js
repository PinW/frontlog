import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

// defineStore takes the store name, a setup function, and an options object
export const useTasksStore = defineStore('tasks', () => {
  // --- STATE ---
  // State is now defined with ref()
  const tasks = ref([])

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
    }
  }

  /**
   * Clears all tasks from the list.
   */
  function clearAllTasks() {
    tasks.value = []
  }

  // --- RETURN ---
  return {
    tasks,
    taskList,
    taskCount,
    addTask,
    removeTask,
    toggleTaskCompletion,
    clearAllTasks,
  }

}, {
  // --- STORE OPTIONS ---
  // This is where plugin configurations like 'persist' go.
  persist: true,
})