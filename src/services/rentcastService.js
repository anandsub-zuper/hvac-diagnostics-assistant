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
   * Get property details by address
   * @param {Object} address - Address object containing street, city, state, zipCode
   * @returns {Promise<Object>} Property details
   */
  async getPropertyByAddress(address) {
    try {
      // Format the address for the API request
      const formattedAddress = `${address.streetNumber} ${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
      const url = `${this.baseUrl}/properties?address=${encodeURIComponent(formattedAddress)}`; // Construct URL directly

      console.log('RentCast API Request (Address):', url);

      const response = await fetch(url, { // Use fetch
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RentCast API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No property found at this address');
      }

      return this.processPropertyData(data[0]);
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
      const url = `${this.baseUrl}/properties/coordinates?latitude=${latitude}&longitude=${longitude}`; // Construct URL directly

      console.log('RentCast API Request (Location):', url);

      const response = await fetch(url, { // Use fetch
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RentCast API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No property found at this location');
      }

      return this.processPropertyData(data[0]);
    } catch (error) {
      console.error('Error fetching property by location from Rentcast:', error);
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
        fullAddress: rawProperty.fullAddress || ''
      },
      propertyAttributes: {
        propertyType: rawProperty.propertyType || '',
        yearBuilt: rawProperty.yearBuilt || '',
        squareFeet: rawProperty.squareFeet || 0,
        bedrooms: rawProperty.bedrooms || 0,
        bathrooms: rawProperty.bathrooms || 0,
        lotSize: rawProperty.lotSize || 0
      },
      propertyFeatures: this.extractPropertyFeatures(rawProperty),
      ownerInfo: this.extractOwnerInfo(rawProperty),
      tenantInfo: this.extractTenantInfo(rawProperty),
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
    return {
      hasPool: rawProperty.hasPool || false,
      hasGarage: rawProperty.hasGarage || false,
      hasCentralAir: rawProperty.hasCentralAir || false,
      hasBasement: rawProperty.hasBasement || false,
      stories: rawProperty.stories || 1,
      parkingSpaces: rawProperty.parkingSpaces || 0,
      yearRenovated: rawProperty.yearRenovated || '',
      features: rawProperty.features || []
    };
  }

  /**
   * Extract owner information from raw property data
   * @param {Object} rawProperty - Raw property data
   * @returns {Object} Owner information
   */
  extractOwnerInfo(rawProperty) {
    // Rentcast might not provide direct owner info, but we'll structure for future use
    return {
      name: rawProperty.ownerName || '',
      mailingAddress: rawProperty.ownerMailingAddress || '',
      phoneNumber: rawProperty.ownerPhoneNumber || '',
      email: rawProperty.ownerEmail || ''
    };
  }

  /**
   * Extract tenant information from raw property data
   * @param {Object} rawProperty - Raw property data
   * @returns {Object} Tenant information
   */
  extractTenantInfo(rawProperty) {
    // Rentcast might not provide direct tenant info, but we'll structure for future use
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
