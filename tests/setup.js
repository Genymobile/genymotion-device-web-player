class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = ResizeObserverMock;
}

if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = global.ResizeObserver;
}
