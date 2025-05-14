// backend/zuper-handler.js - FIXED VERSION
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
    
    // Format the base URL with dc-region format
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
      // Prevent redirects to HTML pages
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
      
      // Process IDs for different endpoints
      
      // 1. Jobs/Category endpoint - just return response as is
      if (endpoint === 'jobs/category' || endpoint.startsWith('jobs/category')) {
        console.log('Returning job categories response');
        return response.data;
      }
      
      // 2. Jobs endpoint for creation - extract job_uid
      if ((endpoint === 'jobs' || endpoint.startsWith('jobs')) && method === 'POST') {
        console.log('Processing job creation response');
        if (response.data && response.data.job_uid) {
          console.log('Found job_uid in response:', response.data.job_uid);
          return {
            ...response.data,
            id: response.data.job_uid // Ensure we have a consistent id field
          };
        }
      }
      
      // 3. Customer creation response has customer_uid at the top level
      if (response.data && response.data.customer_uid) {
        console.log('Found customer_uid in response:', response.data.customer_uid);
        return {
          ...response.data,
          id: response.data.customer_uid // Ensure we have a consistent id field
        };
      }
      
      // 4. Property creation response has property_uid inside a data object
      if (response.data && response.data.data && response.data.data.property_uid) {
        console.log('Found property_uid in response:', response.data.data.property_uid);
        return {
          ...response.data,
          id: response.data.data.property_uid // Ensure we have a consistent id field
        };
      }
      
      // 5. Asset creation - check various paths for ID
      if (endpoint === 'assets' || endpoint.startsWith('assets')) {
        // First check data.asset_uid
        if (response.data && response.data.data && response.data.data.asset_uid) {
          console.log('Found asset_uid in response.data.data:', response.data.data.asset_uid);
          return {
            ...response.data,
            id: response.data.data.asset_uid
          };
        }
        
        // Then check for asset_id
        if (response.data && response.data.asset_id) {
          console.log('Found asset_id in response:', response.data.asset_id);
          return {
            ...response.data,
            id: response.data.asset_id
          };
        }
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
   * Helper method for job creation
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} - Created job response
   */
// In backend/zuper-handler.js - Update the createJob method

async createJob(jobData) {
  try {
    // Check for required fields
    if (!jobData.job || !jobData.job.customer_id || !jobData.job.property_id) {
      throw new Error('Missing required job fields: customer_id and property_id are required');
    }
    
    // Map title to job_title if needed
    if (!jobData.job.job_title && jobData.job.title) {
      jobData.job.job_title = jobData.job.title;
      delete jobData.job.title; // Remove the incorrect field
    }
    
    // Format assets correctly - should be an array of objects with 'asset' property
    if (jobData.job.assets && Array.isArray(jobData.job.assets)) {
      // Make sure each asset is in the { asset: "id" } format
      jobData.job.assets = jobData.job.assets.map(asset => {
        if (typeof asset === 'string') {
          return { asset: asset };
        } else if (typeof asset === 'object' && asset.asset) {
          return asset;
        } else if (typeof asset === 'object' && asset.id) {
          return { asset: asset.id };
        }
        return asset;
      });
    }
    
    // Ensure due_date is properly formatted
    if (jobData.job.due_date) {
      // Check if it's not already in ISO format
      if (!jobData.job.due_date.includes('T')) {
        // Convert YYYY-MM-DD to ISO format
        const date = new Date(jobData.job.due_date);
        jobData.job.due_date = date.toISOString().split('T')[0] + ' 00:00:00';
      }
    }
    
    // Make the API request
    console.log('Creating job with formatted data:', JSON.stringify(jobData, null, 2));
    
    const response = await this.processRequest({
      endpoint: 'jobs',
      method: 'POST',
      data: jobData
    });
    
    console.log('Job creation response:', response);
    
    // Extract job ID - could be in different places depending on API response
    let jobId = null;
    
    if (response.job_uid) {
      jobId = response.job_uid;
    } else if (response.id) {
      jobId = response.id;
    } else if (response.data && response.data.job_uid) {
      jobId = response.data.job_uid;
    } else if (response.message && typeof response.message === 'string') {
      // Try to extract UUID from success message
      const uuidMatch = response.message.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (uuidMatch) {
        jobId = uuidMatch[1];
      }
    }
    
    if (!jobId) {
      console.error('Could not find job ID in response:', response);
      throw new Error('Failed to extract job ID from response');
    }
    
    console.log('Successfully created job with ID:', jobId);
    
    return {
      id: jobId,
      message: response.message || 'Job created successfully'
    };
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}
  
  /**
   * Helper method to get job categories
   * @returns {Promise<Array>} - Job categories
   */
  async getJobCategories() {
    try {
      // Make the API request to get job categories
      const response = await this.processRequest({
        endpoint: 'jobs/category',
        method: 'GET'
      });
      
      console.log('Job categories response:', response);
      
      // Parse the response according to the expected structure
      if (response && response.type === "success" && Array.isArray(response.data)) {
        // Map to a simpler format
        return response.data.map(category => ({
          id: category.category_uid,
          name: category.category_name,
          description: category.category_description || ''
        }));
      }
      
      // If we don't have a proper data structure, return an empty array
      console.warn('Job categories response did not contain expected data structure:', response);
      return [];
    } catch (error) {
      console.error('Error fetching job categories:', error);
      throw error;
    }
  }
}

module.exports = new ZuperHandler();
