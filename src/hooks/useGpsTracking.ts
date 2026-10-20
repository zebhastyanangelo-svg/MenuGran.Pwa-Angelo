import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { scheduleOfflineSync } from '../services/offlineSyncService'
import { enqueueOfflineEvent, isBrowserOffline } from '../utils/offlineSyncQueue'

export interface GpsPosition {
  lat: number
  lng: number
}

interface UseGpsTrackingResult {
  position: GpsPosition | null
  error: string | null
  tracking: boolean
  startTracking: () => void
  stopTracking: () => void
}

const CHANNEL_PREFIX = 'driver_locations:'

export function useGpsTracking(
  orderId: string | null,
): UseGpsTrackingResult {
  const [position, setPosition] = useState<GpsPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retriedRef = useRef(false)

  const broadcastPosition = useCallback(
    (pos: GpsPosition) => {
      if (!orderId) return
      // Sin internet el GPS nativo del teléfono sigue reportando (la API de
      // geolocalización no depende de la red): la posición alimenta el mapa
      // local y se guarda en la cola offline para sincronizar con Supabase
      // apenas vuelva la conectividad.
      if (isBrowserOffline()) {
        void enqueueOfflineEvent({
          type: 'driver_location',
          orderId,
          lat: pos.lat,
          lng: pos.lng,
          recordedAt: Date.now(),
        })
        return
      }
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'driver_location',
        payload: {
          lat: pos.lat,
          lng: pos.lng,
          orderId,
          timestamp: Date.now(),
        },
      })
    },
    [orderId],
  )

  const startWatch = useCallback(
    (options: PositionOptions) => {
      if (!orderId || !navigator.geolocation) {
        setError('Geolocalización no disponible en este dispositivo')
        return
      }

      const watchId = navigator.geolocation.watchPosition(
        (geo) => {
          const newPos: GpsPosition = {
            lat: geo.coords.latitude,
            lng: geo.coords.longitude,
          }
          setPosition(newPos)
          broadcastPosition(newPos)
        },
        (err) => {
          if (err.code === err.TIMEOUT && !retriedRef.current) {
            retriedRef.current = true
            // retry with longer timeout
            startWatch({ ...options, timeout: 60000 })
            return
          }
          setError(`Error de GPS: ${err.message}`)
          setTracking(false)
        },
        options,
      )
      watchIdRef.current = watchId
    },
    [orderId, broadcastPosition],
  )

  const startTracking = useCallback(() => {
    if (!orderId || !navigator.geolocation) {
      setError('Geolocalización no disponible en este dispositivo')
      return
    }

    retriedRef.current = false
    setError(null)
    setTracking(true)

    // Subscribe to a Supabase Realtime channel for this order
    const channel = supabase.channel(`${CHANNEL_PREFIX}${orderId}`)
    channelRef.current = channel
    void channel.subscribe()

    startWatch({
      enableHighAccuracy: false,
      maximumAge: 5000,
      timeout: 30000,
    })
  }, [orderId, startWatch])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setTracking(false)
  }, [])

  // Sincronización diferida: al montar el rastreo se programa el vaciado
  // automático de la cola cuando el navegador recupere conexión (evento
  // `online`) y un intento inmediato si hay pendientes de sesiones previas.
  useEffect(() => {
    scheduleOfflineSync()
  }, [])

  // Cleanup on unmount or orderId change
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return { position, error, tracking, startTracking, stopTracking }
}
