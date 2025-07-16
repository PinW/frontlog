import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

global.localStorage = localStorageMock

// Mock window.getSelection for cursor position tests
global.getSelection = vi.fn(() => ({
  rangeCount: 0,
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  getRangeAt: vi.fn(),
}))

// Mock document methods for cursor positioning
global.document.caretRangeFromPoint = vi.fn()
global.document.caretPositionFromPoint = vi.fn()
global.document.createRange = vi.fn(() => ({
  setStart: vi.fn(),
  collapse: vi.fn(),
}))