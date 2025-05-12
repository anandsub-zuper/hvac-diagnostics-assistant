// src/services/geolocation.js
import axios from 'axios';

/**
 * Get current location coordinates from browser
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      error => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

/**
 * Convert coordinates to address using Google Geocoding API
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Address details
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is missing');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    // Extract the most accurate address result
    const result = response.data.results[0];
    
    // Parse address components
    const addressComponents = {};
    result.address_components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressComponents.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        addressComponents.street = component.long_name;
      } else if (types.includes('locality')) {
        addressComponents.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.short_name;
      } else if (types.includes('postal_code')) {
        addressComponents.zipCode = component.long_name;
      } else if (types.includes('country')) {
        addressComponents.country = component.long_name;
        addressComponents.countryCode = component.short_name;
      }
    });
    
    // Format the address components into a structured object
    return {
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      streetNumber: addressComponents.streetNumber || '',
      street: addressComponents.street || '',
      city: addressComponents.city || '',
      state: addressComponents.state || '',
      zipCode: addressComponents.zipCode || '',
      country: addressComponents.country || '',
      countryCode: addressComponents.countryCode || '',
      latitude,
      longitude
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

/**
 * Geocode an address to coordinates using Google Geocoding API
 * @param {string} address 
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string}>}
 */
export const geocodeAddress = async (address) => {
  try {
    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is missing');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    const { lat, lng } = result.geometry.location;

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};
