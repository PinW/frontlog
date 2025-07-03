<script setup>
import { ref, watch, onMounted, onBeforeUpdate } from 'vue'
import { useTasksStore } from './stores/tasks'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'


// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount, activeTaskId } = storeToRefs(tasksStore)
const {
  addTask,
  removeTask,
  toggleTaskCompletion,
  selectNextTask,
  selectPreviousTask,
  updateTaskText
} = tasksStore

// State for the new task input
const newTaskContent = ref('')

// Refs for the editable div elements
const taskInputRefs = ref({})

// Function to add a new task
function addNewTask() {
  if (newTaskContent.value.trim()) {
    tasksStore.addTask(newTaskContent.value)
    newTaskContent.value = ''
  }
}

// **LIFECYCLE HOOKS FOR REF MANAGEMENT**

// Before each update, clear the refs object.
// This is crucial to prevent stale refs when the list changes.
onBeforeUpdate(() => {
  taskInputRefs.value = {}
})

// When the component mounts, populate the divs and focus the active task.
onMounted(() => {
  // Manually populate the text for all visible tasks
  taskList.value.forEach(task => {
    const el = taskInputRefs.value[task.id]
    if (el) {
      el.innerText = task.text
    }
  })

  // Focus the active task if it exists
  if (activeTaskId.value && taskInputRefs.value[activeTaskId.value]) {
    taskInputRefs.value[activeTaskId.value].focus()
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
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const currentTaskId = activeTaskId.value;
  const element = taskInputRefs.value[currentTaskId];
  if (!element) return;

  const cursorRect = selection.getRangeAt(0).getClientRects()[0];
  const elementRect = element.getBoundingClientRect();

  if (!cursorRect) return;

  // Check if the cursor is on the first or last line of the text block
  if (event.key === 'ArrowDown' && cursorRect.bottom >= elementRect.bottom - 5) {
    event.preventDefault(); // Prevent default multi-line navigation
    selectNextTask();
  } else if (event.key === 'ArrowUp' && cursorRect.top <= elementRect.top + 5) {
    event.preventDefault(); // Prevent default multi-line navigation
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
            @blur="onTaskInput(task, $event)"
            class="w-full bg-transparent text-lg resize-none overflow-hidden editable"
            :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
          >
          </div>
        </li>
      </ul>
      <p v-else class="text-muted italic text-center p-4">
        No tasks yet. Add one to get started!
      </p>
    </div>

    <div class="w-full max-w-md mt-8">
      <div class="relative">
        <input
          type="text"
          v-model="newTaskContent"
          @keyup.enter="addNewTask"
          placeholder="What needs to be done?"
          class="w-full p-3 pr-28 border rounded-lg focus:outline-none focus:ring-2"
          style="background: var(--color-card); color: var(--color-foreground); border-color: var(--color-border);"
        />
        <button
          @click="addNewTask"
          class="absolute right-1 top-1 bottom-1 px-5 py-2 text-white rounded-md hover:opacity-90 transition-colors duration-300"
          style="background: var(--color-primary); color: var(--color-primary-foreground);"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>