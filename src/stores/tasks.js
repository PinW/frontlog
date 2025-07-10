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
  /**
   * Returns a flat array of all tasks in visual order (preorder traversal), with metadata.
   * Each item: { task, parent, level, arr }
   */
  function flatten(arr = tasks.value, parent = null, level = 0, arrRef = tasks.value, result = []) {
    for (const task of arr) {
      result.push({ task, parent, level, arr: arrRef })
      if (task.children && task.children.length) {
        flatten(task.children, task, level + 1, task.children, result)
      }
    }
    return result
  }

  const flattenedTaskList = computed(() => flatten())

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
    const currentIndex = flat.findIndex(task => task.task.id === activeTaskId.value)
    const nextIndex = (currentIndex + 1) % flat.length
    activeTaskId.value = flat[nextIndex].task.id
  }

  /**
   * Selects the previous task in the flattened list.
   */
  function selectPreviousTask() {
    const flat = flattenedTaskList.value
    if (flat.length === 0) return
    const currentIndex = flat.findIndex(task => task.task.id === activeTaskId.value)
    const previousIndex = (currentIndex - 1 + flat.length) % flat.length
    activeTaskId.value = flat[previousIndex].task.id
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
            arr[i].children = [...arr[i].children];
            return true;
          }
        }
      }
      return false;
    }
    recursiveUpdate(tasks.value);
    tasks.value = [...tasks.value];
  }

  /**
   * Moves a task up in the list.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskUp(taskId) {
    const flat = flatten();
    const idx = flat.findIndex(item => item.task.id === taskId);
    if (idx === -1) return;
    const meta = flat[idx];
    const arr = meta.arr;
    const arrIdx = arr.findIndex(t => t.id === taskId);
    if (arrIdx > 0) {
      // Swap with previous sibling
      [arr[arrIdx - 1], arr[arrIdx]] = [arr[arrIdx], arr[arrIdx - 1]];
      return;
    }
    // At first sibling
    if (!meta.parent) return; // Already at root, can't go higher
    // Find parent's meta
    const parentMeta = flat.find(item => item.task.id === meta.parent.id);
    if (!parentMeta) return;
    const parentArr = parentMeta.arr;
    const parentIdx = parentArr.findIndex(t => t.id === meta.parent.id);
    // Check for parent's previous sibling
    if (parentIdx > 0) {
      // Move to end of previous sibling's children
      const prevSibling = parentArr[parentIdx - 1];
      prevSibling.children = prevSibling.children || [];
      // Remove from current
      arr.splice(arrIdx, 1);
      prevSibling.children.push(meta.task);
      return;
    }
    // No parent's previous sibling: unnest and insert before parent
    // Remove from current
    arr.splice(arrIdx, 1);
    parentArr.splice(parentIdx, 0, meta.task);
  }

  /**
   * Moves a task down in the list.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskDown(taskId) {
    const flat = flatten();
    const idx = flat.findIndex(item => item.task.id === taskId);
    if (idx === -1) return;
    const meta = flat[idx];
    const arr = meta.arr;
    const arrIdx = arr.findIndex(t => t.id === taskId);
    if (arrIdx < arr.length - 1) {
      // Swap with next sibling
      [arr[arrIdx], arr[arrIdx + 1]] = [arr[arrIdx + 1], arr[arrIdx]];
      return;
    }
    // At last sibling
    if (!meta.parent) return; // Already at root, can't go lower
    // Find parent's meta
    const parentMeta = flat.find(item => item.task.id === meta.parent.id);
    if (!parentMeta) return;
    const parentArr = parentMeta.arr;
    const parentIdx = parentArr.findIndex(t => t.id === meta.parent.id);
    // Check for parent's next sibling
    if (parentIdx < parentArr.length - 1) {
      // Move to start of next sibling's children
      const nextSibling = parentArr[parentIdx + 1];
      nextSibling.children = nextSibling.children || [];
      // Remove from current
      arr.splice(arrIdx, 1);
      nextSibling.children.unshift(meta.task);
      return;
    }
    // No parent's next sibling: unnest one level (insert after parent)
    // Remove from current
    arr.splice(arrIdx, 1);
    parentArr.splice(parentIdx + 1, 0, meta.task);
  }

  /**
   * Nests a task under the closest previous same-level sibling.
   * @param {string} taskId - The ID of the task to nest.
   */
  function nestTask(taskId) {
    const flat = flatten()
    const idx = flat.findIndex(item => item.task.id === taskId)
    if (idx <= 0) return // Can't nest first task
    const current = flat[idx]
    // Find closest previous same-level sibling
    for (let i = idx - 1; i >= 0; i--) {
      if (flat[i].level === current.level) {
        // Remove from current parent array
        const arr = current.arr
        const arrIdx = arr.findIndex(t => t.id === taskId)
        if (arrIdx !== -1) {
          const [taskToNest] = arr.splice(arrIdx, 1)
          // Add as last child of previous sibling
          flat[i].task.children = flat[i].task.children || []
          flat[i].task.children.push(taskToNest)
        }
        break
      }
    }
  }

  /**
   * Unnests a task (moves it up one level, after its parent).
   * @param {string} taskId - The ID of the task to unnest.
   */
  function unnestTask(taskId) {
    const flat = flatten()
    const idx = flat.findIndex(item => item.task.id === taskId)
    if (idx === -1) return
    const current = flat[idx]
    if (!current.parent) return // Already at root
    // Remove from current parent's children
    const parentArr = current.arr
    const arrIdx = parentArr.findIndex(t => t.id === taskId)
    if (arrIdx === -1) return
    const [taskToUnnest] = parentArr.splice(arrIdx, 1)
    // Insert after parent in parent's parent array
    const parentMeta = flat.find(item => item.task.id === current.parent.id)
    if (!parentMeta) return
    const grandArr = parentMeta.arr
    const parentIdx = grandArr.findIndex(t => t.id === current.parent.id)
    if (parentIdx !== -1) {
      grandArr.splice(parentIdx + 1, 0, taskToUnnest)
    }
  }

  // --- RETURN ---
  return {
    tasks,
    activeTaskId,
    taskList: computed(() => tasks.value),
    taskCount: computed(() => tasks.value.length),
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