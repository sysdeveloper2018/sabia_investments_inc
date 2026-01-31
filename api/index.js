// Simple serverless API for Vercel
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  
  // Health check
  if (url === '/api/health') {
    return res.json({ 
      status: 'ok', 
      server: 'Sabia-Backend', 
      mode: 'SERVERLESS',
      timestamp: new Date().toISOString()
    });
  }
  
  // Mock data endpoints (can be enhanced with real database later)
  if (url === '/api/properties' && method === 'GET') {
    return res.json([
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
    ]);
  }
  
  if (url === '/api/contractors' && method === 'GET') {
    return res.json([
      {
        id: 'cont_1',
        businessName: "Bob's Builders",
        contactName: 'Bob Vance',
        email: 'bob@builders.com',
        phone: '555-0199',
        specialty: 'General GC'
      }
    ]);
  }
  
  if (url === '/api/work-items' && method === 'GET') {
    return res.json([
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
    ]);
  }
  
  if (url === '/api/logs' && method === 'GET') {
    return res.json([
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
    ]);
  }
  
  // POST endpoints (for now just return success)
  if (method === 'POST') {
    return res.json({ message: "Data saved successfully" });
  }
  
  res.status(404).json({ error: "Not Found" });
}
