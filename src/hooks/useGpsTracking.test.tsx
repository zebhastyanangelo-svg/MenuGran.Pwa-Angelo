import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const supabaseMocks = vi.hoisted(() => {
  const channel = {
    subscribe: vi.fn(),
    send: vi.fn(),
  }
  return {
    channel,
    channelFn: vi.fn(() => channel),
    removeChannel: vi.fn(),
  }
})

const syncMocks = vi.hoisted(() => ({
  scheduleOfflineSync: vi.fn(),
}))

const queueMocks = vi.hoisted(() => ({
  enqueueOfflineEvent: vi.fn(),
  isBrowserOffline: vi.fn(),
}))

vi.mock('../services/supabase', () => ({
  supabase: {
    channel: supabaseMocks.channelFn,
    removeChannel: supabaseMocks.removeChannel,
  },
}))

vi.mock('../services/offlineSyncService', () => ({
  scheduleOfflineSync: syncMocks.scheduleOfflineSync,
}))

vi.mock('../utils/offlineSyncQueue', () => ({
  enqueueOfflineEvent: queueMocks.enqueueOfflineEvent,
  isBrowserOffline: queueMocks.isBrowserOffline,
}))

import { useGpsTracking } from './useGpsTracking'

const geolocationStub = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

const originalGeolocation = navigator.geolocation

/** Captura los callbacks del watch nativo para simular ticks del GPS. */
function captureWatchHandlers(): {
  success: PositionCallback
  error: PositionErrorCallback
} {
  const handlers: { success: PositionCallback; error: PositionErrorCallback } = {
    // Placeholders: se reemplazan en cuanto el hook llama a watchPosition.
    success: () => undefined,
    error: () => undefined,
  }
  geolocationStub.watchPosition.mockImplementation(
    (success: PositionCallback, error: PositionErrorCallback) => {
      handlers.success = success
      handlers.error = error
      return 7
    },
  )
  return handlers
}

function emitGpsPosition(
  handlers: { success: PositionCallback },
  lat: number,
  lng: number,
): void {
  act(() => {
    handlers.success({
      coords: { latitude: lat, longitude: lng },
    } as unknown as GeolocationPosition)
  })
}

function buildGeolocationError(code: number, message: string): GeolocationPositionError {
  return Object.assign(new Error(message), {
    code,
    TIMEOUT: 3,
    POSITION_UNAVAILABLE: 2,
  }) as unknown as GeolocationPositionError
}

beforeEach(() => {
  vi.clearAllMocks()
  geolocationStub.watchPosition.mockReturnValue(7)
  geolocationStub.clearWatch.mockReset()
  queueMocks.isBrowserOffline.mockReturnValue(false)
  queueMocks.enqueueOfflineEvent.mockResolvedValue({
    id: 'queued-1',
    createdAt: 1,
    event: {},
  })
  Object.defineProperty(navigator, 'geolocation', {
    value: geolocationStub,
    configurable: true,
  })
})

// El stub vive toda la suite (cada beforeEach lo reinstala): restaurar en
// afterEach rompería el auto-cleanup de React Testing Library, que se
// ejecuta después y desmonta el hook (que llama a clearWatch).
afterAll(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
  })
})

describe('useGpsTracking', () => {
  it('suscribe el canal Realtime y arranca el watch nativo del GPS', () => {
    captureWatchHandlers()

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })

    expect(result.current.tracking).toBe(true)
    expect(supabaseMocks.channelFn).toHaveBeenCalledWith('driver_locations:order-1')
    expect(supabaseMocks.channel.subscribe).toHaveBeenCalled()
    expect(geolocationStub.watchPosition).toHaveBeenCalled()
  })

  it('emite la posición por Realtime cuando hay conexión', () => {
    const handlers = captureWatchHandlers()

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })
    emitGpsPosition(handlers, 10.5, -66.9)

    expect(result.current.position).toEqual({ lat: 10.5, lng: -66.9 })
    expect(supabaseMocks.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'driver_location',
        payload: expect.objectContaining({
          lat: 10.5,
          lng: -66.9,
          orderId: 'order-1',
        }),
      }),
    )
    expect(queueMocks.enqueueOfflineEvent).not.toHaveBeenCalled()
  })

  it('sin conexión encola la coordenada y el GPS nativo sigue rastreando', () => {
    queueMocks.isBrowserOffline.mockReturnValue(true)
    const handlers = captureWatchHandlers()

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })
    emitGpsPosition(handlers, 10.4806, -66.9036)

    expect(queueMocks.enqueueOfflineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'driver_location',
        orderId: 'order-1',
        lat: 10.4806,
        lng: -66.9036,
      }),
    )
    // El broadcast en vivo es imposible sin red: no se intenta.
    expect(supabaseMocks.channel.send).not.toHaveBeenCalled()
    // La posición local sí avanza: el mapa del repartidor sigue al GPS.
    expect(result.current.position).toEqual({ lat: 10.4806, lng: -66.9036 })
    expect(result.current.tracking).toBe(true)
  })

  it('marca error de GPS cuando el watch nativo falla', () => {
    geolocationStub.watchPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error(buildGeolocationError(2, 'sin señal'))
        return 7
      },
    )

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })

    expect(result.current.error).toBe('Error de GPS: sin señal')
    expect(result.current.tracking).toBe(false)
  })

  it('reintenta una sola vez con timeout mayor cuando el GPS tarda', () => {
    // Solo el primer watch falla por timeout; el reintento ya no.
    let watchCalls = 0
    geolocationStub.watchPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        watchCalls += 1
        if (watchCalls === 1) {
          error(buildGeolocationError(3, 'tardó'))
        }
        return 7
      },
    )

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })

    expect(geolocationStub.watchPosition).toHaveBeenCalledTimes(2)
    expect(geolocationStub.watchPosition).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ timeout: 60000 }),
    )
    expect(result.current.error).toBeNull()
  })

  it('reporta error cuando el dispositivo no expone geolocalización', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
    })

    expect(result.current.error).toBe(
      'Geolocalización no disponible en este dispositivo',
    )
    expect(result.current.tracking).toBe(false)
  })

  it('reporta error cuando no hay orden activa que rastrear', () => {
    const { result } = renderHook(() => useGpsTracking(null))
    act(() => {
      result.current.startTracking()
    })

    expect(result.current.error).toBe(
      'Geolocalización no disponible en este dispositivo',
    )
  })

  it('stopTracking limpia el watch nativo y el canal Realtime', () => {
    geolocationStub.watchPosition.mockReturnValue(11)

    const { result } = renderHook(() => useGpsTracking('order-1'))
    act(() => {
      result.current.startTracking()
      result.current.stopTracking()
    })

    expect(geolocationStub.clearWatch).toHaveBeenCalledWith(11)
    expect(supabaseMocks.removeChannel).toHaveBeenCalledWith(supabaseMocks.channel)
    expect(result.current.tracking).toBe(false)
  })

  it('programa la sincronización diferida de la cola al montar', () => {
    renderHook(() => useGpsTracking('order-1'))

    expect(syncMocks.scheduleOfflineSync).toHaveBeenCalled()
  })
})
