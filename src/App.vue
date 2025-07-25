<script setup>
import { ref, watch, onMounted, onBeforeUpdate, nextTick } from 'vue'
import { useTasksStore } from './stores/tasks'
import { useSettingsStore } from './stores/settings'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import HotkeyHelper from './components/HotkeyHelper.vue'
import draggable from 'vuedraggable'

import Settings from './components/Settings.vue'
import TaskItem from './components/TaskItem.vue'

// Add import for process.env if needed (Vite exposes import.meta.env)
const isDev = import.meta.env.MODE === 'development'
const appVersion = process.env.VITE_APP_VERSION || '0.1.0'

// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount, activeTaskId, flattenedTaskList } = storeToRefs(tasksStore)
const settingsStore = useSettingsStore()
const { spellcheckEnabled } = storeToRefs(settingsStore)

const {
  createTask,
  removeTask,
  toggleTaskCompletion,
  selectNextTask,
  selectPreviousTask,
  updateTaskText,
  moveTaskUp,
  moveTaskDown,
  nestTask,
  unnestTask,
} = tasksStore

// Refs for the editable div elements
const taskInputRefs = ref({})

// New state for cursor's desired horizontal position and navigation direction
const desiredXPosition = ref(null)
const navigationDirection = ref(null)
const isSpellcheckRefreshing = ref(false)

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

/**
 * Forces a refresh of a contenteditable element by toggling its contentEditable property.
 * This is useful for forcing the browser to update spellcheck state or other behaviors.
 * @param {HTMLElement} element - The contenteditable element to refresh.
 */
function refreshContentEditableElement(element) {
  if (!element) return;
  element.contentEditable = 'false';
  element.contentEditable = 'true';
}

