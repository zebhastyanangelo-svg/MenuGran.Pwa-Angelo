const OSRM_TIMEOUT_MS = 5000;

interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    geometry: {
      coordinates: Array<[number, number]>;
      type: string;
    };
  }>;
}

/** Paso de navegación devuelto por OSRM (maniobra + calle + métricas). */
export interface OsrmRouteStep {
  /** Maniobra a realizar al final del paso. */
  maneuver: {
    type: string;
    modifier?: string;
  };
  /** Nombre de la vía del paso (para "Continúa por Av. Principal"). */
  name: string;
  /** Distancia del paso en metros. */
  distanceMeters: number;
}

/** Detalles de la ruta para la interfaz de navegación. */
export interface OsrmRouteDetails {
  coordinates: readonly [number, number][];
  /** Duración total estimada del trayecto, en segundos. */
  durationSeconds: number;
  /** Distancia total del trayecto, en metros. */
  distanceMeters: number;
  /** Pasos con instrucciones de giro, en orden de marcha. */
  steps: readonly OsrmRouteStep[];
}

interface OsrmStepsResponse {
  code: string;
  routes: Array<{
    geometry: {
      type: string;
      coordinates: Array<[number, number]>;
    };
    duration: number;
    distance: number;
    legs: Array<{
      steps: Array<{
        maneuver: { type: string; modifier?: string };
        name?: string;
        distance: number;
      }>;
    }>;
  }>;
}

function buildOsrmUrl(
  from: [number, number],
  to: [number, number],
  withSteps: boolean,
): string {
  const stepsParam = withSteps ? '&steps=true' : '';
  return (
    `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson${stepsParam}`
  );
}

function fallbackRoute(from: [number, number], to: [number, number]): readonly [number, number][] {
  return [from, to];
}

export async function fetchOsrmRoute(
  from: [number, number],
  to: [number, number],
): Promise<readonly [number, number][]> {
  const url = buildOsrmUrl(from, to, false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return fallbackRoute(from, to);
    const data: OsrmRouteResponse = await response.json();
    if (data.code !== 'Ok' || data.routes.length === 0) return fallbackRoute(from, to);
    return data.routes[0].geometry.coordinates.map(
      (coord) => [coord[1], coord[0]] as [number, number],
    );
  } catch {
    return fallbackRoute(from, to);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ruta completa para navegación turn-by-turn: coordenadas + duración +
 * distancia + pasos con maniobras.
 *
 * Ante cualquier fallo (red, respuesta inválida) degrada a la línea recta con
 * la distancia haversine subyacente estimada por OSRM ausente: la UI de
 * navegación muestra "Sigue directo" en vez de inventar giros.
 */
export async function fetchOsrmRouteDetails(
  from: [number, number],
  to: [number, number],
): Promise<OsrmRouteDetails> {
  const url = buildOsrmUrl(from, to, true);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('osrm-unavailable');
    const data: OsrmStepsResponse = await response.json();
    if (data.code !== 'Ok' || data.routes.length === 0) throw new Error('osrm-no-route');

    const route = data.routes[0];
    const steps: OsrmRouteStep[] = (route.legs[0]?.steps ?? []).map((step) => ({
      maneuver: { type: step.maneuver.type, modifier: step.maneuver.modifier },
      name: step.name ?? '',
      distanceMeters: step.distance,
    }));

    return {
      coordinates: route.geometry.coordinates.map(
        (coord) => [coord[1], coord[0]] as [number, number],
      ),
      durationSeconds: route.duration,
      distanceMeters: route.distance,
      steps,
    };
  } catch {
    return {
      coordinates: fallbackRoute(from, to),
      durationSeconds: 0,
      distanceMeters: 0,
      steps: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
