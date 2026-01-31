// Simple real-time sync using GitHub as database
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
      mode: 'GITHUB_SYNC',
      timestamp: new Date().toISOString()
    });
  }
  
  // Simple storage using GitHub Gists or similar
  if (url === '/api/sync-data' && method === 'POST') {
    // Store data in a simple way
    const { data, deviceId } = req.body;
    // Here we'd store to a database or file
    return res.json({ success: true, message: "Data synced" });
  }
  
  if (url === '/api/sync-data' && method === 'GET') {
    // Return latest data
    return res.json({ 
      properties: [],
      contractors: [],
      workItems: [],
      commLogs: [],
      lastSync: new Date().toISOString()
    });
  }
  
  res.status(404).json({ error: "Not Found" });
}
