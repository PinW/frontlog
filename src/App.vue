<script setup>
import { ref, watch, onMounted, onBeforeUpdate, nextTick } from 'vue'
import { useTasksStore } from './stores/tasks'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import HotkeyHelper from './components/HotkeyHelper.vue'
import TaskItem from './components/TaskItem.vue'

// Add import for process.env if needed (Vite exposes import.meta.env)
const isDev = import.meta.env.MODE === 'development'

// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount, activeTaskId, flattenedTaskList } = storeToRefs(tasksStore)
const {
  addTask,
  insertTaskAfter,
  removeTask,
  toggleTaskCompletion,
  selectNextTask,
  selectPreviousTask,
  updateTaskText,
  moveTaskUp,
  moveTaskDown,
  nestTask,
  unnestTask
} = tasksStore

// Function to get the indentation level of a task
const getTaskIndentation = (taskId) => {
  let indentation = 0;
  let currentTask = taskList.value.find(task => task.id === taskId);
  while (currentTask && currentTask.parentId) {
    indentation++;
    currentTask = taskList.value.find(task => task.id === currentTask.parentId);
  }
  return indentation;
}

// Refs for the editable div elements
const taskInputRefs = ref({})

// New state for cursor's desired horizontal position and navigation direction
const desiredXPosition = ref(null)
const navigationDirection = ref(null)

/**
 * Gets the current cursor's horizontal position (x-coordinate) and stores it.
 */
function updateDesiredXPosition() {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    // Get the bounding box of the cursor's range
    const range = selection.getRangeAt(0)
    const rect = range.getClientRects()[0]
    if (rect) {
      desiredXPosition.value = rect.left
    }
  }
}

/**
 * Places the cursor at the given {x, y} coordinates within the specified element.
 * Handles cross-browser differences between caretRangeFromPoint and caretPositionFromPoint.
 * @param {HTMLElement} element - The contenteditable element to place the cursor in.
 * @param {{x: number, y: number}} coords - The screen coordinates where the cursor should be placed.
 */
