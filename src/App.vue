<script setup>
import { ref, watch, onMounted, onBeforeUpdate, nextTick } from 'vue'
import { useTasksStore } from './stores/tasks'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'


// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount, activeTaskId } = storeToRefs(tasksStore)
const {
  addTask,
  insertTaskAt,
  removeTask,
  toggleTaskCompletion,
  selectNextTask,
  selectPreviousTask,
  updateTaskText
} = tasksStore

// Refs for the editable div elements
const taskInputRefs = ref({})

// Function to add a new task
function insertTask() {
  // Find the index of the active task
  const currentIndex = taskList.value.findIndex(task => task.id === activeTaskId.value)
  // Insert a new empty task below the current one (or at the top if none active)
  const newId = tasksStore.insertTaskAt(currentIndex, '')
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

// Watch for changes in the active task ID to shift focus
watch(activeTaskId, (newId) => {
  if (newId && taskInputRefs.value[newId]) {
    taskInputRefs.value[newId].focus()
  }
})

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
    // Only trigger if the active element is a task input
    const el = taskInputRefs.value[activeTaskId.value];
    if (el && document.activeElement === el) {
      if (!event.shiftKey) {
        event.preventDefault();
        insertTask();
        return;
      }
      // If shiftKey is pressed, allow default (newline)
    }
  }
  // Handle backspace
  if (event.key === 'Backspace') {
    if (activeTaskId.value) {
      const element = taskInputRefs.value[activeTaskId.value];
      const currentIndex = taskList.value.findIndex(task => task.id === activeTaskId.value);

      // Prevent deletion if only one task remains
      if (element && element.innerText.trim() === '' && taskList.value.length > 1) {
        event.preventDefault();

        // Determine the next active task
        let newActiveTaskId = null;
        if (taskList.value.length > 1) {
          if (currentIndex > 0) {
            newActiveTaskId = taskList.value[currentIndex - 1].id;
          } else {
            newActiveTaskId = taskList.value[1].id;
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

            // Place cursor at end
            const range = document.createRange();
            range.selectNodeContents(elToFocus);
            range.collapse(false);
            const sel3 = window.getSelection();
            if (sel3) {
              sel3.removeAllRanges();
              sel3.addRange(range);
            }
          }
        });
        return;
      }
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
    <div class="w-full max-w-md">
      <ul v-if="taskCount > 0" class="space-y-1">
        <li
          v-for="task in taskList"
          :key="task.id"
          class="flex items-center gap-3 p-2 rounded-lg"
          :class="{ 'bg-highlight': task.id === activeTaskId }"
        >
          <input
            type="checkbox"
            :checked="task.completed"
            @change="toggleTaskCompletion(task.id)"
            class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0"
            :style="{ accentColor: 'var(--color-primary)' }"
          />
          <div
            :ref="(el) => { if (el) taskInputRefs[task.id] = el }"
            :contenteditable="true"
            @input="onTaskInput(task, $event)"
            @focus="activeTaskId = task.id"
            @blur="(event) => { onTaskInput(task, event); activeTaskId = null }"
            class="w-full bg-transparent text-lg resize-none overflow-hidden editable"
            :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
          >
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>