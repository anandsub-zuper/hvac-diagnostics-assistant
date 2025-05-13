// Updated zuperService.js with corrected field names for Zuper API

import axios from 'axios';

/**
 * Service for interacting with Zuper API through the backend proxy
 */
class ZuperService {
  constructor() {
    // URL to the backend proxy
    this.proxyUrl = process.env.REACT_APP_BACKEND_URL || 'https://hvac-api-proxy.herokuapp.com';
    console.log('Using backend proxy URL:', this.proxyUrl);
  }

  /**
   * Make a proxied API request through the backend
   * @param {string} endpoint - API endpoint path (without the base URL)
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {object} params - Query parameters
   * @param {object} data - Request body data
   * @returns {Promise} - Promise with the API response
   */
  async makeProxiedRequest(endpoint, method = 'GET', params = null, data = null) {
    try {
      const response = await axios.post(`${this.proxyUrl}/api/zuper`, {
        endpoint,
        method,
        params,
        data
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error making proxied request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for existing customer by email or phone
   * @param {string} email - Customer email
   * @param {string} phone - Customer phone
   * @returns {Promise<Object>} Customer data or null if not found
   */
  async searchCustomer(email, phone) {
    try {
      // IMPROVED: Search for specific customer exactly matching email or phone
      if (email) {
        console.log(`Searching for customer with email: ${email}`);
        try {
          // Use a specific customer search endpoint if available, or use customer filter
          const emailResponse = await this.makeProxiedRequest(
            'customers/search', // Change to actual Zuper search endpoint if different
            'POST', 
            null, 
            { searchField: 'email', searchValue: email }
          );

          console.log('Email search response:', emailResponse);
          
          // CRITICAL: Check if we actually found a matching customer
          if (emailResponse && 
              emailResponse.data && 
              Array.isArray(emailResponse.data) && 
              emailResponse.data.length > 0) {
            
            // Verify the returned customer actually has the matching email
            const matchingCustomer = emailResponse.data.find(
              customer => customer.email && customer.email.toLowerCase() === email.toLowerCase()
            );
            
            if (matchingCustomer) {
              console.log('Found customer by email:', matchingCustomer.id);
              return matchingCustomer;
            }
          }
          
          console.log('No customer found with matching email');
        } catch (emailError) {
          console.error('Error searching by email:', emailError);
          // Fall through to try phone search
        }
      }

      // Try to find by phone if email search failed or no email provided
      if (phone) {
        console.log(`Searching for customer with phone: ${phone}`);
        try {
          const phoneResponse = await this.makeProxiedRequest(
            'customers/search', // Change to actual Zuper search endpoint if different
            'POST',
            null,
            { searchField: 'phone', searchValue: phone }
          );
          
          console.log('Phone search response:', phoneResponse);
          
          // CRITICAL: Check if we actually found a matching customer
          if (phoneResponse && 
              phoneResponse.data && 
              Array.isArray(phoneResponse.data) && 
              phoneResponse.data.length > 0) {
            
            // Verify the returned customer actually has the matching phone
            const matchingCustomer = phoneResponse.data.find(
              customer => customer.phone && customer.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, '')
            );
            
            if (matchingCustomer) {
              console.log('Found customer by phone:', matchingCustomer.id);
              return matchingCustomer;
            }
          }
          
          console.log('No customer found with matching phone');
        } catch (phoneError) {
          console.error('Error searching by phone:', phoneError);
        }
      }

      // No customer found with matching email or phone
      console.log('No matching customer found - will create new customer');
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
      // First, check if customer already exists
      let existingCustomer = null;
      if (customerData.email || customerData.phone) {
        existingCustomer = await this.searchCustomer(customerData.email, customerData.phone);
      }
      
      // If customer already exists, return that customer
      if (existingCustomer) {
        console.log('Using existing customer:', existingCustomer.id);
        return existingCustomer;
      }
      
      // Format the customer data according to Zuper API requirements
      // CORRECTED: Use the proper field names expected by Zuper API
      const formattedCustomerData = {
         customer: { 
        // FIXED: Using the correct field names for the Zuper API
        customer_first_name: customerData.firstName,
        customer_last_name: customerData.lastName,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_company_name: customerData.companyName || '',
        customer_notes: customerData.notes || '',
        customer_type: customerData.customerType || 'residential',
        customer_address: customerData.address ? {
          address_line1: customerData.address.streetAddress,
          address_line2: customerData.address.unit || '',
          city: customerData.address.city,
          state: customerData.address.state,
          country: customerData.address.country || 'USA',
          zip_code: customerData.address.zipCode
        } : undefined
         }
      };

      console.log('Creating new customer with data:', JSON.stringify(formattedCustomerData, null, 2));

      const response = await this.makeProxiedRequest('customers_new', 'POST', null, formattedCustomerData);
      // IMPROVED: Better validation of successful customer creation
      if (!response) {
        throw new Error('Empty response from customer creation');
      }
      
      // Check for error messages in the response
      if (response.error || response.message) {
        throw new Error(`Customer creation failed: ${response.message || JSON.stringify(response.error)}`);
      }
      
      if (!response.id) {
        console.error('Customer creation response missing ID:', response);
        throw new Error('Customer creation failed: No ID returned');
      }
      
      console.log('Customer created successfully with ID:', response.id);
      return response;
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
        property: {
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
            year_built: propertyData.attributes?.yearBuilt || '',
            square_feet: propertyData.attributes?.squareFeet || '',
            bedrooms: propertyData.attributes?.bedrooms || '',
            bathrooms: propertyData.attributes?.bathrooms || '',
            lot_size: propertyData.attributes?.lotSize || ''
          }
        }
      };

      const response = await this.makeProxiedRequest('property', 'POST', null, formattedPropertyData);
      return response.data;
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

      const response = await this.makeProxiedRequest('assets', 'POST', null, formattedAssetData);
      return response.data;
    } catch (error) {
      console.error('Error creating asset in Zuper:', error);
      throw error;
    }
  }

  /**
   * Get job categories from Zuper
   * @returns {Promise<Array>} List of job categories
   */
  async getJobCategories() {
    try {
      const response = await this.makeProxiedRequest('v1/job-categories', 'GET');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching job categories from Zuper:', error);
      return [];
    }
  }

  /**
   * Create a job in Zuper based on diagnosis
   * @param {Object} jobData - Job data to create
   * @returns {Promise<Object>} Created job data
   */
  async createJob(jobData) {
    try {
      // Extract diagnostic result
      let diagnosticResult = {};
      try {
        if (typeof jobData.diagnosticResult === 'string') {
          diagnosticResult = JSON.parse(jobData.diagnosticResult);
        } else if (jobData.diagnosticResult) {
          diagnosticResult = jobData.diagnosticResult;
        }
      } catch (e) {
        console.error('Error parsing diagnostic result:', e);
      }
      
      // Format for custom fields
      const requiredParts = diagnosticResult.requiredItems && diagnosticResult.requiredItems.length > 0
        ? diagnosticResult.requiredItems.join(', ')
        : '';
        
      const diagnosticSummary = diagnosticResult.possibleIssues && diagnosticResult.possibleIssues.length > 0
        ? diagnosticResult.possibleIssues.map(issue => `${issue.issue} (${issue.severity})`).join('; ')
        : '';
      
      // Process due date
      let dueDate = null;
      if (jobData.dueDate) {
        // Ensure due date is in ISO format
        const dueDateObj = new Date(jobData.dueDate);
        dueDate = dueDateObj.toISOString();
      }
      
      // Format the job data
      const formattedJobData = {
        customer_id: jobData.customerId,
        property_id: jobData.propertyId,
        assets: jobData.assetIds || [],
        job_title: jobData.title || 'HVAC Service',
        job_description: jobData.description || '',
        job_category: jobData.jobCategory,
        priority: jobData.priority || 'medium',
        status: jobData.status || 'new',
        due_date: dueDate,
        custom_fields: {
          diagnostic_result: diagnosticSummary,
          required_parts: requiredParts,
          repair_complexity: diagnosticResult.repairComplexity || '',
          additional_notes: diagnosticResult.additionalNotes || ''
        }
      };

      const response = await this.makeProxiedRequest('jobs', 'POST', null, formattedJobData);
      return response.data;
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
      const response = await this.makeProxiedRequest('property', 'GET', { customer_id: customerId });
      return response.data || [];
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
      const response = await this.makeProxiedRequest('assets', 'GET', { property_id: propertyId });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching property assets from Zuper:', error);
      return [];
    }
  }
}

export default new ZuperService();
