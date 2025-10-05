import '@testing-library/jest-dom'

// Global test setup
global.fetch = jest.fn()

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})