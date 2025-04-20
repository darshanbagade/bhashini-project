// Get current location
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true, // Get the most accurate position available
        timeout: 10000,           // Timeout after 10 seconds
        maximumAge: 0             // No cached positions
      }
    );
  });
};

// Format location for display
export const formatLocation = (location: { latitude: number; longitude: number }): string => {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};

// Generate Google Maps URL
export const getGoogleMapsUrl = (location: { latitude: number; longitude: number }): string => {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}; 