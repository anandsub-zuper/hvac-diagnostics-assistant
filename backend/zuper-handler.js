// Updated zuper-handler.js with proper ID extraction

const axios = require('axios');
require('dotenv').config();

/**
 * Handler for Zuper API requests
 * Centralizes Zuper API logic to ensure consistent formatting and error handling
 */
class ZuperHandler {
  constructor() {
    this.apiKey = process.env.ZUPER_API_KEY;
    this.region = process.env.ZUPER_REGION || 'us';
    
    if (!this.apiKey) {
      console.error('ERROR: ZUPER_API_KEY environment variable not set');
    }
    
    // FIXED: Properly format the base URL with dc-region format
    this.baseUrl = `https://${this.region}.zuperpro.com/api`;
    console.log(`Zuper API configured for region: ${this.region}`);
    console.log(`Using Zuper API base URL: ${this.baseUrl}`);
  }
  
  /**
   * Process a Zuper API request
   * @param {Object} requestDetails - Details of the request
   * @returns {Promise<Object>} - API response
   */
  async processRequest(requestDetails) {
    const { endpoint, method, params, data } = requestDetails;
    
    // Enhanced logging for debugging
    console.log(`\n===== ZUPER API REQUEST =====`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Method: ${method}`);
    console.log(`Params: ${params ? JSON.stringify(params) : 'none'}`);
    console.log(`Data: ${data ? JSON.stringify(data, null, 2).substring(0, 500) + '...' : 'none'}`);
    
    // Validate API key
    if (!this.apiKey) {
      throw new Error('Zuper API key not configured');
    }
    
    // Ensure endpoint doesn't start with a slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const fullUrl = `${this.baseUrl}/${formattedEndpoint}`;
    
    console.log(`Full URL: ${fullUrl}`);
    
    // Configure request with proper headers
    const requestConfig = {
      method: method || 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      timeout: 30000,
      // ADDED: Prevent redirects to HTML pages
      maxRedirects: 0
    };
    
    // Add query parameters if provided
    if (params) {
      requestConfig.params = params;
    }
    
    // Add request body if provided
    if (data) {
      requestConfig.data = data;
    }
    
    try {
      // Make the request to Zuper API
      const response = await axios(requestConfig);
      
      console.log(`\n===== ZUPER API RESPONSE =====`);
      console.log(`Status: ${response.status}`);
      
      // Process the response before returning
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('Authentication failed - received HTML instead of JSON. Check API key and region.');
      }
      
      // Log truncated response data
      const responseDataStr = typeof response.data === 'string' 
        ? response.data.substring(0, 500)
        : JSON.stringify(response.data, null, 2).substring(0, 500);
      console.log(`Response Data: ${responseDataStr}...`);
      
      // FIXED: Check for Zuper's specific ID formats
      // Customer creation response has customer_uid at the top level
      if (response.data && response.data.customer_uid) {
        console.log('Found customer_uid in response:', response.data.customer_uid);
        return {
          ...response.data,
          id: response.data.customer_uid // Ensure we have a consistent id field
        };
      }
      
      // Property creation response has property_uid inside a data object
      if (response.data && response.data.data && response.data.data.property_uid) {
        console.log('Found property_uid in response:', response.data.data.property_uid);
        return {
          ...response.data,
          id: response.data.data.property_uid // Ensure we have a consistent id field
        };
      }
      
      // If it's a success message but without the expected ID fields
      if (response.data && response.data.message && 
          response.data.message.toLowerCase().includes('success')) {
        console.log('Success message but could not find specific ID fields');
        // Try to extract ID from the message if possible
        const idMatch = response.data.message.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (idMatch && idMatch[1]) {
          console.log('Extracted ID from success message:', idMatch[1]);
          return {
            ...response.data,
            id: idMatch[1]
          };
        }
        
        // If we still can't find an ID, use a temp ID as last resort
        console.warn('Could not extract ID from success message. Using temporary ID.');
        return {
          ...response.data,
          id: `temp-${Date.now()}`
        };
      }
      
      // If we get here, just return the raw response
      return response.data;
    } catch (error) {
      console.error(`\n===== ZUPER API ERROR =====`);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Check if the response is HTML (login page redirect)
        const contentType = error.response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          console.error('Received HTML error response - likely an authentication issue');
          return {
            error: true,
            status: error.response.status,
            message: 'Authentication failed - check API key and region settings',
            details: 'Received HTML instead of JSON - usually means API key is invalid or expired'
          };
        }
        
        throw {
          status: error.response.status,
          message: error.response.statusText,
          details: error.response.data
        };
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from Zuper API');
        
        throw {
          status: 504,
          message: 'Gateway Timeout',
          details: 'No response received from Zuper API'
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        
        throw {
          status: 500,
          message: 'Request Configuration Error',
          details: error.message
        };
      }
    }
  }
  
  /**
   * Helper method to create a customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(customerData) {
    try {
      // Format customer data according to Zuper API requirements
      const formattedData = {
        customer: {
          customer_first_name: customerData.customer?.customer_first_name || customerData.customer_first_name || '',
          customer_last_name: customerData.customer?.customer_last_name || customerData.customer_last_name || '',
          customer_email: customerData.customer?.customer_email || customerData.customer_email || '',
          customer_phone: customerData.customer?.customer_phone || customerData.customer_phone || '',
          customer_company_name: customerData.customer?.customer_company_name || customerData.customer_company_name || '',
          customer_address: customerData.customer?.customer_address || customerData.customer_address,
          customer_billing_address: customerData.customer?.customer_billing_address || customerData.customer_billing_address,
          is_portal_enabled: false
        }
      };
      
      // Make the API request
      const response = await this.processRequest({
        endpoint: 'customers_new',
        method: 'POST',
        data: formattedData
      });
      
      // Process the response
      console.log('Customer creation response:', JSON.stringify(response, null, 2));
      
      // If we have customer_uid, use it
      if (response.customer_uid) {
        return {
          id: response.customer_uid,
          message: response.message || 'Customer created successfully'
        };
      }
      
      // If we have id field (from our processRequest modifications)
      if (response.id) {
        return {
          id: response.id,
          message: response.message || 'Customer created successfully'
        };
      }
      
      // For any other success case
      if (response.message && response.message.toLowerCase().includes('success')) {
        return {
          id: response.id || `unknown-${Date.now()}`,
          message: response.message
        };
      }
      
      // If we get here, something unexpected happened
      console.error('Unexpected customer creation response:', response);
      throw new Error('Failed to extract customer ID from response');
    } catch (error) {
      console.error('Error in createCustomer:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to create a property
   * @param {string} customerId - Customer ID
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - Created property
   */
  async createProperty(customerId, propertyData) {
    try {
      // Format property data according to Zuper API requirements
      const formattedData = {
        property: {
          property_name: propertyData.property?.property_name || propertyData.property_name || 'Primary Property',
          property_type: propertyData.property?.property_type || propertyData.property_type || 'residential',
          // FIXED: Use the correct format for customer connection
          property_customers: [
            {
              customer: customerId
            }
          ],
          property_address: propertyData.property?.address || propertyData.address,
          custom_fields: propertyData.property?.custom_fields || propertyData.custom_fields || []
        }
      };
      
      // Make the API request
      const response = await this.processRequest({
        endpoint: 'properties',
        method: 'POST',
        data: formattedData
      });
      
      // Process the response
      console.log('Property creation response:', JSON.stringify(response, null, 2));
      
      // If we have data.property_uid, use it
      if (response.data && response.data.property_uid) {
        return {
          id: response.data.property_uid,
          message: response.message || 'Property created successfully'
        };
      }
      
      // If we have id field (from our processRequest modifications)
      if (response.id) {
        return {
          id: response.id,
          message: response.message || 'Property created successfully'
        };
      }
      
      // For any other success case
      if (response.message && response.message.toLowerCase().includes('success')) {
        return {
          id: response.id || `unknown-${Date.now()}`,
          message: response.message
        };
      }
      
      // If we get here, something unexpected happened
      console.error('Unexpected property creation response:', response);
      throw new Error('Failed to extract property ID from response');
    } catch (error) {
      console.error('Error in createProperty:', error);
      throw error;
    }
  }
}

module.exports = new ZuperHandler();
