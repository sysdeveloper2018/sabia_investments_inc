// Netlify Function for Sabia Investment Properties
exports.handler = async function(event, context) {
  const { path, httpMethod, body } = event;
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Health check
    if (path === '/api/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'ok', 
          server: 'Sabia-Backend', 
          mode: 'NETLIFY_FUNCTIONS',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Properties endpoint
    if (path === '/api/properties' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([
          {
            id: 'prop_1',
            address: '742 Evergreen Terrace',
            city: 'Springfield',
            state: 'IL',
            zip: '62704',
            type: 'Single Family',
            status: 'Rehab',
            purchasePrice: 150000,
            purchaseDate: '2023-01-15',
            sqFt: 2100,
            beds: 4,
            baths: 2.5,
            yearBuilt: 1989,
            estimatedRepairCost: 45000,
            afterRepairValue: 280000,
            annualTaxes: 3200,
            insuranceCost: 1200,
            imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
            hasGarage: true,
            hasPool: false,
            documents: [],
            improvements: ['New Roof 2020', 'Kitchen Remodel 2021']
          }
        ])
      };
    }
    
    // Contractors endpoint
    if (path === '/api/contractors' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([
          {
            id: 'cont_1',
            businessName: "Bob's Builders",
            contactName: 'Bob Vance',
            email: 'bob@builders.com',
            phone: '555-0199',
            specialty: 'General GC'
          }
        ])
      };
    }
    
    // Work items endpoint
    if (path === '/api/work-items' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([
          {
            id: 'work_1',
            propertyId: 'prop_1',
            contractorId: 'cont_1',
            description: 'Roof Replacement',
            category: 'Roofing',
            estimatedCost: 12000,
            actualCost: 12500,
            status: 'Completed',
            isBundle: false,
            startDate: '2023-02-01'
          }
        ])
      };
    }
    
    // Communication logs endpoint
    if (path === '/api/logs' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([
          {
            id: 'log_1',
            propertyId: 'prop_1',
            contactId: 'cont_1',
            contactRole: 'Contractor',
            date: '2023-01-20',
            type: 'Call',
            summary: 'Discussed timeline for roof repair',
            followUpRequired: false
          }
        ])
      };
    }
    
    // POST endpoints (save data)
    if (httpMethod === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Data saved successfully" })
      };
    }
    
    // 404 for unknown routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not Found" })
    };
    
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