/**
 * Executes a task store action while preserving the cursor position.
 * Handles both normal and empty tasks.
 * @param {Function} actionFn - The store action to execute (e.g., () => moveTaskUp(activeTaskId.value)).
 */
 function performTaskActionAndPreserveCursor(actionFn) {
  let relativePos = null;
  const selection = window.getSelection();
  const element = taskInputRefs.value[activeTaskId.value];
  
  if (!element) return;

  const isEmpty = element.innerText.trim() === '';

  // 1. Capture the relative visual position, but only if not empty
  if (!isEmpty && selection && selection.rangeCount > 0) {
    const cursorRect = selection.getRangeAt(0).getClientRects()[0];
    const elementRect = element.getBoundingClientRect();
    if (cursorRect) {
      relativePos = {
        x: cursorRect.left - elementRect.left,
        y: cursorRect.top - elementRect.top,
      };
    }
  }

  // 2. Perform the actual store action
  actionFn();

  // 3. After the DOM update, restore the cursor's position
  nextTick(() => {
    const el = taskInputRefs.value[activeTaskId.value];
    if (!el) return;

    el.focus(); // Always focus the element

    // If it wasn't empty and we have a position, restore it
    if (!isEmpty && relativePos) {
      const elRect = el.getBoundingClientRect();
      const absoluteCoords = {
        x: elRect.left + relativePos.x,
        y: elRect.top + relativePos.y,
      };
      placeCursorAtCoordinates(el, absoluteCoords);
    } else if (isEmpty) {
      // For empty elements, just place the cursor at the start
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(el, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });
}

// Function to add a new task
function insertTask(insertAbove = false) {
  const newId = createTask({
    text: '',
    relativeToId: activeTaskId.value,
    position: insertAbove ? 'before' : 'after'
  });

  // Set the new task as active and focus it.
  activeTaskId.value = newId;
  nextTick(() => {
    const el = taskInputRefs.value[newId];
    if (el) el.focus();
  });
}

// Add onFocus and onBlur handlers
function onFocus(taskId) {
  if (!isSpellcheckRefreshing.value) {
    activeTaskId.value = taskId
  }
}
function onBlur(task, event) {
  onTaskInput(task, event)
  // Don't automatically clear activeTaskId on blur
}

// Handle background click to clear active task
function handleBackgroundClick(event) {
  // Only clear if clicking outside the task list area
  if (!event.target.closest('li[data-id], .draggable')) {
    activeTaskId.value = null
  }
}


// Handle drag choose event (when item is selected for potential drag)
function onDragChoose(event) {
  const taskId = event.item.dataset.id
  isDragging.value = true
  activeTaskId.value = taskId  // Activate task when chosen for drag
}

// Handle drag unchoose event (when drag is cancelled)
function onDragUnchoose(event) {
  const taskId = event.item.dataset.id
  isDragging.value = false
  
  // Focus the task that was clicked
  nextTick(() => {
    const el = taskInputRefs.value[taskId]
    if (el) {
      el.focus()
    }
  })
}

// Track if we're currently dragging to prevent blur interference
const isDragging = ref(false)

// Handle drag start event
function onDragStart(event) {
  const draggedElement = event.item;
  const taskId = draggedElement.dataset.id;
  
  // Set the dragged task as active
  activeTaskId.value = taskId
}

// Handle drag end event to auto-select the dragged task
function onDragEnd(event) {
  const draggedElement = event.item;
  const taskId = draggedElement.dataset.id;
  
  // Clear the dragging flag
  isDragging.value = false
  
  // Set active task immediately
  activeTaskId.value = taskId;
  
  // Use requestAnimationFrame to ensure drag operation is fully complete
  requestAnimationFrame(() => {
    const el = taskInputRefs.value[taskId];
    if (el) {
      // Force the element to be focusable by temporarily removing and re-adding contenteditable
      refreshContentEditableElement(el);
      // Focus and set cursor
      el.focus();
    }
  });
}

/**
 * Handles the move event for draggable items to update the ghost's indentation.
 * This function is called continuously as you drag an item over other items.
 * @param {object} evt - The event object from vuedraggable.
 */
 function onDragMove(evt) {
  // Find the ghost element that vuedraggable creates.
  const ghostEl = document.querySelector('.sortable-ghost');
  if (!ghostEl) return;
  
  // Find the specific content div inside the ghost element to apply padding.
  const ghostContent = ghostEl.querySelector('.flex');
  if (!ghostContent) return;

  let level = 0;
  const relatedEl = evt.related; // The element we are dragging over.
  
  // This is our new logic to handle dragging below the last child.
  // It checks if the drop target is a different list than the related element's parent.
  if (evt.willInsertAfter && relatedEl.parentElement !== evt.to) {
    // `evt.to` is the actual <ul> we are dropping into.
    // Its parentElement is the <li> that contains the list.
    const parentLi = evt.to.parentElement;
    if (parentLi && parentLi.dataset.id) {
      // The new item's level is the parent's level plus one.
      level = tasksStore.getTaskIndentation(parentLi.dataset.id) + 1;
    }
  } else if (relatedEl && relatedEl.dataset.id) {
    // This is the original logic for all other cases, which works correctly.
    // The level is the same as the item we are hovering over.
    level = tasksStore.getTaskIndentation(relatedEl.dataset.id);
  }

  // Apply the calculated indentation to the ghost element.
  ghostContent.style.paddingLeft = `${16 + level * 20}px`;
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
    const newId = tasksStore.createTask({ text: '', relativeToId: null, position: 'after' });
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

// Watch for spellcheck changes to refresh all contenteditable elements
watch(spellcheckEnabled, () => {
  isSpellcheckRefreshing.value = true;
  
  // Force refresh all task input elements to update spellcheck state
  Object.values(taskInputRefs.value).forEach(el => {
    refreshContentEditableElement(el);
  });
  
  // Trigger spellcheck evaluation with just one element
  const firstTaskEl = Object.values(taskInputRefs.value)[0];
  if (firstTaskEl) {
    firstTaskEl.focus();
    nextTick(() => {
      firstTaskEl.blur();
      isSpellcheckRefreshing.value = false;
    });
  } else {
    isSpellcheckRefreshing.value = false;
  }
});

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

      // This logic only runs when deleting an EMPTY task
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
        
        nextTick(() => {
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
      (event.ctrlKey && activeTaskId.value && (event.key === 'ArrowRight' || event.key === 'ArrowLeft'))) {
    event.preventDefault();
    const action = (event.shiftKey || event.key === 'ArrowLeft')
      ? () => unnestTask(activeTaskId.value)
      : () => nestTask(activeTaskId.value);
    performTaskActionAndPreserveCursor(action);
    return;
  }

  // Handle Ctrl+ArrowUp/Down for reordering tasks
  if (event.ctrlKey && activeTaskId.value && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault();
    const action = event.key === 'ArrowUp'
      ? () => moveTaskUp(activeTaskId.value)
      : () => moveTaskDown(activeTaskId.value);
    performTaskActionAndPreserveCursor(action);
    return;
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
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-background" @click="handleBackgroundClick">
    <div class="fixed top-2 left-2 z-50 flex gap-2 items-center">
      <span class="text-gray-500 text-xs font-mono">v{{ appVersion }}</span>
      <button
        @click.stop="tasksStore.clearAllTasks()"
        class=" px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow hover:bg-red-700 transition-all"
        title="Clear all tasks (debug)"
      >
        Clear All Tasks
      </button>
      <button
        @click.stop="clearLocalStorage"
        class="px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 transition-all"
        title="Clear local storage (debug)"
      >
        Clear Local Storage
      </button>
    </div>
    <div class="w-full max-w-prose">
      <draggable
        v-if="taskCount > 0"
        :list="taskList"
        item-key="id"
        tag="ul"
        group="tasks"
        handle=".drag-handle"
        :move="onDragMove"
        @choose="onDragChoose"
        @unchoose="onDragUnchoose"
        @start="onDragStart"
        @end="onDragEnd"
        >
        <template #item="{ element: task }">
           <TaskItem
            :key="task.id"
            :task="task"
            :activeTaskId="activeTaskId"
            :isDragging="isDragging"
            :taskInputRefs="taskInputRefs"
            :spellcheckEnabled="spellcheckEnabled"
            :getTaskIndentation="tasksStore.getTaskIndentation"
            :toggleTaskCompletion="toggleTaskCompletion"
            :onTaskInput="onTaskInput"
            :onFocus="onFocus"
            :onBlur="onBlur"
            :updateDesiredXPosition="updateDesiredXPosition"
            :onDragMove="onDragMove"
            :onDragChoose="onDragChoose"
            :onDragUnchoose="onDragUnchoose"
            :onDragStart="onDragStart"
            :onDragEnd="onDragEnd"
          />
        </template>
      </draggable>
    </div>
    <HotkeyHelper />
    <Settings />
  </div>
</template>