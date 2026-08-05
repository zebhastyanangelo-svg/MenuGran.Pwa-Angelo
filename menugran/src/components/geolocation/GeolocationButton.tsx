'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/ui/Button';

interface GeolocationButtonProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  isLoading?: boolean;
  className?: string;
}

export default function GeolocationButton({
  onLocationSelect,
  isLoading = false,
  className = '',
}: GeolocationButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleGetLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('La geolocalización no está soportada por tu navegador.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('Permiso de ubicación denegado. Por favor, activa los permisos de ubicación.'));
                break;
              case error.POSITION_UNAVAILABLE:
                reject(new Error('Información de ubicación no disponible.'));
                break;
              case error.TIMEOUT:
                reject(new Error('Se agotó el tiempo de espera para obtener la ubicación.'));
                break;
              default:
                reject(new Error('Error al obtener la ubicación.'));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      const { latitude, longitude } = position.coords;

      let address = '';

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
        );
        const data = await response.json();
        if (data.display_name) {
          address = data.display_name;
        }
      } catch (reverseError) {
        console.error('Error al geocodificar:', reverseError);
      }

      setStatus('success');
      onLocationSelect(latitude, longitude, address);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al obtener ubicación.');
    }
  }, [onLocationSelect]);

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="secondary"
        size="md"
        onClick={handleGetLocation}
        disabled={isLoading || status === 'loading' || status === 'success'}
        className={className}
        isLoading={status === 'loading'}
      >
        <FontAwesomeIcon
          icon={status === 'success' ? faCheck : faLocationDot}
          className="mr-2 h-4 w-4"
        />
        {status === 'loading' ? 'Obteniendo ubicación...' : status === 'success' ? 'Ubicación detectada' : 'Usar mi ubicación actual'}
      </Button>

      {status === 'error' && errorMessage && (
        <div className="mt-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600">
          <p className="font-semibold">Error:</p>
          <p>{errorMessage}</p>
          <p className="mt-2 text-xs">
            Por favor, activa los permisos de ubicación o ingresa la dirección manualmente.
          </p>
        </div>
      )}
    </div>
  );
}
