// src/utils/zuperUtils.js

/**
 * Format customer data for Zuper API
 * @param {Object} customerData - Customer data from form
 * @returns {Object} Formatted customer data for Zuper API
 */
export const formatCustomerForZuper = (customerData) => {
  return {
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
};

/**
 * Format property data for Zuper API
 * @param {string} customerId - Zuper customer ID
 * @param {Object} propertyData - Property data from form
 * @returns {Object} Formatted property data for Zuper API
 */
export const formatPropertyForZuper = (customerId, propertyData) => {
  return {
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
    custom_fields: {
      year_built: propertyData.attributes?.yearBuilt || '',
      square_feet: propertyData.attributes?.squareFeet || '',
      bedrooms: propertyData.attributes?.bedrooms || '',
      bathrooms: propertyData.attributes?.bathrooms || '',
      lot_size: propertyData.attributes?.lotSize || '',
      has_pool: propertyData.features?.hasPool ? 'Yes' : 'No',
      has_garage: propertyData.features?.hasGarage ? 'Yes' : 'No',
      has_central_air: propertyData.features?.hasCentralAir ? 'Yes' : 'No',
      has_basement: propertyData.features?.hasBasement ? 'Yes' : 'No'
    }
  };
};

/**
 * Format asset data for Zuper API
 * @param {Object} assetData - Asset data from form
 * @param {string} customerId - Zuper customer ID
 * @param {string} propertyId - Zuper property ID
 * @returns {Object} Formatted asset data for Zuper API
 */
export const formatAssetForZuper = (assetData, customerId, propertyId) => {
  return {
    asset_name: assetData.name,
    asset_type: assetData.type || 'HVAC',
    model: assetData.model || '',
    manufacturer: assetData.manufacturer || '',
    serial_number: assetData.serialNumber || '',
    status: assetData.status || 'active',
    customer_id: customerId,
    property_id: propertyId,
    installation_date: assetData.installationDate || '',
    warranty_expiry_date: assetData.warrantyExpiryDate || '',
    notes: assetData.notes || '',
    custom_fields: {
      system_type: assetData.systemType || '',
      tonnage: assetData.tonnage || '',
      efficiency_rating: assetData.efficiencyRating || ''
    }
  };
};

/**
 * Format job data for Zuper API
 * @param {Object} jobData - Job data from form
 * @param {string} customerId - Zuper customer ID
 * @param {string} propertyId - Zuper property ID
 * @param {Array} assetIds - Array of Zuper asset IDs
 * @param {Object} diagnosticResult - Diagnostic result data
 * @returns {Object} Formatted job data for Zuper API
 */
export const formatJobForZuper = (jobData, customerId, propertyId, assetIds, diagnosticResult) => {
  // Extract required parts from diagnostic result
  const requiredParts = diagnosticResult && diagnosticResult.requiredItems && diagnosticResult.requiredItems.length > 0
    ? diagnosticResult.requiredItems.join(', ')
    : '';
    
  // Format the diagnostic summary for custom fields
  const diagnosticSummary = diagnosticResult && diagnosticResult.possibleIssues && diagnosticResult.possibleIssues.length > 0
    ? diagnosticResult.possibleIssues.map(issue => `${issue.issue} (${issue.severity})`).join('; ')
    : '';
  
  return {
    customer_uid: customerId,
    property: propertyId,
    assets: assetIds || [],
    job_title: jobData.title || 'HVAC Service',
    job_description: jobData.job_description || '',
    job_type: jobData.jobType || 'service',
    priority: jobData.priority || 'medium',
    status: jobData.status || 'new',
    scheduled_start_time: jobData.scheduledStartTime || null,
    scheduled_end_time: jobData.scheduledEndTime || null,
    custom_fields: {
      diagnostic_result: diagnosticSummary,
      required_parts: requiredParts,
      repair_complexity: diagnosticResult ? diagnosticResult.repairComplexity || '' : '',
      additional_notes: diagnosticResult ? diagnosticResult.additionalNotes || '' : ''
    }
  };
};

/**
 * Generate customer name from owner or tenant info
 * @param {Object} propertyData - Property data containing owner and tenant info
 * @returns {Object} Object with firstName and lastName properties
 */
export const generateCustomerName = (propertyData) => {
  // Determine whether to use owner or tenant info as primary contact
  const contactInfo = propertyData.tenantInfo && propertyData.tenantInfo.name 
    ? propertyData.tenantInfo 
    : propertyData.ownerInfo;
  
  if (contactInfo && contactInfo.name) {
    // Split the name into first and last name
    const nameParts = contactInfo.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return { firstName, lastName };
  }
  
  return { firstName: '', lastName: '' };
};

/**
 * Format a system type code to a human-readable name
 * @param {string} typeCode - System type code (e.g., 'central-ac')
 * @returns {string} Human-readable system type name
 */
export const formatSystemType = (typeCode) => {
  const typeMap = {
    'central-ac': 'Central Air Conditioning',
    'heat-pump': 'Heat Pump',
    'furnace': 'Furnace',
    'boiler': 'Boiler',
    'mini-split': 'Mini-Split / Ductless System',
    'package-unit': 'Package Unit'
  };
  
  return typeMap[typeCode] || typeCode;
};

/**
 * Generate a default asset name based on system info
 * @param {Object} systemInfo - System information data
 * @returns {string} Generated asset name
 */
export const generateAssetName = (systemInfo) => {
  const brand = systemInfo.brand || '';
  const systemType = systemInfo.systemType ? formatSystemType(systemInfo.systemType) : 'HVAC System';
  
  return `${brand} ${systemType}`.trim();
};
