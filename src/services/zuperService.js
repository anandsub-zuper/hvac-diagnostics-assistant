// src/services/zuperService.js - FIXED VERSION

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
      console.log(`Making proxied request to ${endpoint} with method ${method}`);
      console.log('Request params:', params);
      console.log('Request data:', JSON.stringify(data, null, 2));
      
      const response = await axios.post(`${this.proxyUrl}/api/zuper`, {
        endpoint,
        method,
        params,
        data
      }, {
        timeout: 45000 // Extended timeout for Zuper API calls
      });
      
      // Check for error property in response
      if (response.data && response.data.error) {
        console.error('Error from Zuper API:', response.data);
        throw new Error(response.data.message || 'Error from Zuper API');
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error making proxied request to ${endpoint}:`, error);
      
      // Format error message to be user-friendly
      if (error.response && error.response.data) {
        console.error('Error response data:', error.response.data);
        throw new Error(error.response.data.message || 'Error communicating with Zuper API');
      }
      
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
      console.log(`Searching for customer with email: ${email} or phone: ${phone}`);
      
      // Start with email search if available
      if (email) {
        try {
          // FIXED: Use the correct endpoint and query parameter format
          const emailResponse = await this.makeProxiedRequest(
            'customers', 
            'GET', 
            { 'filter.customer_email': email }
          );
          
          console.log('Email search response:', emailResponse);
          
          // Check if we found matching customers
          if (emailResponse && 
              emailResponse.data && 
              Array.isArray(emailResponse.data) && 
              emailResponse.data.length > 0) {
            
            // Find exact match by email
            const matchingCustomer = emailResponse.data.find(
              customer => customer.customer_email && 
                          customer.customer_email.toLowerCase() === email.toLowerCase()
            );
            
            if (matchingCustomer) {
              console.log('Found customer by email:', matchingCustomer.id);
              return matchingCustomer;
            }
          }
          
          console.log('No customer found with matching email');
        } catch (emailError) {
          console.error('Error searching by email:', emailError);
        }
      }

      // Try to find by phone if email search failed or no email provided
      if (phone) {
        try {
          // FIXED: Use the correct endpoint and query parameter format
          const phoneResponse = await this.makeProxiedRequest(
            'customers', 
            'GET',
            { 'filter.customer_phone': phone }
          );
          
          console.log('Phone search response:', phoneResponse);
          
          // Check if we found matching customers
          if (phoneResponse && 
              phoneResponse.data && 
              Array.isArray(phoneResponse.data) && 
              phoneResponse.data.length > 0) {
            
            // Find customer with matching phone
            const matchingCustomer = phoneResponse.data.find(
              customer => {
                // Check all possible phone number fields
                const customerPhone = customer.customer_phone || 
                                    (customer.customer_contact_no && customer.customer_contact_no.mobile) ||
                                    (customer.customer_contact_no && customer.customer_contact_no.work) ||
                                    (customer.customer_contact_no && customer.customer_contact_no.home);
                
                if (!customerPhone) return false;
                
                // Strip non-numeric characters for comparison
                const normalizedCustomerPhone = customerPhone.replace(/[^0-9]/g, '');
                const normalizedSearchPhone = phone.replace(/[^0-9]/g, '');
                
                return normalizedCustomerPhone.includes(normalizedSearchPhone) ||
                      normalizedSearchPhone.includes(normalizedCustomerPhone);
              }
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
      
      // FIXED: Format the customer data according to Zuper API requirements
      // Now matches the curl example you provided
      const formattedCustomerData = {
        customer: {
          customer_first_name: customerData.firstName,
          customer_last_name: customerData.lastName,
          customer_email: customerData.email,
          // FIXED: Change phone field format to match API expectations
          customer_contact_no: {
            mobile: customerData.phone || '',
            home: '',
            work: ''
          },
          customer_company_name: customerData.companyName || '',
          customer_notes: customerData.notes || '',
          customer_type: customerData.customerType || 'residential',
          // Format address properly if available
          customer_address: customerData.address ? {
            street: customerData.address.streetAddress,
            city: customerData.address.city,
            state: customerData.address.state,
            country: customerData.address.country || 'USA',
            zip_code: customerData.address.zipCode,
            first_name: customerData.firstName,
            last_name: customerData.lastName,
            phone_number: customerData.phone,
            email: customerData.email,
            // Add geo coordinates if available
            geo_cordinates: customerData.address.latitude && customerData.address.longitude ? 
              [customerData.address.latitude, customerData.address.longitude] : 
              undefined
          } : undefined,
          // Copy the same address to billing address
          customer_billing_address: customerData.address ? {
            street: customerData.address.streetAddress,
            city: customerData.address.city,
            state: customerData.address.state,
            country: customerData.address.country || 'USA',
            zip_code: customerData.address.zipCode,
            first_name: customerData.firstName,
            last_name: customerData.lastName,
            phone_number: customerData.phone,
            email: customerData.email,
            // Add geo coordinates if available
            geo_cordinates: customerData.address.latitude && customerData.address.longitude ? 
              [customerData.address.latitude, customerData.address.longitude] : 
              undefined
          } : undefined,
          is_portal_enabled: false,
          // ADDED: Include accounts section from example
          accounts: {
            ltv: 0,
            receivables: 0,
            credits: 0
          },
          // ADDED: Include tax info
          tax: {
            tax_exempt: false
          }
        }
      };

      console.log('Creating new customer with data:', JSON.stringify(formattedCustomerData, null, 2));

      // FIXED: Use the correct endpoint for customer creation
      const response = await this.makeProxiedRequest('customers_new', 'POST', null, formattedCustomerData);
      
      // IMPROVED: Better validation of successful customer creation
      if (!response) {
        throw new Error('Empty response from customer creation');
      }
      
      // FIXED: Only treat as error if we have an actual error or a failure message
      if (response.error || (response.message && !response.message.toLowerCase().includes('success'))) {
        throw new Error(`Customer creation failed: ${response.message || JSON.stringify(response.error)}`);
      }
      
      // Check specifically for success message and log it
      if (response.message && response.message.toLowerCase().includes('success')) {
        console.log('Success message from Zuper API:', response.message);
      }
      
      if (!response.id && !response.customer_id) {
        console.error('Customer creation response missing ID:', response);
        throw new Error('Customer creation failed: No ID returned');
      }
      
      // Extract customer ID from response
      const customerId = response.id || response.customer_id;
      console.log('Customer created successfully with ID:', customerId);
      
      // Return a standardized customer object
      return {
        id: customerId,
        customer_first_name: customerData.firstName,
        customer_last_name: customerData.lastName,
        customer_email: customerData.email,
        customer_phone: customerData.phone
      };
    } catch (error) {
      console.error('Error creating customer in Zuper:', error);
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
      // FIXED: Format the asset data according to Zuper API requirements
      const formattedAssetData = {
        asset: {
          asset_name: assetData.name,
          asset_type: assetData.type || 'HVAC',
          model: assetData.model || '',
          manufacturer: assetData.manufacturer || '',
          serial_number: assetData.serialNumber || '',
          status: assetData.status || 'active',
          customer_id: assetData.customerId,
          property_id: assetData.propertyId,
          // Format dates properly
          installation_date: assetData.installationDate ? new Date(assetData.installationDate).toISOString() : undefined,
          warranty_expiry_date: assetData.warrantyExpiryDate ? new Date(assetData.warrantyExpiryDate).toISOString() : undefined,
          notes: assetData.notes || '',
          // FIXED: Ensure custom fields are always strings
          custom_fields: [
            {
              label: "System Type",
              value: String(assetData.systemType || '')
            },
            {
              label: "Tonnage",
              value: String(assetData.tonnage || '')
            },
            {
              label: "Efficiency Rating",
              value: String(assetData.efficiencyRating || '')
            }
          ]
        }
      };

      console.log('Creating asset with data:', JSON.stringify(formattedAssetData, null, 2));

      // FIXED: Use the correct endpoint for asset creation
      const response = await this.makeProxiedRequest('assets', 'POST', null, formattedAssetData);
      
      if (!response) {
        throw new Error('Empty response from asset creation');
      }
      
      // FIXED: Only treat as error if we have an actual error or a failure message
      if (response.error || (response.message && !response.message.toLowerCase().includes('success'))) {
        throw new Error(`Asset creation failed: ${response.message || JSON.stringify(response.error)}`);
      }
      
      // Check specifically for success message and log it
      if (response.message && response.message.toLowerCase().includes('success')) {
        console.log('Success message from Zuper API:', response.message);
      }
      
      // Extract asset ID
      const assetId = response.id || response.asset_id;
      if (!assetId) {
        console.error('Asset creation response missing ID:', response);
        
        // If success message but no ID, use a temporary ID
        if (response.message && response.message.toLowerCase().includes('success')) {
          return {
            id: `temp-asset-${Date.now()}`,
            name: assetData.name,
            manufacturer: assetData.manufacturer,
            model: assetData.model,
            serialNumber: assetData.serialNumber,
            success: true
          };
        }
        
        throw new Error('Asset creation failed: No ID returned');
      }
      
      console.log('Asset created successfully with ID:', assetId);
      
      return {
        id: assetId,
        name: assetData.name,
        manufacturer: assetData.manufacturer,
        model: assetData.model,
        serialNumber: assetData.serialNumber
      };
    } catch (error) {
      console.error('Error creating asset in Zuper:', error);
      
      // Check if this was actually a success despite the error
      if (error.message && error.message.toLowerCase().includes('success')) {
        return {
          id: `temp-asset-${Date.now()}`,
          name: assetData.name,
          manufacturer: assetData.manufacturer,
          model: assetData.model,
          serialNumber: assetData.serialNumber,
          success: true
        };
      }
      
      throw error;
    }
  }

  /**
   * Get job categories from Zuper
   * @returns {Promise<Array>} List of job categories
   */
  async getJobCategories() {
    try {
      // FIXED: Use the correct endpoint for job categories
      const response = await this.makeProxiedRequest('job-categories', 'GET');
      
      // Check for error response
      if (response && response.error) {
        console.error('Error fetching job categories:', response.error);
        return [];
      }
      
      // Extract categories array
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
      
      // Format for custom fields - ensure all values are strings
      const requiredParts = diagnosticResult.requiredItems && diagnosticResult.requiredItems.length > 0
        ? diagnosticResult.requiredItems.join(', ')
        : '';
        
      const diagnosticSummary = diagnosticResult.possibleIssues && diagnosticResult.possibleIssues.length > 0
        ? diagnosticResult.possibleIssues.map(issue => `${issue.issue} (${issue.severity})`).join('; ')
        : '';
      
      // Format the job data according to Zuper API
      const formattedJobData = {
        job: {
          customer_id: jobData.customerId,
          property_id: jobData.propertyId,
          job_title: jobData.title || 'HVAC Service',
          job_description: jobData.description || '',
          job_category: jobData.jobCategory,
          priority: jobData.priority || 'medium',
          status: jobData.status || 'new',
          due_date: jobData.dueDate ? new Date(jobData.dueDate).toISOString() : undefined,
          assets: jobData.assetIds || [],
          custom_fields: [
            {
              label: "Diagnostic Result",
              value: String(diagnosticSummary)
            },
            {
              label: "Required Parts",
              value: String(requiredParts)
            },
            {
              label: "Repair Complexity",
              value: String(diagnosticResult.repairComplexity || '')
            },
            {
              label: "Additional Notes",
              value: String(diagnosticResult.additionalNotes || '')
            }
          ]
        }
      };

      console.log('Creating job with data:', JSON.stringify(formattedJobData, null, 2));

      const response = await this.makeProxiedRequest('jobs', 'POST', null, formattedJobData);
      
      if (!response) {
        throw new Error('Empty response from job creation');
      }
      
      // FIXED: Only treat as error if not a success message
      if (response.error || (response.message && !response.message.toLowerCase().includes('success'))) {
        throw new Error(`Job creation failed: ${response.message || JSON.stringify(response.error)}`);
      }
      
      // Check specifically for success message and log it
      if (response.message && response.message.toLowerCase().includes('success')) {
        console.log('Success message from Zuper API:', response.message);
      }
      
      // Extract job ID
      const jobId = response.id || response.job_id;
      if (!jobId) {
        console.error('Job creation response missing ID:', response);
        
        // If success message but no ID, use a temporary ID
        if (response.message && response.message.toLowerCase().includes('success')) {
          return {
            id: `temp-job-${Date.now()}`,
            title: jobData.title,
            priority: jobData.priority,
            status: jobData.status,
            success: true
          };
        }
        
        throw new Error('Job creation failed: No ID returned');
      }
      
      console.log('Job created successfully with ID:', jobId);
      
      return {
        id: jobId,
        title: jobData.title,
        priority: jobData.priority,
        status: jobData.status
      };
    } catch (error) {
      console.error('Error creating job in Zuper:', error);
      
      // Check if this was actually a success despite the error
      if (error.message && error.message.toLowerCase().includes('success')) {
        return {
          id: `temp-job-${Date.now()}`,
          title: jobData.title,
          priority: jobData.priority,
          status: jobData.status,
          success: true
        };
      }
      
      throw error;
    }
  }
}

export default new ZuperService();
