<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTasksStore } from './stores/tasks'
import { storeToRefs } from 'pinia'
import { useMagicKeys, whenever } from '@vueuse/core'

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

// Reactive variable for the new task input field
const newTaskContent = ref('')

// Function to add a new task
function addNewTask() {
  if (newTaskContent.value.trim()) {
    tasksStore.addTask(newTaskContent.value)
    newTaskContent.value = '' // Clear the input field
  }
}

// NEW: A place to store references to our task <input> DOM elements
const taskInputRefs = ref({})

// Watch for changes to the activeTaskId
watch(activeTaskId, (newId, oldId) => {
  if (newId && taskInputRefs.value[newId]) {
    // When the active ID changes, focus the corresponding input and position cursor at beginning
    const input = taskInputRefs.value[newId]
    input.focus()
    input.setSelectionRange(0, 0) // Position cursor at the beginning
  }
})

// Existing hotkey listeners for up/down selection
const { arrowup, arrowdown } = useMagicKeys()
whenever(arrowup, selectPreviousTask)
whenever(arrowdown, selectNextTask)

// On initial load, focus the first task's input and position cursor at beginning
onMounted(() => {
  if (activeTaskId.value && taskInputRefs.value[activeTaskId.value]) {
    const input = taskInputRefs.value[activeTaskId.value]
    input.focus()
    input.setSelectionRange(0, 0) // Position cursor at the beginning
  }
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-background"
    @keydown.up.prevent
    @keydown.down.prevent
  >
    <div class="w-full max-w-md">
      <ul v-if="taskCount > 0" class="space-y-1">
        <li
          v-for="task in taskList"
          :key="task.id"
          class="flex items-center gap-3 p-2 rounded-lg"
          :class="{ 'bg-highlight border border-highlight-border': task.id === activeTaskId }"
        >
          <input
            type="checkbox"
            :checked="task.completed"
            @change="toggleTaskCompletion(task.id)"
            class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0"
            :style="{ accentColor: 'var(--color-primary)' }"
          />
          <input
            type="text"
            :ref="(el) => { if (el) taskInputRefs[task.id] = el }"
            :value="task.text"
            @input="updateTaskText({ id: task.id, newText: $event.target.value })"
            @focus="activeTaskId = task.id"
            class="w-full bg-transparent focus:outline-none text-lg"
            :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
            :style="task.completed ? { color: 'var(--color-foreground)', opacity: 0.5, textDecoration: 'line-through' } : { color: 'var(--color-foreground)' }"
          />
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