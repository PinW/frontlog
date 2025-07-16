# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontlog is a hierarchical task management application built with Vue 3, featuring drag-and-drop functionality and keyboard-driven navigation. The app supports nested tasks with unlimited depth and provides a clean, minimal interface for managing project workflows.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# When Claude Code needs to test changes, use different port to avoid conflicts
npm run dev -- --port 3001

# Run tests (watch mode for development)
npm test

# Run tests once (for CI/CD)
npm run test:run

# Run tests with visual interface
npm test:ui

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Architecture Overview

### Core Technologies
- **Vue 3** with Composition API
- **Pinia** for state management with persistence
- **Vite** for build tooling
- **Tailwind CSS 4.x** for styling
- **vuedraggable** (based on SortableJS) for drag-and-drop functionality

### State Management Architecture
The application uses Pinia stores with three main stores:

#### Tasks Store (`src/stores/tasks.js`)
- **Hierarchical Data Structure**: Tasks are stored as a tree with `children` arrays
- **Flattening System**: Uses computed `flattenedTaskList` for efficient rendering and navigation
- **Task Operations**: Create, remove, toggle completion, reorder, nest/unnest
- **Persistence**: Automatically persists all task data to localStorage

#### Settings Store (`src/stores/settings.js`)
- Simple configuration store for app-wide settings
- Currently handles spellcheck toggle

#### Hotkeys Store (`src/stores/hotkeys.js`)
- Defines keyboard shortcuts and their descriptions
- Used by HotkeyHelper component for user reference

### Component Architecture

#### App.vue - Main Application Logic
- **Keyboard Navigation**: Complex multi-line task navigation with cursor position preservation
- **Task Management**: Handles all task operations (create, delete, move, nest)
- **Drag & Drop Integration**: Manages ghost element styling during drag operations
- **Cursor Management**: Advanced cursor positioning for seamless navigation between tasks

#### TaskItem.vue - Recursive Task Component
- **Self-Rendering**: Recursively renders child tasks using vuedraggable
- **Ref Management**: Manages contenteditable refs for parent component access
- **Text Synchronization**: Critical `onMounted` hook ensures text content matches store data

### Key Features

#### Keyboard Navigation
- **Arrow Keys**: Navigate between tasks with cursor position memory
- **Enter**: Create new task below current
- **Shift+Enter**: Create new line within task
- **Ctrl+Enter**: Toggle task completion
- **Ctrl+Arrow Keys**: Reorder tasks up/down or nest/unnest
- **Tab/Shift+Tab**: Nest/unnest tasks
- **Backspace/Delete**: Remove empty tasks with smart focus management

#### Drag & Drop System
- **Hierarchical Dropping**: Support for dropping into nested levels
- **Visual Feedback**: Ghost element shows target indentation level
- **Cross-Level Movement**: Tasks can be moved between different nesting levels

#### Data Persistence
- **Automatic Saving**: All changes persist immediately to localStorage
- **State Recovery**: App restores full state on reload including active task

## Development Notes

### Critical Implementation Details

1. **Task Text Synchronization**: TaskItem components must sync `innerText` with store data on mount to prevent display inconsistencies

2. **Cursor Position Management**: The app maintains desired X-position during vertical navigation for natural editing experience

3. **Ref Management**: `onBeforeUpdate` clears task refs to prevent stale references when list changes

4. **Drag & Drop Indentation**: Custom `onDragMove` handler calculates and applies proper indentation to ghost elements

### File Structure Patterns
- **Stores**: Use Pinia composition API pattern with computed properties for derived state
- **Components**: Prefer Composition API with explicit prop definitions
- **Styling**: Uses Tailwind with CSS custom properties for theming

### Development Environment
- **Base Path**: Configured for `/frontlog/` deployment path (GitHub Pages)
- **Hot Reload**: Vite provides instant updates during development
- **Vue DevTools**: Enabled in development mode for debugging

### Testing & Deployment
- **Comprehensive Test Suite**: 115 automated tests using Vitest, Vue Test Utils, and Testing Library
- **Test Coverage**: Store operations, component behavior, integration workflows, and edge cases
- **Test Commands**: `npm run test` (watch mode), `npm run test:run` (CI), `npm run test:ui` (visual interface)
- **Test Files**: Located in `src/` alongside source files with `.test.js` extension
- **Key Test Areas**:
  - Store CRUD operations and hierarchical task management
  - Component rendering, interactions, and event handling
  - Integration tests for complete user workflows
  - Edge cases and error conditions
- Deployment uses `gh-pages` package to publish `dist` folder
- Production builds are optimized and minified by Vite

## Claude Code Instructions
- When I say "save" commit your changes to git and report progress
- When I say "spd" that means save, then push, then deploy
- When I say "save my changes" look for changes I did without you and commit them
- When I say "progress report [days]" report on the last [days] of commits, then suggest edits to CLAUDE.md if needed
- **Always run tests before committing**: Use `npm test:run` to verify all tests pass
- **Write tests for new features**: When adding functionality, create corresponding tests
- **Run tests when debugging**: Use tests to verify bug fixes and prevent regressions

## Style Guidelines
- Always try to implement styles using Tailwind standards, and notify me when you can't