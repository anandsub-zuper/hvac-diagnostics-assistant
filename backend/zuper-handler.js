// backend/zuper-handler.js - Add this new file to your backend

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
    
    // Determine the base URL based on region
    this.baseUrl = `https://${this.region}-west-1c.zuperpro.com/api`;
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
      timeout: 30000
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
      console.log(`Data: ${JSON.stringify(response.data, null, 2).substring(0, 500)}...`);
      
      return response.data;
    } catch (error) {
      console.error(`\n===== ZUPER API ERROR =====`);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
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
   * Helper method to search for customers
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} - Search results
   */
  async searchCustomers(params) {
    return this.processRequest({
      endpoint: 'customers',
      method: 'GET',
      params
    });
  }
  
  /**
   * Helper method to create a customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(customerData) {
    return this.processRequest({
      endpoint: 'customers_new',
      method: 'POST',
      data: customerData
    });
  }
  
  /**
   * Helper method to create a property
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} - Created property
   */
  async createProperty(propertyData) {
    return this.processRequest({
      endpoint: 'properties',
      method: 'POST',
      data: propertyData
    });
  }
  
  /**
   * Helper method to create an asset
   * @param {Object} assetData - Asset data
   * @returns {Promise<Object>} - Created asset
   */
  async createAsset(assetData) {
    return this.processRequest({
      endpoint: 'assets',
      method: 'POST',
      data: assetData
    });
  }
  
  /**
   * Helper method to create a job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} - Created job
   */
  async createJob(jobData) {
    return this.processRequest({
      endpoint: 'jobs',
      method: 'POST',
      data: jobData
    });
  }
  
  /**
   * Helper method to get job categories
   * @returns {Promise<Object>} - Job categories
   */
  async getJobCategories() {
    return this.processRequest({
      endpoint: 'job-categories',
      method: 'GET'
    });
  }
}

module.exports = new ZuperHandler();