function placeCursorAtCoordinates(element, coords) {
  if (!element || !coords) return;
  const selection = window.getSelection();
  let range = null;
  // Try modern caretRangeFromPoint (Chrome, Firefox)
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(coords.x, coords.y);
  } else if (document.caretPositionFromPoint) {
    // Firefox alternative
    const pos = document.caretPositionFromPoint(coords.x, coords.y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
    }
  }
  if (range) {
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Function to add a new task
function insertTask(insertAbove = false) {
  let prevTaskId = null;
  if (activeTaskId.value) {
    const flat = taskList.value;
    const currentIndex = flat.findIndex(task => task.id === activeTaskId.value);
    if (insertAbove) {
      // Insert above: find the previous task in the flat list
      prevTaskId = currentIndex > 0 ? flat[currentIndex - 1].id : null;
    } else {
      // Insert below: use the current task as previous
      prevTaskId = activeTaskId.value;
    }
  }
  // If no active task, insert at root start
  const newId = tasksStore.insertTaskAfter(prevTaskId, '');
  activeTaskId.value = newId;
  nextTick(() => {
    const el = taskInputRefs.value[newId];
    if (el) el.focus();
  });
}

// Add onFocus and onBlur handlers
function onFocus(taskId) {
  activeTaskId.value = taskId
}
function onBlur(task, event) {
  onTaskInput(task, event)
  activeTaskId.value = null
}

// **LIFECYCLE HOOKS FOR REF MANAGEMENT**

// Before each update, clear the refs object.
// This is crucial to prevent stale refs when the list changes.
onBeforeUpdate(() => {
  taskInputRefs.value = {}
})

// Utility: Recursively sync innerText for all tasks at all levels
function syncAllTaskTexts(tasks, refs) {
  for (const task of tasks) {
    const el = refs[task.id];
    if (el) el.innerText = task.text;
    if (task.children && task.children.length) {
      syncAllTaskTexts(task.children, refs);
    }
  }
}

// When the component mounts, populate the divs and focus the active task.
onMounted(() => {
  // Wait for refs to be populated, then sync all task texts
  nextTick(() => {
    syncAllTaskTexts(tasksStore.tasks, taskInputRefs.value);
  });
  // Seed an empty task if there are no tasks
  if (taskList.value.length === 0) {
    const newId = tasksStore.insertTaskAfter(null, '')
    activeTaskId.value = newId
    nextTick(() => {
      const el = taskInputRefs.value[newId]
      if (el) el.focus()
    })
  } else {
    // Pre-select the first task if available
    if (taskList.value.length > 0) {
      activeTaskId.value = taskList.value[0].id
      if (taskInputRefs.value[activeTaskId.value]) {
        taskInputRefs.value[activeTaskId.value].focus()
      }
    }
  }
})

// **EVENT HANDLERS & WATCHERS**

const onTaskInput = (task, event) => {
  updateTaskText({ id: task.id, newText: event.target.innerText })
}

// Watch for changes in the active task ID to focus and place cursor smartly only when navigating at top/bottom
watch(activeTaskId, (newId, oldId) => {
  if (!newId) return;

  nextTick(() => {
    const el = taskInputRefs.value[newId];
    if (!el) return;

    el.focus();

    // Only apply smart X position if we navigated up/down at the top/bottom boundary
    if (desiredXPosition.value !== null && oldId !== null && navigationDirection.value) {
      const elRect = el.getBoundingClientRect();

      // **THE FIX**: Clamp the desired X position to be within the new element's bounds.
      let targetX = desiredXPosition.value;
      if (targetX < elRect.left) {
        targetX = elRect.left;
      }

      let yCoord = elRect.top + 5;
      if (navigationDirection.value === 'up') {
        yCoord = elRect.bottom - 5;
      }
      
      const targetCoords = {
        x: targetX,
        y: yCoord
      };
      
      placeCursorAtCoordinates(el, targetCoords);
      navigationDirection.value = null;
    }
  });
});

// Keyboard navigation for multi-line tasks
useEventListener(window, 'keydown', (event) => {
  
  // Navigation keys
  const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (event.key === 'Escape') {
    // Blur the active task if any
    if (activeTaskId.value) {
      const el = taskInputRefs.value[activeTaskId.value];
      if (el) {
        el.blur();
      }
      activeTaskId.value = null;
    }
    return;
  }
  // Handle ENTER key for inserting a new task
  if (event.key === 'Enter' && activeTaskId.value) {
    // Control+Enter toggles completion
    if (event.ctrlKey) {
      event.preventDefault();
      toggleTaskCompletion(activeTaskId.value);
      return;
    }
    // Only trigger if the active element is a task input
    const el = taskInputRefs.value[activeTaskId.value];
    if (el && document.activeElement === el) {
      if (!event.shiftKey) {
        event.preventDefault();
        const selection = window.getSelection();
        const isAtStart = selection.anchorOffset === 0 && selection.focusOffset === 0;
        const isEmpty = el.innerText.trim() === '';

        insertTask(isAtStart && !isEmpty);
        return;
      }
      // If shiftKey is pressed, allow default (newline)
    }
  }
  // Handle backspace and delete
  if (event.key === 'Backspace' || event.key === 'Delete') {
    if (activeTaskId.value) {
      const element = taskInputRefs.value[activeTaskId.value];
      const flat = flattenedTaskList.value;
      const currentIndex = flat.findIndex(item => item.task.id === activeTaskId.value);
      let newActiveTaskId = null;
      if (element && element.innerText.trim() === '' && flat.length > 1) {
        event.preventDefault();
        if (event.key === 'Delete') {
          // Next in list, or previous if at the end
          if (currentIndex < flat.length - 1) {
            newActiveTaskId = flat[currentIndex + 1].task.id;
          } else if (currentIndex > 0) {
            newActiveTaskId = flat[currentIndex - 1].task.id;
          }
        } else { // Backspace
          // Previous in list, or next if at the start
          if (currentIndex > 0) {
            newActiveTaskId = flat[currentIndex - 1].task.id;
          } else if (flat.length > 1) {
            newActiveTaskId = flat[1].task.id;
          }
        }
        // Remove the task
        removeTask(activeTaskId.value);
        // Set the new active task
        activeTaskId.value = newActiveTaskId ?? null;
        // Clear selection before removal
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
        nextTick(() => {
          const sel2 = window.getSelection();
          if (sel2) sel2.removeAllRanges();
          if (activeTaskId.value && taskInputRefs.value[activeTaskId.value]) {
            const elToFocus = taskInputRefs.value[activeTaskId.value];
            elToFocus.focus();
          }
        });
        return;
      }
    }
  }

  // Handle Tab for nesting and Shift+Tab for unnesting, and Ctrl+ArrowRight/Left for the same actions
  if ((event.key === 'Tab' && activeTaskId.value) ||
      (event.key === 'ArrowRight' && event.ctrlKey && activeTaskId.value) ||
      (event.key === 'ArrowLeft' && event.ctrlKey && activeTaskId.value)) {
    event.preventDefault();

    let relativePos = null;
    const selection = window.getSelection();
    const element = taskInputRefs.value[activeTaskId.value];

    // Capture the relative visual position before the action
    if (selection && selection.rangeCount > 0 && element) {
      const cursorRect = selection.getRangeAt(0).getClientRects()[0];
      const elementRect = element.getBoundingClientRect();
      if (cursorRect) {
        relativePos = {
          x: cursorRect.left - elementRect.left,
          y: cursorRect.top - elementRect.top,
        };
      }
    }

    // Perform the nest or unnest action
    if ((event.key === 'Tab' && event.shiftKey) || event.key === 'ArrowLeft') {
      unnestTask(activeTaskId.value);
    } else if (event.key === 'Tab' || event.key === 'ArrowRight') {
      nestTask(activeTaskId.value);
    }

    // After the DOM update, restore the cursor's position
    nextTick(() => {
      syncAllTaskTexts(tasksStore.tasks, taskInputRefs.value);
      const el = taskInputRefs.value[activeTaskId.value];
      if (!el || !relativePos) return;

      el.focus(); // Focus first
      const elRect = el.getBoundingClientRect();
      const absoluteCoords = {
        x: elRect.left + relativePos.x,
        y: elRect.top + relativePos.y,
      };
      placeCursorAtCoordinates(el, absoluteCoords);
    });
    return;
  }

  // Handle Ctrl+ArrowUp/Down for reordering tasks
  if (event.ctrlKey && activeTaskId.value) {
    let relativePos = null;
    const selection = window.getSelection();
    const element = taskInputRefs.value[activeTaskId.value];

    // Capture the relative visual position before any action
    if (selection && selection.rangeCount > 0 && element) {
      const cursorRect = selection.getRangeAt(0).getClientRects()[0];
      const elementRect = element.getBoundingClientRect();
      if (cursorRect) {
        relativePos = {
          x: cursorRect.left - elementRect.left,
          y: cursorRect.top - elementRect.top,
        };
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTaskUp(activeTaskId.value);
      nextTick(() => {
        syncAllTaskTexts(tasksStore.tasks, taskInputRefs.value);
        const el = taskInputRefs.value[activeTaskId.value];
        if (!el || !relativePos) return;

        el.focus();
        const elRect = el.getBoundingClientRect();
        // Calculate the new absolute screen position from the stored relative position
        const absoluteCoords = {
          x: elRect.left + relativePos.x,
          y: elRect.top + relativePos.y,
        };
        placeCursorAtCoordinates(el, absoluteCoords);
      });
      return;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTaskDown(activeTaskId.value);
      nextTick(() => {
        syncAllTaskTexts(tasksStore.tasks, taskInputRefs.value);
        const el = taskInputRefs.value[activeTaskId.value];
        if (!el || !relativePos) return;

        el.focus();
        const elRect = el.getBoundingClientRect();
        // Calculate the new absolute screen position from the stored relative position
        const absoluteCoords = {
          x: elRect.left + relativePos.x,
          y: elRect.top + relativePos.y,
        };
        placeCursorAtCoordinates(el, absoluteCoords);
      });
      return;
    }
  }
  
  // Navigational keys
  if (!navKeys.includes(event.key)) return;

  // If no active task, select first/last depending on key
  if (!activeTaskId.value) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      if (taskList.value.length > 0) {
        activeTaskId.value = taskList.value[taskList.value.length - 1].id;
        if (taskInputRefs.value[activeTaskId.value]) {
          taskInputRefs.value[activeTaskId.value].focus();
        }
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      if (taskList.value.length > 0) {
        activeTaskId.value = taskList.value[0].id;
        if (taskInputRefs.value[activeTaskId.value]) {
          taskInputRefs.value[activeTaskId.value].focus();
        }
      }
    }
    return;
  }

  // Existing up/down navigation logic
  const currentTaskId = activeTaskId.value;
  const element = taskInputRefs.value[currentTaskId];
  if (!element) return;

  // Before navigating up or down, store the current X position and direction
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    updateDesiredXPosition();
    navigationDirection.value = event.key === 'ArrowUp' ? 'up' : 'down';
  }

  // If the task is empty, always allow up/down navigation
  const isEmpty = element.innerText.trim() === '';
  if (isEmpty) {
    event.preventDefault();
    if (event.key === 'ArrowDown') {
      selectNextTask();
    } else if (event.key === 'ArrowUp') {
      selectPreviousTask();
    }
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const elementRect = element.getBoundingClientRect();
  const cursorRect = selection.getRangeAt(0).getClientRects()[0];

  // If cursorRect is undefined, treat it as being at the boundary.
  const atTopBoundary = !cursorRect || cursorRect.top <= elementRect.top + 5;
  const atBottomBoundary = !cursorRect || cursorRect.bottom >= elementRect.bottom - 5;

  if (event.key === 'ArrowDown' && atBottomBoundary) {
    event.preventDefault();
    selectNextTask();
  } else if (event.key === 'ArrowUp' && atTopBoundary) {
    event.preventDefault();
    selectPreviousTask();
  }
});

function clearLocalStorage() {
  localStorage.clear();
  location.reload();
  // After reload, onMounted will sync all task texts
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
    <div class="fixed top-2 left-2 z-50 flex gap-2">
      <button
        v-if="isDev"
        @click="tasksStore.clearAllTasks()"
        class=" px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow hover:bg-red-700 transition-all"
        title="Clear all tasks (debug)"
      >
        Clear All Tasks
      </button>
      <button
        v-if="isDev"
        @click="clearLocalStorage"
        class="px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 transition-all"
        title="Clear local storage (debug)"
      >
        Clear Local Storage
      </button>
    </div>
    <div class="w-full max-w-md">
      <ul v-if="taskCount > 0">
        <TaskItem
          v-for="task in taskList"
          :key="task.id"
          :task="task"
          :activeTaskId="activeTaskId"
          :taskInputRefs="taskInputRefs"
          :getTaskIndentation="getTaskIndentation"
          :toggleTaskCompletion="toggleTaskCompletion"
          :onTaskInput="onTaskInput"
          :onFocus="onFocus"
          :onBlur="onBlur"
          :updateDesiredXPosition="updateDesiredXPosition"
        />
      </ul>
    </div>
    <HotkeyHelper />
  </div>
</template>