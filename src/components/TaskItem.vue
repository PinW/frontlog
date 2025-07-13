<template>
  <li
    :data-id="task.id"  
    :class="{ 
      'bg-highlight': task.id === activeTaskId && !isDragging,
      'bg-dragging': task.id === activeTaskId && isDragging 
    }"
    class="rounded-lg"
  >
    <div 
      class="flex items-center gap-3 p-2 group"
      :style="{ 'padding-left': `${16 + getTaskIndentation(task.id) * 20}px` }"
      >
      <div class="flex items-center self-start mt-px">
        <span 
          class="drag-handle cursor-grab mr-1 transition-opacity duration-100 p-[3px]"
          :class="{ 
            'opacity-40': task.id === activeTaskId || false,
            'opacity-0 group-hover:opacity-40': task.id !== activeTaskId 
          }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
            <circle cx="5" cy="4" r="1.5"/>
            <circle cx="11" cy="4" r="1.5"/>
            <circle cx="5" cy="10" r="1.5"/>
            <circle cx="11" cy="10" r="1.5"/>
            <circle cx="5" cy="16" r="1.5"/>
            <circle cx="11" cy="16" r="1.5"/>
          </svg>
        </span>
        <input
          type="checkbox"
          :checked="task.completed"
          @change="() => toggleTaskCompletion(task.id)"
          class="h-5 w-5 rounded focus:ring focus:ring-primary cursor-pointer flex-shrink-0"
          :style="{ accentColor: 'var(--color-primary)' }"
        />
      </div>
      <div
        :ref="setupDivRef"
        :contenteditable="true"
        :spellcheck="spellcheckEnabled"
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
      @choose="onDragChoose"
      @unchoose="onDragUnchoose"
      @start="onDragStart"
      @end="onDragEnd"
      >
      <template #item="{ element: child }">
        <TaskItem
          :key="child.id"
          :task="child"
          :activeTaskId="activeTaskId"
          :isDragging="isDragging"
          :taskInputRefs="taskInputRefs"
          :spellcheckEnabled="spellcheckEnabled"
          :getTaskIndentation="getTaskIndentation"
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
  </li>
</template>

<script setup>
import { defineProps, ref, onMounted } from 'vue'; // Add ref and onMounted
import draggable from 'vuedraggable'
import TaskItem from './TaskItem.vue'

const props = defineProps({
  task: { type: Object, required: true },
  activeTaskId: { type: [String, null], required: true },
  isDragging: { type: Boolean, required: true },
  taskInputRefs: { type: Object, required: true },
  spellcheckEnabled: { type: Boolean, required: true },
  getTaskIndentation: { type: Function, required: true },
  toggleTaskCompletion: { type: Function, required: true },
  onTaskInput: { type: Function, required: true },
  onFocus: { type: Function, required: true },
  onBlur: { type: Function, required: true },
  updateDesiredXPosition: { type: Function, required: true },
  onDragMove: { type: Function, required: true },
  onDragChoose: { type: Function, required: true },
  onDragUnchoose: { type: Function, required: true },
  onDragStart: { type: Function, required: true },
  onDragEnd: { type: Function, required: true },
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