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

  // --- HELPERS ---
  /**
   * Recursively finds a task and its context (parent, siblings, index) by its ID.
   * @param {string} taskId - The ID of the task to find.
   * @param {Array} arr - The array of tasks to search within.
   * @param {object|null} parent - The parent of the current array.
   * @returns {{task: object, parent: object|null, siblings: Array, index: number}|null}
   */
  function findTaskMeta(taskId, arr = tasks.value, parent = null) {
    for (let i = 0; i < arr.length; i++) {
      const task = arr[i];
      if (task.id === taskId) {
        return { task, parent, siblings: arr, index: i };
      }
      if (task.children && task.children.length) {
        const found = findTaskMeta(taskId, task.children, task);
        if (found) return found;
      }
    }
    return null;
  }

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
   * Creates and inserts a new task.
   * @param {{text: string, relativeToId: string|null, position: 'before'|'after'}} payload
   * @returns {string} The new task's ID.
   */
  function createTask({ text, relativeToId = null, position = 'after' }) {
    const newTask = {
      id: uuidv4(),
      text: text ? text.trim() : '',
      completed: false,
      children: []
    };

    // If there's no task to be relative to, insert at the top of the root.
    if (!relativeToId) {
      tasks.value.unshift(newTask);
      return newTask.id;
    }

    // Find the task we're inserting relative to.
    const meta = findTaskMeta(relativeToId);
    if (!meta) {
      // As a fallback, if the relative task isn't found, add to the root.
      tasks.value.push(newTask);
      return newTask.id;
    }

    if (position === 'after') {
      // Insert into the same list, right after the relative task.
      meta.siblings.splice(meta.index + 1, 0, newTask);
    } else if (position === 'before') {
      // Insert into the same list, right before the relative task.
      meta.siblings.splice(meta.index, 0, newTask);
    }

    return newTask.id;
  }

 /**
   * Removes a task from the list by its ID.
   * @param {string} taskId - The ID of the task to remove.
   */
 function removeTask(taskId) {
    const meta = findTaskMeta(taskId);
    if (!meta) return;

    const { task, siblings, index } = meta;
    
    // Remove the task from its array
    siblings.splice(index, 1);

    // If the removed task has children, insert them into the same array
    if (task.children && task.children.length > 0) {
      siblings.splice(index, 0, ...task.children);
    }
  }

 /**
   * Toggles the 'completed' status of a task.
   * @param {string} taskId - The ID of the task to toggle.
   */
  function toggleTaskCompletion(taskId) {
    const meta = findTaskMeta(taskId);
    if (meta && meta.task) {
      meta.task.completed = !meta.task.completed;
      meta.task.completionDate = meta.task.completed ? new Date().toISOString() : null;
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
    const meta = findTaskMeta(id);
    if (meta && meta.task) {
      meta.task.text = newText;
    }
  }

  /**
   * Moves a task up. If it's at the top of its list, it will try to become
   * the last child of its parent's previous sibling, or become its parent's
   * previous sibling if that fails.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskUp(taskId) {
    const meta = findTaskMeta(taskId);
    if (!meta) return;

    // Case 1: The task is not the first in its list. Swap with previous sibling.
    if (meta.index > 0) {
      const previousSibling = meta.siblings[meta.index - 1];
      meta.siblings[meta.index - 1] = meta.task;
      meta.siblings[meta.index] = previousSibling;
      return;
    }

    // Case 2: The task is the first in its list and has a parent.
    if (meta.parent) {
      const parentMeta = findTaskMeta(meta.parent.id);
      if (!parentMeta) return;

      // Subcase 2a: The parent has a previous sibling. Move task to end of its children.
      if (parentMeta.index > 0) {
        const newParent = parentMeta.siblings[parentMeta.index - 1];
        const [taskToMove] = meta.siblings.splice(meta.index, 1);
        newParent.children = newParent.children || [];
        newParent.children.push(taskToMove);
      } else {
        // Subcase 2b: The parent does not have a previous sibling. Un-nest the task.
        const [taskToMove] = meta.siblings.splice(meta.index, 1);
        parentMeta.siblings.splice(parentMeta.index, 0, taskToMove);
      }
    }
    // Case 3: The task is at the root and first in the list. Do nothing.
  }

  /**
   * Moves a task down. If it's at the bottom of its list, it will try to become
   * the first child of its parent's next sibling, or become its parent's
   * next sibling if that fails.
   * @param {string} taskId - The ID of the task to move.
   */
  function moveTaskDown(taskId) {
    const meta = findTaskMeta(taskId);
    if (!meta) return;

    // Case 1: The task is not the last in its list. Swap with next sibling.
    if (meta.index < meta.siblings.length - 1) {
      const nextSibling = meta.siblings[meta.index + 1];
      meta.siblings[meta.index + 1] = meta.task;
      meta.siblings[meta.index] = nextSibling;
      return;
    }

    // Case 2: The task is the last in its list and has a parent.
    if (meta.parent) {
      const parentMeta = findTaskMeta(meta.parent.id);
      if (!parentMeta) return;

      // Subcase 2a: The parent has a next sibling. Move task to start of its children.
      if (parentMeta.index < parentMeta.siblings.length - 1) {
        const newParent = parentMeta.siblings[parentMeta.index + 1];
        const [taskToMove] = meta.siblings.splice(meta.index, 1);
        newParent.children = newParent.children || [];
        newParent.children.unshift(taskToMove);
      } else {
        // Subcase 2b: The parent does not have a next sibling. Un-nest the task.
        const [taskToMove] = meta.siblings.splice(meta.index, 1);
        parentMeta.siblings.splice(parentMeta.index + 1, 0, taskToMove);
      }
    }
    // Case 3: The task is at the root and last in the list. Do nothing.
  }

  /**
   * Nests a task under its previous sibling.
   * @param {string} taskId - The ID of the task to nest.
   */
  function nestTask(taskId) {
    const meta = findTaskMeta(taskId);
    if (!meta || meta.index === 0) {
      // Can't nest if it's the first item in its list or not found.
      return;
    }

    // The new parent is the previous sibling.
    const newParent = meta.siblings[meta.index - 1];

    // Remove the task from its current list.
    const [taskToNest] = meta.siblings.splice(meta.index, 1);

    // Add it to the new parent's children.
    newParent.children = newParent.children || [];
    newParent.children.push(taskToNest);
  }

  /**
   * Unnests a task, moving it to be a sibling of its parent.
   * @param {string} taskId - The ID of the task to unnest.
   */
  function unnestTask(taskId) {
    const meta = findTaskMeta(taskId);
    if (!meta || !meta.parent) {
      // Can't unnest if it's at the root or not found.
      return;
    }

    // Find the parent's context.
    const parentMeta = findTaskMeta(meta.parent.id);
    if (!parentMeta) {
      // This should not happen if the tree is consistent.
      return;
    }

    // Remove the task from its current list.
    const [taskToUnnest] = meta.siblings.splice(meta.index, 1);

    // Add it to the parent's sibling list, right after the parent.
    parentMeta.siblings.splice(parentMeta.index + 1, 0, taskToUnnest);
  }

  // --- RETURN ---
  return {
    tasks,
    activeTaskId,
    taskList: computed(() => tasks.value),
    taskCount: computed(() => tasks.value.length),
    flattenedTaskList,
    createTask,
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