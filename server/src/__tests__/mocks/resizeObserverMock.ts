export class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

// Add to window object if it doesn't exist (for client-side tests)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock;
}

// Add to global object if it doesn't exist (for Node.js tests)
if (typeof global !== 'undefined' && !global.ResizeObserver) {
  global.ResizeObserver = ResizeObserverMock;
}