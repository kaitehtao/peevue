// A captured GPS point remains usable even when reverse geocoding is unavailable.
export function gpsAddress(latitude: number, longitude: number, address?: string) {
  const label = address?.trim();
  return label && label.length >= 8 && label.length <= 250
    ? label
    : `GPS location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
export async function resolveGpsAddress(latitude: number, longitude: number, request: typeof fetch = fetch) {
  try {
    const response = await request(`/api/location?lat=${latitude}&lng=${longitude}`, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const data = await response.json() as { results?: Array<{address?: string}> };
      return gpsAddress(latitude, longitude, data.results?.[0]?.address);
    }
  } catch { /* The GPS point is already available; street naming is optional. */ }
  return gpsAddress(latitude, longitude);
}
