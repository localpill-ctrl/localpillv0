import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
} from 'geofire-common';

// Default broadcast radius in kilometers
export const DEFAULT_RADIUS_KM = 2;

// Calculate geohash for a location
export const calculateGeohash = (lat: number, lng: number): string => {
  return geohashForLocation([lat, lng]);
};

// Get query bounds for a radius search
export const getGeohashBounds = (
  lat: number,
  lng: number,
  radiusKm: number = DEFAULT_RADIUS_KM
): [string, string][] => {
  const radiusMeters = radiusKm * 1000;
  return geohashQueryBounds([lat, lng], radiusMeters);
};

// Calculate distance between two points in kilometers
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const distanceMeters = distanceBetween([lat1, lng1], [lat2, lng2]);
  return distanceMeters / 1000; // Convert to km
};

// Check if a point is within radius
export const isWithinRadius = (
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number = DEFAULT_RADIUS_KM
): boolean => {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusKm;
};

// Get current location using browser geolocation
export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );
  });
};

// Reverse geocode coordinates to address using OpenStreetMap Nominatim
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// Get current location with address
export const getCurrentLocationWithAddress = async (): Promise<{
  lat: number;
  lng: number;
  address: string;
  geohash: string;
}> => {
  const coords = await getCurrentLocation();
  const [address, geohash] = await Promise.all([
    reverseGeocode(coords.lat, coords.lng),
    Promise.resolve(calculateGeohash(coords.lat, coords.lng)),
  ]);
  return {
    lat: coords.lat,
    lng: coords.lng,
    address,
    geohash,
  };
};
