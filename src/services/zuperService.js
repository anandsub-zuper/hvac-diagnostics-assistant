// Updated zuperService.js with improved response handling

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
      
      console.log('Zuper API response received:', JSON.stringify(response.data, null, 2));
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
          // Use the correct endpoint and query parameter format
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
          // Use the correct endpoint and query parameter format
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
      // Check for existing customer
      let existingCustomer = null;
      if (customerData.email || customerData.phone) {
        existingCustomer = await this.searchCustomer(customerData.email, customerData.phone);
      }
      
      // If customer already exists, return that customer
      if (existingCustomer) {
        console.log('Using existing customer:', existingCustomer.id);
        return existingCustomer;
      }
      
      // Format customer data for Zuper API
      const formattedCustomerData = {
        customer: {
          customer_first_name: customerData.firstName,
          customer_last_name: customerData.lastName,
          customer_email: customerData.email || '',
          customer_phone: customerData.phone || '',
          customer_company_name: customerData.companyName || '',
          customer_notes: customerData.notes || '',
          customer_type: customerData.customerType || 'residential',
          
          // Format address if available
          customer_address: customerData.address ? {
            street: customerData.address.streetAddress,
            city: customerData.address.city,
            state: customerData.address.state,
            country: customerData.address.country || 'USA',
            zip_code: customerData.address.zipCode
          } : undefined,
          
          // Add billing address (same as property address)
          customer_billing_address: customerData.address ? {
            street: customerData.address.streetAddress,
            city: customerData.address.city,
            state: customerData.address.state,
            country: customerData.address.country || 'USA',
            zip_code: customerData.address.zipCode
          } : undefined,
          
          is_portal_enabled: false
        }
      };

      console.log('Creating customer with data:', JSON.stringify(formattedCustomerData, null, 2));

      // Make API request through our backend proxy
      const response = await this.makeProxiedRequest('customers', 'POST', null, formattedCustomerData);
      
      console.log('Customer creation response:', response);
      
      // IMPROVED: Extract the correct ID from the response
      // The backend should now return the actual customer_uid as the id field
      const customerId = response.id || response.customer_uid;
      
      if (!customerId) {
        console.error('No customer ID found in response:', response);
        throw new Error('Failed to create customer: No ID returned');
      }
      
      console.log('Customer created successfully with ID:', customerId);
      
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
   * Create a property in Zuper
   * @param {string} customerId - Customer ID
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} Created property data
   */
  async createProperty(customerId, propertyData) {
    try {
      // Create property name based on address
      const propertyName = propertyData.address ? 
        `${propertyData.address.streetAddress}, ${propertyData.address.city}` : 
        'Primary Property';
      
      // Format property data for Zuper API
      const formattedPropertyData = {
        property: {
          property_name: propertyName,
          property_type: propertyData.propertyType || 'residential',
          
          // Link to customer with the correct format
          property_customers: [{
            customer: customerId
          }],
          
          // Format address
          property_address: {
            street: propertyData.address.streetAddress || '',
            city: propertyData.address.city || '',
            state: propertyData.address.state || '',
            country: propertyData.address.country || 'USA',
            zip_code: propertyData.address.zipCode || '',
            geo_coordinates: propertyData.address.latitude && propertyData.address.longitude ? 
              [propertyData.address.latitude, propertyData.address.longitude] : 
              undefined
          },
          
          // Add custom fields for property attributes
          custom_fields: [
            {
              label: "Year Built",
              value: String(propertyData.attributes?.yearBuilt || '')
            },
            {
              label: "Square Feet",
              value: String(propertyData.attributes?.squareFeet || '')
            },
            {
              label: "Bedrooms",
              value: String(propertyData.attributes?.bedrooms || '')
            },
            {
              label: "Bathrooms",
              value: String(propertyData.attributes?.bathrooms || '')
            },
            {
              label: "Central Air",
              value: propertyData.features?.hasCentralAir ? 'Yes' : 'No'
            }
          ]
        }
      };

      console.log('Creating property with data:', JSON.stringify(formattedPropertyData, null, 2));

      // Make API request through our backend proxy
      const response = await this.makeProxiedRequest('property', 'POST', null, formattedPropertyData);
      
      console.log('Property creation response:', response);
      
      // IMPROVED: Extract the correct ID from the response
      // The backend should now return the actual property_uid as the id field
      const propertyId = response.id;
      
      if (!propertyId) {
        console.error('No property ID found in response:', response);
        throw new Error('Failed to create property: No ID returned');
      }
      
      console.log('Property created successfully with ID:', propertyId);
      
      return {
        id: propertyId,
        property_name: formattedPropertyData.property.property_name,
        property_type: formattedPropertyData.property.property_type,
        customer_id: customerId
      };
    } catch (error) {
      console.error('Error creating property in Zuper:', error);
      throw error;
    }
  }

  /**
   * Create an asset (equipment) in Zuper
   * @param {Object} assetData - Asset data
   * @returns {Promise<Object>} Created asset data
   */
  async createAsset(assetData) {
    try {
      // Format asset data according to Zuper API
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
          
          // Format dates
          installation_date: assetData.installationDate ? new Date(assetData.installationDate).toISOString() : undefined,
          warranty_expiry_date: assetData.warrantyExpiryDate ? new Date(assetData.warrantyExpiryDate).toISOString() : undefined,
          
          notes: assetData.notes || '',
          
          // Format custom fields
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

      // Make API request through our backend proxy
      const response = await this.makeProxiedRequest('assets', 'POST', null, formattedAssetData);
      
      console.log('Asset creation response:', response);
      
      // Extract asset ID
      const assetId = response.id || response.asset_id;
      
      if (!assetId) {
        console.error('No asset ID found in response:', response);
        throw new Error('Failed to create asset: No ID returned');
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
      throw error;
    }
  }

  /**
   * Get job categories from Zuper
   * @returns {Promise<Array>} List of job categories
   */
  async getJobCategories() {
    try {
      // Use the correct endpoint for job categories
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
      
      console.log('Job creation response:', response);
      
      // Extract job ID
      const jobId = response.id || response.job_id;
      
      if (!jobId) {
        console.error('No job ID found in response:', response);
        throw new Error('Failed to create job: No ID returned');
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
      throw error;
    }
  }
}

export default new ZuperService();
