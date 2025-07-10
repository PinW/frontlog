<template>
  <li
    :class="{ 'bg-highlight': task.id === tasksStore.activeTaskId }"
    :style="{ 'padding-left': `${16 + getTaskIndentation(task.id) * 20}px` }"
    class="rounded-lg"
  >
    <div class="flex items-start gap-3 p-2">
      <input
        type="checkbox"
        :checked="task.completed"
        @change="() => toggleTaskCompletion(task.id)"
        class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0 mt-1"
        :style="{ accentColor: 'var(--color-primary)' }"
      />
      <div
        :ref="(el) => { if (el) taskInputRefs[task.id] = el }"
        :contenteditable="true"
        @input="(event) => onTaskInput(task, event)"
        @focus="() => tasksStore.activeTaskId = task.id"
        @click="() => tasksStore.activeTaskId = task.id"
        @blur="(event) => { onTaskInput(task, event); tasksStore.activeTaskId = null }"
        class="task-input w-full bg-transparent text-lg resize-none overflow-hidden editable"
        :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
      >
        {{ task.text }}
      </div>
    </div>
    <ul v-if="task.children && task.children.length">
      <TaskItem
        v-for="child in task.children"
        :key="child.id"
        :task="child"
        :taskInputRefs="taskInputRefs"
        :getTaskIndentation="getTaskIndentation"
        :toggleTaskCompletion="toggleTaskCompletion"
        :onTaskInput="onTaskInput"
        :updateDesiredXPosition="updateDesiredXPosition"
      />
    </ul>
  </li>
</template>

<script setup>
import { defineProps } from 'vue'
import { useTasksStore } from '../stores/tasks'
import TaskItem from './TaskItem.vue'
const props = defineProps({
  task: { type: Object, required: true },
  taskInputRefs: { type: Object, required: true },
  getTaskIndentation: { type: Function, required: true },
  toggleTaskCompletion: { type: Function, required: true },
  onTaskInput: { type: Function, required: true },
  updateDesiredXPosition: { type: Function, required: true },
})
const tasksStore = useTasksStore()
</script> 