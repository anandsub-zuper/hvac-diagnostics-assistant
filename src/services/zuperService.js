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
   * Create a property for a customer in Zuper
   * @param {string} customerId - Zuper customer ID
   * @param {Object} propertyData - Property data to create
   * @returns {Promise<Object>} Created property data
   */
  async createProperty(customerId, propertyData) {
    try {
      // FIXED: Format the property data according to Zuper API requirements
      // Now matches the curl example
      const formattedPropertyData = {
        property: {
          property_name: propertyData.propertyName || 'Primary Property',
          property_type: propertyData.propertyType || 'residential',
          // FIXED: Use correct property_customer format
          property_customer: [
            {
              customer: customerId
            }
          ],
          address: {
            street: propertyData.address.streetAddress,
            city: propertyData.address.city,
            state: propertyData.address.state,
            country: propertyData.address.country || 'USA',
            zip_code: propertyData.address.zipCode,
            first_name: propertyData.ownerInfo?.name?.split(' ')[0] || '',
            last_name: propertyData.ownerInfo?.name?.split(' ').slice(1).join(' ') || '',
            phone_number: propertyData.ownerInfo?.phone || '',
            email: propertyData.ownerInfo?.email || '',
            // Add coordinates if available
            geo_cordinates: propertyData.address.latitude && propertyData.address.longitude ? 
              [propertyData.address.latitude, propertyData.address.longitude] : 
              undefined
          },
          // FIXED: Format custom fields as per API requirements
          // Now includes property features from Rentcast
          custom_fields: [
            // Property attributes
            {
              label: "Year Built",
              value: propertyData.attributes?.yearBuilt || ''
            },
            {
              label: "Square Feet",
              value: propertyData.attributes?.squareFeet || ''
            },
            {
              label: "Bedrooms",
              value: propertyData.attributes?.bedrooms || ''
            },
            {
              label: "Bathrooms",
              value: propertyData.attributes?.bathrooms || ''
            },
            {
              label: "Lot Size",
              value: propertyData.attributes?.lotSize || ''
            },
            
            // Property features from Rentcast
            {
              label: "Swimming Pool",
              value: propertyData.features?.hasPool ? 'Yes' : 'No'
            },
            {
              label: "Garage",
              value: propertyData.features?.hasGarage ? 'Yes' : 'No'
            },
            {
              label: "Central Air",
              value: propertyData.features?.hasCentralAir ? 'Yes' : 'No'
            },
            {
              label: "Basement",
              value: propertyData.features?.hasBasement ? 'Yes' : 'No'
            },
            {
              label: "Fireplace",
              value: propertyData.features?.hasFireplace ? 'Yes' : 'No'
            },
            {
              label: "Number of Floors",
              value: propertyData.features?.floorCount?.toString() || '1'
            },
            {
              label: "Garage Type",
              value: propertyData.features?.garageType || ''
            },
            {
              label: "Heating System",
              value: propertyData.features?.hasHeating ? 'Yes' : 'No'
            },
            {
              label: "Heating Type",
              value: propertyData.features?.heatingType || ''
            },
            {
              label: "Unit Count",
              value: propertyData.features?.unitCount?.toString() || '1'
            }
          ]
        }
      };

      console.log('Creating property with data:', JSON.stringify(formattedPropertyData, null, 2));

      // FIXED: Use property endpoint instead of properties
      const response = await this.makeProxiedRequest('property', 'POST', null, formattedPropertyData);
      
      // IMPROVED: Better validation of successful property creation
      if (!response) {
        throw new Error('Empty response from property creation');
      }
      
      // FIXED: Only treat as error if we have an actual error or a failure message
      if (response.error || (response.message && !response.message.toLowerCase().includes('success'))) {
        throw new Error(`Property creation failed: ${response.message || JSON.stringify(response.error)}`);
      }
      
      // Check specifically for success message and log it
      if (response.message && response.message.toLowerCase().includes('success')) {
        console.log('Success message from Zuper API:', response.message);
      }
      
      // Extract property ID
      const propertyId = response.id || response.property_id;
      if (!propertyId) {
        console.error('Property creation response missing ID:', response);
        throw new Error('Property creation failed: No ID returned');
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
}

export default new ZuperService();
