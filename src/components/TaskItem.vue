<template>
  <li
    :data-id="task.id"  
    :class="{ 'bg-highlight': task.id === activeTaskId }"
    class="rounded-lg"
  >
    <div 
      class="flex items-start gap-3 p-2"
      :style="{ 'padding-left': `${16 + getTaskIndentation(task.id) * 20}px` }"
      >
      <span class="drag-handle cursor-grab text-gray-400 hover:text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5"/>
          <circle cx="11" cy="4" r="1.5"/>
          <circle cx="5" cy="12" r="1.5"/>
          <circle cx="11" cy="12" r="1.5"/>
          <circle cx="5" cy="8" r="1.5"/>
          <circle cx="11" cy="8" r="1.5"/>
        </svg>
      </span>
      <input
        type="checkbox"
        :checked="task.completed"
        @change="() => toggleTaskCompletion(task.id)"
        class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0 mt-1"
        :style="{ accentColor: 'var(--color-primary)' }"
      />
      <div
        :ref="setupDivRef"
        :contenteditable="true"
        @input="(event) => onTaskInput(task, event)"
        @focus="() => onFocus(task.id)"
        @click="updateDesiredXPosition"
        @blur="(event) => onBlur(task, event)"
        class="task-input w-full bg-transparent text-lg resize-none overflow-hidden editable"
        :class="{ 'text-foreground': !task.completed, 'text-muted line-through': task.completed }"
      >
      </div>
    </div>
    <draggable
      :list="task.children"
      item-key="id"
      tag="ul"
      group="tasks"
      handle=".drag-handle"
      :move="onDragMove"
      >
      <template #item="{ element: child }">
        <TaskItem
          :key="child.id"
          :task="child"
          :activeTaskId="activeTaskId"
          :taskInputRefs="taskInputRefs"
          :getTaskIndentation="getTaskIndentation"
          :toggleTaskCompletion="toggleTaskCompletion"
          :onTaskInput="onTaskInput"
          :onFocus="onFocus"
          :onBlur="onBlur"
          :updateDesiredXPosition="updateDesiredXPosition"
          :onDragMove="onDragMove"
        />
      </template>
    </draggable>
  </li>
</template>

<script setup>
import { defineProps, ref, onMounted } from 'vue'; // Add ref and onMounted
import draggable from 'vuedraggable'
import TaskItem from './TaskItem.vue'

const props = defineProps({
  task: { type: Object, required: true },
  activeTaskId: { type: [String, null], required: true },
  taskInputRefs: { type: Object, required: true },
  getTaskIndentation: { type: Function, required: true },
  toggleTaskCompletion: { type: Function, required: true },
  onTaskInput: { type: Function, required: true },
  onFocus: { type: Function, required: true },
  onBlur: { type: Function, required: true },
  updateDesiredXPosition: { type: Function, required: true },
  onDragMove: { type: Function, required: true },
})

// Create a new local template ref for the editable div.
const editableDiv = ref(null);

// This function now sets both the local ref and the parent's ref object.
function setupDivRef(el) {
  editableDiv.value = el;
  if (el) {
    props.taskInputRefs[props.task.id] = el;
  }
}

// THIS IS THE CRITICAL FIX
onMounted(() => {
  // When the component is created, populate its text from the store's data.
  if (editableDiv.value) {
    editableDiv.value.innerText = props.task.text;
  }
});

</script> 