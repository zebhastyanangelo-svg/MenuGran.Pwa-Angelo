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

export async function fetchOsrmRoute(
  from: [number, number],
  to: [number, number],
): Promise<readonly [number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [from, to];
    const data: OsrmRouteResponse = await response.json();
    if (data.code !== 'Ok' || data.routes.length === 0) return [from, to];
    return data.routes[0].geometry.coordinates.map(
      (coord) => [coord[1], coord[0]] as [number, number],
    );
  } catch {
    return [from, to];
  } finally {
    clearTimeout(timer);
  }
}
