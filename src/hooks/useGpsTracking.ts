import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

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

  const broadcastPosition = useCallback(
    (pos: GpsPosition) => {
      if (!channelRef.current || !orderId) return
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

  const startTracking = useCallback(() => {
    if (!orderId || !navigator.geolocation) {
      setError('Geolocalización no disponible en este dispositivo')
      return
    }

    setError(null)
    setTracking(true)

    // Subscribe to a Supabase Realtime channel for this order
    const channel = supabase.channel(`${CHANNEL_PREFIX}${orderId}`)
    channelRef.current = channel
    void channel.subscribe()

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
        setError(`Error de GPS: ${err.message}`)
        setTracking(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    )

    watchIdRef.current = watchId
  }, [orderId, broadcastPosition])

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
