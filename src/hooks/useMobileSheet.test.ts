import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMobileSheet } from './useMobileSheet'

/**
 * PROJ-43: unit-level coverage for the central sheet state machine.
 *
 * Covers the surfaces that can't easily be poked from Playwright:
 *   - openTab / close state transitions
 *   - tap detection thresholds (10 px movement, 300 ms duration)
 *   - the [data-canvas-interactive] opt-out
 *   - the keyboard-detection branch using a mocked visualViewport
 *
 * Pointer events are constructed as plain objects with the surface the hook
 * actually reads from — we don't need a full PointerEvent shim.
 */

type Tab = 'a' | 'b' | 'c'

function makePointerEvent(props: Partial<{ clientX: number; clientY: number; timeStamp: number; target: Element }>) {
  return {
    clientX: props.clientX ?? 0,
    clientY: props.clientY ?? 0,
    timeStamp: props.timeStamp ?? 0,
    target: props.target ?? document.createElement('div'),
  } as unknown as React.PointerEvent
}

describe('useMobileSheet — state transitions', () => {
  it('starts closed with the initial tab active', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    expect(result.current.isOpen).toBe(false)
    expect(result.current.sheetState).toBe('closed')
    expect(result.current.activeTab).toBe('a')
  })

  it('openTab opens the sheet and sets the requested tab', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('b'))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.sheetState).toBe('open')
    expect(result.current.activeTab).toBe('b')
  })

  it('openTab swaps content in place when sheet already open', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('b'))
    act(() => result.current.openTab('c'))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeTab).toBe('c')
  })

  it('close collapses the sheet but keeps the active tab as the next default', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('b'))
    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeTab).toBe('b')
  })
})

describe('useMobileSheet — canvas tap detection', () => {
  function simulateTap(handlers: ReturnType<typeof useMobileSheet>['canvasTapHandlers'], opts: {
    duration?: number
    movementX?: number
    movementY?: number
    target?: Element
  }) {
    const duration = opts.duration ?? 100
    const movementX = opts.movementX ?? 0
    const movementY = opts.movementY ?? 0
    const target = opts.target ?? document.createElement('div')
    handlers.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, timeStamp: 1000, target }))
    if (movementX !== 0 || movementY !== 0) {
      handlers.onPointerMove(makePointerEvent({ clientX: movementX, clientY: movementY, timeStamp: 1000 + duration / 2 }))
    }
    handlers.onPointerUp(makePointerEvent({ clientX: movementX, clientY: movementY, timeStamp: 1000 + duration }))
  }

  it('short stationary tap on a non-interactive target closes the sheet', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, movementX: 3, movementY: 4 }))
    expect(result.current.isOpen).toBe(false)
  })

  it('long tap (> 300 ms) does not close', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 400 }))
    expect(result.current.isOpen).toBe(true)
  })

  it('movement > 10 px (pan) does not close', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, movementX: 50 }))
    expect(result.current.isOpen).toBe(true)
  })

  it('vertical movement > 10 px does not close', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, movementY: 50 }))
    expect(result.current.isOpen).toBe(true)
  })

  it('movement exactly at the 10 px threshold does close (boundary)', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    // 10 px does NOT exceed the threshold (strict >) so it should still count
    // as a tap and close the sheet.
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, movementX: 10, movementY: 0 }))
    expect(result.current.isOpen).toBe(false)
  })

  it('tap on element with [data-canvas-interactive] does not close', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    const interactive = document.createElement('button')
    interactive.setAttribute('data-canvas-interactive', '')
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, target: interactive }))
    expect(result.current.isOpen).toBe(true)
  })

  it('tap on a CHILD of [data-canvas-interactive] also does not close (closest() lookup)', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    const interactive = document.createElement('button')
    interactive.setAttribute('data-canvas-interactive', '')
    const child = document.createElement('span')
    interactive.appendChild(child)
    document.body.appendChild(interactive)
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100, target: child }))
    expect(result.current.isOpen).toBe(true)
    document.body.removeChild(interactive)
  })

  it('tap on canvas does nothing when sheet is already closed (no-op guard)', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    expect(result.current.isOpen).toBe(false)
    act(() => simulateTap(result.current.canvasTapHandlers, { duration: 100 }))
    expect(result.current.isOpen).toBe(false)
  })

  it('pointerCancel mid-touch invalidates a subsequent up-as-tap', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => {
      result.current.canvasTapHandlers.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, timeStamp: 1000 }))
      result.current.canvasTapHandlers.onPointerCancel(makePointerEvent({ clientX: 0, clientY: 0, timeStamp: 1050 }))
      result.current.canvasTapHandlers.onPointerUp(makePointerEvent({ clientX: 0, clientY: 0, timeStamp: 1100 }))
    })
    expect(result.current.isOpen).toBe(true)
  })
})

describe('useMobileSheet — visualViewport / keyboard detection', () => {
  let originalVV: VisualViewport | null
  let resizeHandler: (() => void) | null = null
  let vvHeight = 800

  beforeEach(() => {
    originalVV = window.visualViewport
    // jsdom doesn't expose visualViewport — install a mock.
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() { return vvHeight },
        addEventListener: (ev: string, fn: () => void) => {
          if (ev === 'resize') resizeHandler = fn
        },
        removeEventListener: (ev: string, fn: () => void) => {
          if (ev === 'resize' && resizeHandler === fn) resizeHandler = null
        },
      } satisfies Partial<VisualViewport>,
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844, writable: true })
    vvHeight = 800
  })

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV })
    resizeHandler = null
  })

  it('reports `open` while visible viewport matches layout viewport', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    expect(result.current.sheetState).toBe('open')
  })

  it('flips to `open-keyboard` when visible viewport shrinks by > 150 px', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    expect(result.current.sheetState).toBe('open')
    // Keyboard appears — visualViewport shrinks dramatically.
    act(() => {
      vvHeight = 500
      resizeHandler?.()
    })
    expect(result.current.sheetState).toBe('open-keyboard')
  })

  it('returns to `open` when keyboard dismisses (viewport restored)', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => result.current.openTab('a'))
    act(() => {
      vvHeight = 500
      resizeHandler?.()
    })
    expect(result.current.sheetState).toBe('open-keyboard')
    act(() => {
      vvHeight = 800
      resizeHandler?.()
    })
    expect(result.current.sheetState).toBe('open')
  })

  it('keeps state `closed` regardless of keyboard while sheet is closed', () => {
    const { result } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    act(() => {
      vvHeight = 500
      resizeHandler?.()
    })
    expect(result.current.sheetState).toBe('closed')
    expect(result.current.isOpen).toBe(false)
  })

  it('cleans up the visualViewport listener on unmount', () => {
    const { result, unmount } = renderHook(() => useMobileSheet<Tab>({ initialTab: 'a' }))
    expect(resizeHandler).not.toBeNull()
    unmount()
    expect(resizeHandler).toBeNull()
    // Touching the result post-unmount sanity-check: state methods should
    // still be callable but won't affect anything observable.
    void result
  })
})
