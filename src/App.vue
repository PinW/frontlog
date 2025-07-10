<script setup>
import { ref, watch, onMounted, onBeforeUpdate, nextTick } from 'vue'
import { useTasksStore } from './stores/tasks'
import { useSettingsStore } from './stores/settings'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import HotkeyHelper from './components/HotkeyHelper.vue'
import Settings from './components/Settings.vue'

// Add import for process.env if needed (Vite exposes import.meta.env)
const isDev = import.meta.env.MODE === 'development'

// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount, activeTaskId } = storeToRefs(tasksStore)
const settingsStore = useSettingsStore()
const { spellcheckEnabled } = storeToRefs(settingsStore)
const {
  addTask,
  insertTaskAt,
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
  // Find the index of the active task
  const currentIndex = taskList.value.findIndex(task => task.id === activeTaskId.value)
  // Insert a new empty task below the current one (or at the top if none active)
  const newId = tasksStore.insertTaskAt(currentIndex, '', insertAbove)
  // Set the new task as active
  activeTaskId.value = newId
  // Wait for DOM update, then focus the new task's contenteditable div
  nextTick(() => {
    const el = taskInputRefs.value[newId]
    if (el) el.focus()
  })
}

// **LIFECYCLE HOOKS FOR REF MANAGEMENT**

// Before each update, clear the refs object.
// This is crucial to prevent stale refs when the list changes.
onBeforeUpdate(() => {
  taskInputRefs.value = {}
})

// When the component mounts, populate the divs and focus the active task.
onMounted(() => {
  // Seed an empty task if there are no tasks
  if (taskList.value.length === 0) {
    const newId = tasksStore.insertTaskAt(-1, '')
    activeTaskId.value = newId
    nextTick(() => {
      const el = taskInputRefs.value[newId]
      if (el) el.focus()
    })
  } else {
    // Manually populate the text for all visible tasks
    taskList.value.forEach(task => {
      const el = taskInputRefs.value[task.id]
      if (el) {
        el.innerText = task.text
      }
    })
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
      const currentIndex = taskList.value.findIndex(task => task.id === activeTaskId.value);

      // Prevent deletion if only one task remains
      if (element && element.innerText.trim() === '' && taskList.value.length > 1) {
        event.preventDefault();

        // Determine the next active task
        let newActiveTaskId = null;
        if (taskList.value.length > 1) {
          if (event.key === 'Delete') {
            // Focus next task if possible, otherwise previous
            if (currentIndex < taskList.value.length - 1) {
              newActiveTaskId = taskList.value[currentIndex + 1].id;
            } else if (currentIndex > 0) {
              newActiveTaskId = taskList.value[currentIndex - 1].id;
            }
          } else { // Backspace
            if (currentIndex > 0) {
              newActiveTaskId = taskList.value[currentIndex - 1].id;
            } else {
              newActiveTaskId = taskList.value[1].id;
            }
          }
        }

        // Clear selection before removal
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();

        removeTask(activeTaskId.value);
        activeTaskId.value = newActiveTaskId;

        nextTick(() => {
          // Fallback: clear selection again after DOM update
          const sel2 = window.getSelection();
          if (sel2) sel2.removeAllRanges();

          if (newActiveTaskId && taskInputRefs.value[newActiveTaskId]) {
            const elToFocus = taskInputRefs.value[newActiveTaskId];
            elToFocus.focus();
          }
        });
        return;
      }
    }
  }

  // Handle Tab for nesting and Shift+Tab for unnesting
  if (event.key === 'Tab' && activeTaskId.value) {
    event.preventDefault();
    const currentIndex = taskList.value.findIndex(task => task.id === activeTaskId.value);

    if (event.shiftKey) {
      // Unnest task (remains the same)
      unnestTask(activeTaskId.value);
    } else {
      // Nest task with corrected hierarchical logic
      if (currentIndex > 0) {
        const currentTask = taskList.value[currentIndex];
        const currentLevel = getTaskIndentation(currentTask.id);

        // Find the nearest preceding task at the same level to nest under.
        let parentId = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
          const candidateTask = taskList.value[i];
          const candidateLevel = getTaskIndentation(candidateTask.id);

          if (candidateLevel === currentLevel) {
            // This is a sibling, but its predecessor is the parent.
            // The actual parent is the task just before this one in the list.
            const potentialParent = taskList.value[i];
            const parentLevel = getTaskIndentation(potentialParent.id);
            if (parentLevel < currentLevel + 1) { // Failsafe
                parentId = potentialParent.id;
            }
            break;
          } else if (candidateLevel < currentLevel) {
            // We've gone past our current level without finding a sibling.
            // The last task we saw is the parent.
            const potentialParent = taskList.value[i];
            parentId = potentialParent.id;
            break;
          }
        }
        // Fallback to original parent if no better one is found
        if (!parentId) {
            const predecessor = taskList.value[currentIndex -1];
            if (getTaskIndentation(predecessor.id) >= currentLevel) {
                parentId = predecessor.id
            }
        }

        if (parentId) {
          nestTask(activeTaskId.value, parentId);
        }
      }
    }
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
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
    <button
      v-if="isDev"
      @click="tasksStore.clearAllTasks()"
      class="fixed top-2 left-2 z-50 px-3 py-1 rounded bg-red-600 text-white text-xs font-bold shadow hover:bg-red-700 transition-all"
      title="Clear all tasks (debug)"
    >
      Clear All Tasks
    </button>
    <div class="w-full max-w-md">
      <ul v-if="taskCount > 0" class="space-y-1">
        <li
          v-for="task in taskList"
          :key="task.id"
          class="flex items-start gap-3 p-2 rounded-lg"
          :class="{ 'bg-highlight': task.id === activeTaskId }"
          :style="{ 'padding-left': `${16 + getTaskIndentation(task.id) * 20}px` }"
        >
          <input
            type="checkbox"
            :checked="task.completed"
            @change="toggleTaskCompletion(task.id)"
            class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0 mt-1"
            :style="{ accentColor: 'var(--color-primary)' }"
          />
          <div
            :ref="(el) => { if (el) taskInputRefs[task.id] = el }"
            :contenteditable="true"
            :spellcheck="spellcheckEnabled"
            @input="onTaskInput(task, $event)"
            @focus="activeTaskId = task.id"
            @click="updateDesiredXPosition"
            @blur="(event) => { onTaskInput(task, event); activeTaskId = null }"
            class="task-input w-full bg-transparent text-lg resize-none overflow-hidden editable"
            :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
          >
          </div>
        </li>
      </ul>
    </div>
    <HotkeyHelper />
    <Settings />
  </div>
</template>