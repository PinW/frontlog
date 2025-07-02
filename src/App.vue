<script setup>
import { ref } from 'vue'
import { useTasksStore } from './stores/tasks'
import { storeToRefs } from 'pinia'

// Initialize the store
const tasksStore = useTasksStore()
const { taskList, taskCount } = storeToRefs(tasksStore)
const { addTask, removeTask, toggleTaskCompletion } = tasksStore

// Reactive variable for the new task input field
const newTaskContent = ref('')

// Function to add a task using the store's action
function addNewTask() {
  if (newTaskContent.value.trim()) {
    tasksStore.addTask(newTaskContent.value)
    newTaskContent.value = '' // Clear the input field
  }
}

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
    <h1 class="text-4xl font-extrabold text-indigo-700 mb-6">
      Frontlog: My Tasks
    </h1>

    <div class="w-full max-w-md bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add a New Task</h2>
      <div class="flex gap-2">
        <input
          type="text"
          v-model="newTaskContent"
          @keyup.enter="addNewTask"
          placeholder="e.g., Learn Pinia"
          class="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          @click="addNewTask"
          class="px-5 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300"
        >
          Add Task
        </button>
      </div>
    </div>

    <div class="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Your Tasks ({{ taskCount }})</h2>
      <ul v-if="taskCount > 0">
        <li
            v-for="task in taskList"
            :key="task.id"
            class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
          >
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="toggleTaskCompletion(task.id)"
                class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span
                class="text-gray-800 text-lg"
                :class="{ 'line-through text-gray-400': task.completed }"
              >
                {{ task.text }}
              </span>
            </div>
            <button
              @click="removeTask(task.id)"
              class="px-3 py-1 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors duration-200"
            >
              Remove
            </button>
          </li>
      </ul>
      <p v-else class="text-gray-500 italic">No tasks yet. Add some above!</p>
    </div>
  </div>
</template>