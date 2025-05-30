// src/services/rentcastService.js - FULL UPDATED CODE
import axios from 'axios';

/**
 * Service to interact with Rentcast API
 */
class RentcastService {
  constructor() {
    this.apiKey = process.env.REACT_APP_RENTCAST_API_KEY;
    this.baseUrl = 'https://api.rentcast.io/v1';

    if (!this.apiKey) {
      console.warn('Rentcast API key is not configured');
    }
  }

  /**
   * Get authorization headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'accept': 'application/json',
      'X-Api-Key': this.apiKey
    };
  }

  /**
   * Get property details by address
   * @param {Object} address - Address object containing streetNumber, street, city, state, zipCode, country
   * @returns {Promise<Object>} Property details
   */
  async getPropertyByAddress(address) {
    try {
      // Construct a detailed address string
      let addressStr = '';
      if (address.streetNumber) addressStr += address.streetNumber + ' ';
      if (address.street) addressStr += address.street + ', ';
      if (address.city) addressStr += address.city + ', ';
      if (address.county) addressStr += address.county + ', '; // Include county if available
      if (address.state) addressStr += address.state + ', ';
      if (address.zipCode) addressStr += address.zipCode;
      if (address.country) addressStr += ', ' + address.country;
      else addressStr += ', United States'; // Default country

      console.log('Querying Rentcast by address:', addressStr);

      // CRITICAL FIX: Manually encode the address and construct the full URL
      // This bypasses axios's params object completely
      const encodedAddress = encodeURIComponent(addressStr);
      const fullUrl = `${this.baseUrl}/properties?address=${encodedAddress}`;
      
      console.log('Request URL:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        headers: this.getHeaders()
      });

      // Check if we got data back
      if (!response.data || response.data.length === 0) {
        throw new Error('No property found at this address');
      }

      // Process the first item in the results array
      return this.processPropertyData(response.data[0]);
    } catch (error) {
      console.error('Error fetching property from Rentcast:', error);
      throw error;
    }
  }

  /**
   * Get property details by latitude and longitude
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>} Property details
   */
  async getPropertyByLocation(latitude, longitude) {
    try {
      console.log('Querying Rentcast by coordinates:', latitude, longitude);

      // FIXED: Construct the URL manually to avoid double encoding
      const fullUrl = `${this.baseUrl}/properties?latitude=${latitude}&longitude=${longitude}`;
      
      console.log('Request URL:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        headers: this.getHeaders()
      });

      // Check if we got data back
      if (!response.data || response.data.length === 0) {
        throw new Error('No property found at this location');
      }

      // Process the first item in the results array
      return this.processPropertyData(response.data[0]);
    } catch (error) {
      console.error('Error fetching property by location from Rentcast:', error);
      throw error;
    }
  }

  /**
   * Fallback method that tries different lookup methods
   * @param {Object} address - Address object with coordinates and address details
   * @returns {Promise<Object>} Property details
   */
  async getPropertyWithFallback(address) {
    try {
      // Try by street address first if available
      if (address.streetNumber && address.street && address.city && address.state) {
        try {
          return await this.getPropertyByAddress(address);
        } catch (addressError) {
          console.log('Address lookup failed, trying coordinates...', addressError);
          // Fall through to coordinate lookup
        }
      }

      // Try by coordinates if available
      if (address.latitude && address.longitude) {
        return await this.getPropertyByLocation(address.latitude, address.longitude);
      }

      // Try by zip code as a last resort
      if (address.zipCode) {
        try {
          return await this.getPropertiesByZipCode(address.zipCode);
        } catch (zipError) {
          console.log('ZIP code lookup failed:', zipError);
        }
      }

      throw new Error('Insufficient address information to query Rentcast API');
    } catch (error) {
      console.error('All Rentcast lookup methods failed:', error);
      throw error;
    }
  }

  /**
   * Get properties by ZIP code
   * @param {string} zipCode - ZIP code to search
   * @returns {Promise<Object>} Property details
   */
  async getPropertiesByZipCode(zipCode) {
    try {
      console.log('Querying Rentcast by ZIP code:', zipCode);

      // FIXED: Construct the URL manually
      const fullUrl = `${this.baseUrl}/properties?zipCode=${zipCode}`;
      
      console.log('Request URL:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        headers: this.getHeaders()
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No properties found for this ZIP code');
      }

      // Return the first property in the ZIP code
      return this.processPropertyData(response.data[0]);
    } catch (error) {
      console.error('Error fetching properties by ZIP code from Rentcast:', error);
      throw error;
    }
  }

  /**
   * Process raw property data from Rentcast API
   * @param {Object} rawProperty - Raw property data from API
   * @returns {Object} Processed property data
   */
  processPropertyData(rawProperty) {
    // Extract the relevant information we need for our application
    return {
      id: rawProperty.id || '',
      address: {
        streetAddress: rawProperty.addressLine1 || '',
        unit: rawProperty.addressLine2 || '',
        city: rawProperty.city || '',
        state: rawProperty.state || '',
        zipCode: rawProperty.zipCode || '',
        fullAddress: rawProperty.formattedAddress || rawProperty.fullAddress || ''
      },
      propertyAttributes: {
        propertyType: rawProperty.propertyType || '',
        yearBuilt: rawProperty.yearBuilt || '',
        // FIXED: Use squareFootage instead of squareFeet
        squareFeet: rawProperty.squareFootage || 0,
        bedrooms: rawProperty.bedrooms || 0,
        bathrooms: rawProperty.bathrooms || 0,
        lotSize: rawProperty.lotSize || 0
      },
      propertyFeatures: this.extractPropertyFeatures(rawProperty),
      ownerInfo: this.extractOwnerInfo(rawProperty),
      propertyValues: {
        estimatedValue: rawProperty.estimatedValue || 0,
        lastSalePrice: rawProperty.lastSalePrice || 0,
        lastSaleDate: rawProperty.lastSaleDate || ''
      },
      rawData: rawProperty // Keep the raw data for reference if needed
    };
  }

  /**
   * Extract property features from raw property data
   * @param {Object} rawProperty - Raw property data
   * @returns {Object} Property features
   */
  extractPropertyFeatures(rawProperty) {
    // FIXED: Properly extract features from the features object
    const features = rawProperty.features || {};
    
    return {
      hasPool: rawProperty.hasPool || false,
      hasGarage: features.garage || false,
      hasCentralAir: rawProperty.hasCentralAir || features.centralAir || false,
      hasBasement: rawProperty.hasBasement || false,
      stories: rawProperty.stories || features.floorCount || 1,
      parkingSpaces: rawProperty.parkingSpaces || 0,
      yearRenovated: rawProperty.yearRenovated || '',
      // Add additional feature properties
      hasFireplace: features.fireplace || false,
      floorCount: features.floorCount || 1,
      garageType: features.garageType || '',
      hasHeating: features.heating || false,
      heatingType: features.heatingType || '',
      unitCount: features.unitCount || 1,
      // Keep the full features object for reference
      features: features
    };
  }

  /**
   * Extract owner information from raw property data
   * @param {Object} rawProperty - Raw property data
   * @returns {Object} Owner information
   */
  extractOwnerInfo(rawProperty) {
    // FIXED: Properly extract owner information from the nested structure
    // Check if owner object exists
    const owner = rawProperty.owner || {};
    
    // Extract name(s) from the owner names array if available
    let ownerName = '';
    if (owner.names && owner.names.length > 0) {
      ownerName = owner.names.join(', ');
    }
    
    // Extract mailing address if available
    let mailingAddress = '';
    if (owner.mailingAddress) {
      const ma = owner.mailingAddress;
      const addressParts = [
        ma.addressLine1,
        ma.addressLine2,
        ma.city,
        ma.state,
        ma.zipCode
      ].filter(part => part); // Remove empty values
      
      mailingAddress = addressParts.join(', ');
    }
    
    return {
      name: ownerName || rawProperty.ownerName || '',
      mailingAddress: mailingAddress || rawProperty.ownerMailingAddress || '',
      phoneNumber: rawProperty.ownerPhoneNumber || '',
      email: rawProperty.ownerEmail || ''
    };
  }

  /**
   * Extract tenant information from raw property data
   * This method is kept for backward compatibility but is no longer used
   * @param {Object} rawProperty - Raw property data
   * @returns {Object} Tenant information
   */
  extractTenantInfo(rawProperty) {
    // This method is no longer used since tenant info is not required
    return {
      occupancyStatus: rawProperty.occupancyStatus || 'Unknown',
      leaseStartDate: rawProperty.leaseStartDate || '',
      leaseEndDate: rawProperty.leaseEndDate || '',
      monthlyRent: rawProperty.monthlyRent || 0,
      tenantName: rawProperty.tenantName || '',
      tenantPhone: rawProperty.tenantPhone || '',
      tenantEmail: rawProperty.tenantEmail || ''
    };
  }
}

export default new RentcastService();
