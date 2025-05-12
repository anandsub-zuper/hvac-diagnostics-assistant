// src/services/zuperService.js
import axios from 'axios';

/**
 * Service for interacting with Zuper API
 */
class ZuperService {
  constructor() {
    this.apiKey = process.env.REACT_APP_ZUPER_API_KEY;
    this.region = process.env.REACT_APP_ZUPER_REGION || 'us';
    this.baseUrl = `https://${this.region}.zuperpro.com/api`;
    
    if (!this.apiKey) {
      console.warn('Zuper API key is not configured');
    }
  }

  /**
   * Get authorization headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  /**
   * Search for existing customer by email or phone
   * @param {string} email - Customer email
   * @param {string} phone - Customer phone
   * @returns {Promise<Object>} Customer data or null if not found
   */
  async searchCustomer(email, phone) {
    try {
      // Try to find by email first
      if (email) {
        const emailResponse = await axios.get(
          `${this.baseUrl}/v1/customers`,
          {
            headers: this.getHeaders(),
            params: {
              email
            }
          }
        );

        if (emailResponse.data.data && emailResponse.data.data.length > 0) {
          return emailResponse.data.data[0];
        }
      }

      // Try to find by phone if email search failed
      if (phone) {
        const phoneResponse = await axios.get(
          `${this.baseUrl}/v1/customers`,
          {
            headers: this.getHeaders(),
            params: {
              phone
            }
          }
        );

        if (phoneResponse.data.data && phoneResponse.data.data.length > 0) {
          return phoneResponse.data.data[0];
        }
      }

      // No customer found
      return null;
    } catch (error) {
      console.error('Error searching for customer in Zuper:', error);
      return null;
    }
  }

  /**
   * Create a new customer in Zuper
   * @param {Object} customerData - Customer data to create
   * @returns {Promise<Object>} Created customer data
   */
  async createCustomer(customerData) {
    try {
      // Format the customer data according to Zuper API requirements
      const formattedCustomerData = {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        company_name: customerData.companyName || '',
        notes: customerData.notes || '',
        customer_type: customerData.customerType || 'residential',
        address: customerData.address ? {
          address_line1: customerData.address.streetAddress,
          address_line2: customerData.address.unit || '',
          city: customerData.address.city,
          state: customerData.address.state,
          country: customerData.address.country || 'USA',
          zip_code: customerData.address.zipCode
        } : undefined
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/customers`,
        formattedCustomerData,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error creating customer in Zuper:', error);
      throw error;
    }
  }

  /**
   * Create a property for a customer in Zuper
   * @param {string} customerId - Zuper customer ID
   * @param {Object} propertyData - Property data to create
   * @returns {Promise<Object>} Created property data
   */
  async createProperty(customerId, propertyData) {
    try {
      // Format the property data according to Zuper API requirements
      const formattedPropertyData = {
        customer_id: customerId,
        property_name: propertyData.propertyName || 'Primary Property',
        property_type: propertyData.propertyType || 'residential',
        address: {
          address_line1: propertyData.address.streetAddress,
          address_line2: propertyData.address.unit || '',
          city: propertyData.address.city,
          state: propertyData.address.state,
          country: propertyData.address.country || 'USA',
          zip_code: propertyData.address.zipCode
        },
        property_attributes: {
          year_built: propertyData.attributes.yearBuilt || '',
          square_feet: propertyData.attributes.squareFeet || '',
          bedrooms: propertyData.attributes.bedrooms || '',
          bathrooms: propertyData.attributes.bathrooms || '',
          lot_size: propertyData.attributes.lotSize || ''
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/properties`,
        formattedPropertyData,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error creating property in Zuper:', error);
      throw error;
    }
  }

  /**
   * Create an asset (equipment) in Zuper
   * @param {Object} assetData - Asset data to create
   * @returns {Promise<Object>} Created asset data
   */
  async createAsset(assetData) {
    try {
      // Format the asset data according to Zuper API requirements
      const formattedAssetData = {
        asset_name: assetData.name,
        asset_type: assetData.type || 'HVAC',
        model: assetData.model || '',
        manufacturer: assetData.manufacturer || '',
        serial_number: assetData.serialNumber || '',
        status: assetData.status || 'active',
        customer_id: assetData.customerId,
        property_id: assetData.propertyId,
        installation_date: assetData.installationDate || '',
        warranty_expiry_date: assetData.warrantyExpiryDate || '',
        notes: assetData.notes || '',
        custom_fields: {
          system_type: assetData.systemType || '',
          tonnage: assetData.tonnage || '',
          efficiency_rating: assetData.efficiencyRating || ''
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/assets`,
        formattedAssetData,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error creating asset in Zuper:', error);
      throw error;
    }
  }

  /**
   * Create a job in Zuper based on diagnosis
   * @param {Object} jobData - Job data to create
   * @returns {Promise<Object>} Created job data
   */
  async createJob(jobData) {
    try {
      // Format the job data according to Zuper API requirements
      const formattedJobData = {
        customer_id: jobData.customerId,
        property_id: jobData.propertyId,
        assets: jobData.assetIds || [],
        job_title: jobData.title || 'HVAC Service',
        job_description: jobData.description || '',
        job_category: jobData.jobCategory,
        priority: jobData.priority || 'medium',
        status: jobData.status || 'new',
        scheduled_start_time: jobData.scheduledStartTime || null,
        scheduled_end_time: jobData.scheduledEndTime || null,
        custom_fields: {
          diagnostic_result: jobData.diagnosticResult || '',
          required_parts: jobData.requiredParts || '',
          repair_complexity: jobData.repairComplexity || ''
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/jobs`,
        formattedJobData,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error creating job in Zuper:', error);
      throw error;
    }
  }

  /**
   * Get all properties for a customer
   * @param {string} customerId - Zuper customer ID
   * @returns {Promise<Array>} List of properties
   */
  async getCustomerProperties(customerId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/properties`,
        {
          headers: this.getHeaders(),
          params: {
            customer_id: customerId
          }
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching customer properties from Zuper:', error);
      return [];
    }
  }

  /**
   * Get all assets for a property
   * @param {string} propertyId - Zuper property ID
   * @returns {Promise<Array>} List of assets
   */
  async getPropertyAssets(propertyId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/assets`,
        {
          headers: this.getHeaders(),
          params: {
            property_id: propertyId
          }
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching property assets from Zuper:', error);
      return [];
    }
  }
}

export default new ZuperService();
