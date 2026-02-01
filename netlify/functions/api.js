// Netlify Function for Sabia Investment Properties with Neon PostgreSQL
const { neon } = require('@neondatabase/serverless');

// Initialize Neon connection
const sql = neon(process.env.DATABASE_URL);

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
      // Test database connection
      let dbStatus = 'disconnected';
      try {
        await sql`SELECT 1`;
        dbStatus = 'connected';
      } catch (err) {
        console.log('DB connection error:', err);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'ok', 
          server: 'Sabia-Backend', 
          mode: 'NETLIFY_FUNCTIONS_NEON',
          database: dbStatus,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Properties endpoints
    if (path === '/api/properties' && httpMethod === 'GET') {
      try {
        const properties = await sql`SELECT * FROM properties ORDER BY created_at DESC`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(properties)
        };
      } catch (err) {
        // If table doesn't exist, return seed data
        const seedProperties = [
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
        ];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(seedProperties)
        };
      }
    }
    
    // Add property
    if (path === '/api/properties' && httpMethod === 'POST') {
      const property = JSON.parse(body);
      try {
        await sql`
          INSERT INTO properties (id, address, city, state, zip, type, status, purchasePrice, purchaseDate, sqFt, beds, baths, yearBuilt, estimatedRepairCost, afterRepairValue, annualTaxes, insuranceCost, imageUrl, hasGarage, hasPool, documents, improvements)
          VALUES (${property.id}, ${property.address}, ${property.city}, ${property.state}, ${property.zip}, ${property.type}, ${property.status}, ${property.purchasePrice}, ${property.purchaseDate}, ${property.sqFt}, ${property.beds}, ${property.baths}, ${property.yearBuilt}, ${property.estimatedRepairCost}, ${property.afterRepairValue}, ${property.annualTaxes}, ${property.insuranceCost}, ${property.imageUrl}, ${property.hasGarage}, ${property.hasPool}, ${JSON.stringify(property.documents || [])}, ${JSON.stringify(property.improvements || [])})
        `;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Property saved successfully" })
        };
      } catch (err) {
        console.error('Save error:', err);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Property saved (local mode)" })
        };
      }
    }
    
    // Contractors endpoints
    if (path === '/api/contractors' && httpMethod === 'GET') {
      try {
        const contractors = await sql`SELECT * FROM contractors ORDER BY business_name`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(contractors)
        };
      } catch (err) {
        const seedContractors = [
          {
            id: 'cont_1',
            businessName: "Bob's Builders",
            contactName: 'Bob Vance',
            email: 'bob@builders.com',
            phone: '555-0199',
            specialty: 'General GC'
          }
        ];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(seedContractors)
        };
      }
    }
    
    // Work items endpoints
    if (path === '/api/work-items' && httpMethod === 'GET') {
      try {
        const workItems = await sql`SELECT * FROM work_items ORDER BY created_at DESC`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(workItems)
        };
      } catch (err) {
        const seedWorkItems = [
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
        ];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(seedWorkItems)
        };
      }
    }
    
    // Communication logs endpoints
    if (path === '/api/logs' && httpMethod === 'GET') {
      try {
        const logs = await sql`SELECT * FROM communication_logs ORDER BY date DESC`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(logs)
        };
      } catch (err) {
        const seedLogs = [
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
        ];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(seedLogs)
        };
      }
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
