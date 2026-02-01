import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { PropertyManager } from './components/PropertyManager';
import ProjectTracker from './components/ProjectTracker';
import Financials from './components/Financials';
import CommunicationLogComponent from './components/CommunicationLog';
import { Property, Contractor, WorkItem, CommunicationLog, WorkStatus, PropertyType, ContactRole } from './types';
import { ArrowUpRight, DollarSign, Activity, Wifi, WifiOff, RefreshCw, Loader2, Info, CloudOff, Plus, TrendingUp, Calendar, Home, Hammer, FileText, Users, Download, Upload } from 'lucide-react';
import { formatCurrency } from './utils';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

// Use relative path so Vite proxy handles it. 
const SERVER_URL = '/api';

// --- SEED DATA FOR OFFLINE MODE ---
const SEED_PROPERTIES: Property[] = [
  {
    id: 'prop_1', address: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', zip: '62704',
    type: PropertyType.SINGLE_FAMILY, status: 'Rehab', purchasePrice: 150000, purchaseDate: '2023-01-15',
    sqFt: 2100, beds: 4, baths: 2.5, yearBuilt: 1989,
    estimatedRepairCost: 45000, afterRepairValue: 280000, annualTaxes: 3200, insuranceCost: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
    hasGarage: true, hasPool: false, documents: [], improvements: ['New Roof 2020', 'Kitchen Remodel 2021']
  },
  {
    id: 'prop_2', address: '12 Grimmauld Place', city: 'London', state: 'UK', zip: 'N1',
    type: PropertyType.MULTI_FAMILY, status: 'Acquisition', purchasePrice: 450000, purchaseDate: '2023-03-10',
    sqFt: 3500, beds: 6, baths: 3, yearBuilt: 1890,
    estimatedRepairCost: 120000, afterRepairValue: 850000, annualTaxes: 8500, insuranceCost: 3400,
    imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
    hasGarage: false, hasPool: false, documents: [], improvements: []
  },
   {
    id: 'prop_3', address: '308 Negra Arroyo Lane', city: 'Albuquerque', state: 'NM', zip: '87104',
    type: PropertyType.SINGLE_FAMILY, status: 'Listed', purchasePrice: 210000, purchaseDate: '2022-11-05',
    sqFt: 1900, beds: 3, baths: 2, yearBuilt: 2004,
    estimatedRepairCost: 15000, afterRepairValue: 350000, annualTaxes: 4100, insuranceCost: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1570129438497-7c5f38f81154?auto=format&fit=crop&w=800&q=80',
    hasGarage: true, hasPool: true, documents: [], improvements: ['Solar Panels', 'Heated Pool']
  }
];

const SEED_CONTRACTORS: Contractor[] = [
    { id: 'cont_1', businessName: 'Bob\'s Builders', contactName: 'Bob Vance', email: 'bob@builders.com', phone: '555-0199', specialty: 'General GC' },
    { id: 'cont_2', businessName: 'Super Pipes Plumbing', contactName: 'Mario', email: 'mario@pipes.com', phone: '555-0123', specialty: 'Plumbing' }
];

const SEED_WORK_ITEMS: WorkItem[] = [
    { id: 'work_1', propertyId: 'prop_1', contractorId: 'cont_1', description: 'Roof Replacement', category: 'Roofing', estimatedCost: 12000, actualCost: 12500, status: WorkStatus.COMPLETED, isBundle: false, startDate: '2023-02-01' },
    { id: 'work_2', propertyId: 'prop_1', contractorId: 'cont_2', description: 'Master Bath Rough-in', category: 'Plumbing', estimatedCost: 3500, actualCost: 0, status: WorkStatus.IN_PROGRESS, isBundle: false, startDate: '2023-02-15' },
];

const SEED_LOGS: CommunicationLog[] = [
    { id: 'log_1', propertyId: 'prop_1', contactId: 'cont_1', contactRole: ContactRole.CONTRACTOR, date: '2023-01-20', type: 'Call', summary: 'Discussed timeline for roof repair', followUpRequired: false }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  // Connection State
  const [isOffline, setIsOffline] = useState(false);
  const [serverCheckComplete, setServerCheckComplete] = useState(false);

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [splashOpacity, setSplashOpacity] = useState(0);

  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);

  // Selected Property for Chat Context
  const [chatPropId, setChatPropId] = useState<string | null>(null);

  // Helpers for Local Storage
  const loadLocal = (key: string, seed: any) => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : seed;
  };

  const saveLocal = (key: string, data: any) => {
      localStorage.setItem(key, JSON.stringify(data));
  };

  const checkServerHealth = async () => {
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); // Increased timeout to 4s
          const res = await fetch(`${SERVER_URL}/health`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) return true;
          return false;
      } catch (e) {
          return false;
      }
  };

  const fetchData = useCallback(async (forceOffline = false) => {
    // 1. Check Server Connection
    let connected = false;
    if (!forceOffline) {
        connected = await checkServerHealth();
    }

    if (connected) {
        // --- ONLINE MODE ---
        console.log("Server connected. Fetching data...");
        setIsOffline(false);
        try {
            const [propsRes, contsRes, workRes, logsRes] = await Promise.all([
                fetch(`${SERVER_URL}/properties`),
                fetch(`${SERVER_URL}/contractors`),
                fetch(`${SERVER_URL}/work-items`),
                fetch(`${SERVER_URL}/logs`)
            ]);

            if (propsRes.ok) setProperties(await propsRes.json());
            if (contsRes.ok) setContractors(await contsRes.json());
            if (workRes.ok) setWorkItems(await workRes.json());
            if (logsRes.ok) setCommLogs(await logsRes.json());
        } catch (e) {
            console.error("Fetch failed despite health check OK, falling back.", e);
            connected = false; // Fallback
        }
    }

    if (!connected) {
        // --- OFFLINE MODE ---
        if (!isOffline) console.log("Server unavailable. Using Local Storage/Seed Data.");
        setIsOffline(true);
        
        if (properties.length === 0) {
            const localProps = loadLocal('sabia_properties', SEED_PROPERTIES);
            setProperties(localProps);
            if(!localStorage.getItem('sabia_properties')) saveLocal('sabia_properties', SEED_PROPERTIES);

            const localConts = loadLocal('sabia_contractors', SEED_CONTRACTORS);
            setContractors(localConts);
            if(!localStorage.getItem('sabia_contractors')) saveLocal('sabia_contractors', SEED_CONTRACTORS);

            const localWork = loadLocal('sabia_work', SEED_WORK_ITEMS);
            setWorkItems(localWork);
            if(!localStorage.getItem('sabia_work')) saveLocal('sabia_work', SEED_WORK_ITEMS);

            const localLogs = loadLocal('sabia_logs', SEED_LOGS);
            setCommLogs(localLogs);
            if(!localStorage.getItem('sabia_logs')) saveLocal('sabia_logs', SEED_LOGS);
        }
    }

    setServerCheckComplete(true);
    setIsLoading(false);
  }, [isOffline, properties.length]);

  // Handle Splash Screen Animation
  useEffect(() => {
    // 1. Fade In
    const timerIn = setTimeout(() => setSplashOpacity(1), 100);
    
    // 2. Start Fade Out (Hold longer, then fade slowly)
    const timerOut = setTimeout(() => setSplashOpacity(0), 3000); // Start fading out after 3s

    // 3. Remove from DOM (3s hold + 2s fade duration)
    const timerRemove = setTimeout(() => setShowSplash(false), 5000);

    return () => {
        clearTimeout(timerIn);
        clearTimeout(timerOut);
        clearTimeout(timerRemove);
    };
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto-reconnect polling every 30 seconds if offline
    const interval = setInterval(() => {
        if (isOffline) {
            checkServerHealth().then(healthy => {
                if (healthy) {
                    console.log("Server detected! Reconnecting...");
                    fetchData();
                }
            });
        }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData, isOffline]);

  // --- CRUD Handlers (Hybrid: API + Local) ---

  // Email notification function
  const sendEmailNotification = async (to: string, subject: string, body: string) => {
    try {
      // This would connect to your backend email service
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body })
      });
      
      if (response.ok) {
        console.log('Email sent successfully');
        return true;
      }
    } catch (error) {
      console.error('Email send error:', error);
    }
    return false;
  };

  // Enhanced property handler with email notification
  const handleAddProperty = async (property: Omit<Property, 'id'>) => {
    const newProperty: Property = {
      ...property,
      id: `prop_${Date.now()}`
    };
    
    setProperties(prev => [...prev, newProperty]);
    
    // Send notification email
    await sendEmailNotification(
      'your-new-gmail@gmail.com', // Replace with your actual Gmail
      'New Property Added - Sabia Investments',
      `A new property has been added:\n\nAddress: ${property.address}\nCity: ${property.city}\nPurchase Price: $${property.purchasePrice?.toLocaleString()}\n\nView details in your dashboard.`
    );
    
    // Save to backend
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty)
      });
      
      if (response.ok) {
        console.log('Property saved to database');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleUpdateProperty = async (updatedProp: Property) => {
    const updated = properties.map(p => p.id === updatedProp.id ? updatedProp : p);
    setProperties(updated);
    if (isOffline) {
        saveLocal('sabia_properties', updated);
    } else {
        await fetch(`${SERVER_URL}/properties/${updatedProp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProp) });
    }
  };

  const handleDeleteProperty = async (id: string) => {
      const updated = properties.filter(p => p.id !== id);
      setProperties(updated);
      if (isOffline) {
          saveLocal('sabia_properties', updated);
      } else {
          await fetch(`${SERVER_URL}/properties/${id}`, { method: 'DELETE' });
      }
  };

  const handleAddContractor = async (c: Contractor) => {
    const updated = [...contractors, c];
    setContractors(updated);
    if(isOffline) {
        saveLocal('sabia_contractors', updated);
    } else {
        await fetch(`${SERVER_URL}/contractors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    }
  };

  const handleAddWorkItem = async (w: WorkItem) => {
    const updated = [...workItems, w];
    setWorkItems(updated);
    if(isOffline) {
        saveLocal('sabia_work', updated);
    } else {
        await fetch(`${SERVER_URL}/work-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) });
    }
  };

  const handleAddLog = async (l: CommunicationLog) => {
    const updated = [...commLogs, l];
    setCommLogs(updated);
    if(isOffline) {
        saveLocal('sabia_logs', updated);
    } else {
        await fetch(`${SERVER_URL}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(l) });
    }
  };

  // Sync Functions
  const exportData = () => {
    const data = {
      properties,
      contractors,
      workItems,
      commLogs,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sabia-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.properties) setProperties(data.properties);
        if (data.contractors) setContractors(data.contractors);
        if (data.workItems) setWorkItems(data.workItems);
        if (data.commLogs) setCommLogs(data.commLogs);
        
        // Save to localStorage
        localStorage.setItem('sabia_properties', JSON.stringify(data.properties || []));
        localStorage.setItem('sabia_contractors', JSON.stringify(data.contractors || []));
        localStorage.setItem('sabia_work', JSON.stringify(data.workItems || []));
        localStorage.setItem('sabia_logs', JSON.stringify(data.commLogs || []));
        
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Handler for Chat Icon in PropertyManager
  const handleChatClick = (propId: string) => {
      setChatPropId(propId);
      setActiveTab('communications');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'properties':
        return <PropertyManager 
          properties={properties} 
          onAddProperty={handleAddProperty} 
          onUpdateProperty={handleUpdateProperty} 
          onDeleteProperty={handleDeleteProperty}
          onChatClick={handleChatClick}
        />;
      case 'projects':
        return <ProjectTracker 
          properties={properties} 
          contractors={contractors} 
          workItems={workItems} 
          onAddContractor={handleAddContractor}
          onAddWorkItem={handleAddWorkItem}
        />;
      case 'financials':
        return <Financials properties={properties} workItems={workItems} />;
      case 'communications':
        return <CommunicationLogComponent 
            logs={commLogs} 
            onAddLog={handleAddLog} 
            properties={properties} 
            initialPropertyId={chatPropId}
        />;
      case 'dashboard':
      default:
        // Calculate data for charts
        const statusData = [
          { name: 'Acquisition', value: properties.filter(p => p.status === 'Acquisition').length, color: '#3b82f6' },
          { name: 'Rehab', value: properties.filter(p => p.status === 'Rehab').length, color: '#f59e0b' },
          { name: 'Listed', value: properties.filter(p => p.status === 'Listed').length, color: '#10b981' },
          { name: 'Sold', value: properties.filter(p => p.status === 'Sold').length, color: '#ef4444' },
          { name: 'Held', value: properties.filter(p => p.status === 'Held').length, color: '#8b5cf6' }
        ].filter(item => item.value > 0);

        const monthlyData = [
          { month: 'Jan', value: 450000, projects: 2 },
          { month: 'Feb', value: 520000, projects: 3 },
          { month: 'Mar', value: 480000, projects: 2 },
          { month: 'Apr', value: 610000, projects: 4 },
          { month: 'May', value: 590000, projects: 3 },
          { month: 'Jun', value: 670000, projects: 5 }
        ];

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             
             {/* Enhanced Dashboard Metrics */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
                   <div className="relative z-10">
                     <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Portfolio Value</p>
                     <h3 className="text-3xl font-bold mt-2 text-white">{formatCurrency(properties.reduce((a,b) => a + (b.afterRepairValue || 0), 0))}</h3>
                     <div className="flex items-center gap-1 mt-4 text-green-400 text-sm font-medium">
                       <ArrowUpRight size={16} /> <span>+12% Projected</span>
                     </div>
                   </div>
                   <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <DollarSign size={150} />
                   </div>
                </div>
                
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Active Projects</p>
                      <Hammer className="text-vestra-gold" size={20} />
                    </div>
                    <h3 className="text-3xl font-bold text-white mt-2">
                        {properties.filter(p => p.status === 'Rehab').length}
                    </h3>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-4">
                      <div className="bg-vestra-gold h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">65% on track</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Pending Work</p>
                      <Calendar className="text-orange-400" size={20} />
                    </div>
                    <h3 className="text-3xl font-bold text-vestra-gold mt-2">
                        {workItems.filter(w => w.status === WorkStatus.PENDING || w.status === WorkStatus.IN_PROGRESS).length}
                    </h3>
                    <p className="text-slate-500 text-sm mt-4">Items requiring attention</p>
                </div>

                <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
                   <div className="relative z-10">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-blue-300 text-sm font-bold uppercase tracking-wider">ROI</p>
                       <TrendingUp size={20} />
                     </div>
                     <h3 className="text-3xl font-bold mt-2 text-white">18.5%</h3>
                     <div className="flex items-center gap-1 mt-4 text-green-400 text-sm font-medium">
                       <ArrowUpRight size={16} /> <span>+3.2% vs last month</span>
                     </div>
                   </div>
                </div>
             </div>

             {/* Charts and Visualizations */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Property Status Distribution */}
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
                   <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                     <Home size={20} className="text-vestra-gold" />
                     Property Status
                   </h3>
                   {statusData.length > 0 ? (
                     <ResponsiveContainer width="100%" height={200}>
                       <PieChart>
                         <Pie
                           data={statusData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {statusData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Pie>
                         <Tooltip />
                       </PieChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="h-48 flex items-center justify-center text-slate-500">
                       No properties available
                     </div>
                   )}
                   <div className="mt-4 space-y-2">
                     {statusData.map((item, index) => (
                       <div key={index} className="flex items-center justify-between text-sm">
                         <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                           <span className="text-slate-300">{item.name}</span>
                         </div>
                         <span className="text-white font-medium">{item.value}</span>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Portfolio Trend */}
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
                   <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                     <TrendingUp size={20} className="text-green-400" />
                     Portfolio Trend
                   </h3>
                   <ResponsiveContainer width="100%" height={200}>
                     <LineChart data={monthlyData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                       <XAxis dataKey="month" stroke="#9ca3af" />
                       <YAxis stroke="#9ca3af" />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                         labelStyle={{ color: '#9ca3af' }}
                       />
                       <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                     </LineChart>
                   </ResponsiveContainer>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
                   <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                     <Plus size={20} className="text-blue-400" />
                     Quick Actions
                   </h3>
                   <div className="space-y-3">
                     <button 
                       onClick={() => setActiveTab('properties')}
                       className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left"
                     >
                       <Home size={18} className="text-blue-400" />
                       <div>
                         <p className="text-white font-medium">Add Property</p>
                         <p className="text-slate-400 text-xs">Add new investment property</p>
                       </div>
                     </button>
                     <button 
                       onClick={() => setActiveTab('projects')}
                       className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left"
                     >
                       <Hammer size={18} className="text-vestra-gold" />
                       <div>
                         <p className="text-white font-medium">Track Project</p>
                         <p className="text-slate-400 text-xs">Manage renovation work</p>
                       </div>
                     </button>
                     <button 
                       onClick={() => setActiveTab('financials')}
                       className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left"
                     >
                       <FileText size={18} className="text-green-400" />
                       <div>
                         <p className="text-white font-medium">Generate Report</p>
                         <p className="text-slate-400 text-xs">AI-powered analysis</p>
                       </div>
                     </button>
                     
                     <div className="border-t border-slate-700 pt-3 mt-3">
                       <p className="text-xs text-slate-400 font-medium mb-2">DATA SYNC</p>
                       <div className="grid grid-cols-2 gap-2">
                         <button 
                           onClick={exportData}
                           className="flex items-center gap-2 p-2 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors text-left"
                         >
                           <Download size={16} className="text-blue-300" />
                           <span className="text-blue-300 text-xs font-medium">Export</span>
                         </button>
                         <label className="flex items-center gap-2 p-2 bg-green-900 hover:bg-green-800 rounded-lg transition-colors text-left cursor-pointer">
                           <Upload size={16} className="text-green-300" />
                           <span className="text-green-300 text-xs font-medium">Import</span>
                           <input 
                             type="file" 
                             accept=".json" 
                             onChange={importData} 
                             className="hidden" 
                           />
                         </label>
                       </div>
                       <p className="text-xs text-slate-500 mt-2">Sync data between devices</p>
                     </div>
                   </div>
                </div>
             </div>

             {/* Enhanced Recent Activity Timeline */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
                   <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                     <Activity size={20} className="text-purple-400" />
                     Recent Activity Timeline
                   </h3>
                   {commLogs.length === 0 && workItems.length === 0 ? (
                       <p className="text-slate-500 text-sm">No recent activity found.</p>
                   ) : (
                       <div className="space-y-4">
                          {commLogs.slice(0, 3).map((log, index) => (
                            <div key={log.id} className="flex gap-4 items-start">
                               <div className="flex flex-col items-center">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-vestra-gold border border-slate-700">
                                   {log.type === 'Call' ? '📞' : log.type === 'Email' ? '✉️' : '👥'}
                                 </div>
                                 {index < commLogs.slice(0, 3).length - 1 && (
                                   <div className="w-0.5 h-12 bg-slate-700 mt-2"></div>
                                 )}
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-200">{log.summary}</p>
                                    <span className="text-xs text-slate-500">{log.date}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{log.contactRole} • {log.type}</p>
                               </div>
                            </div>
                          ))}
                          {workItems.slice(0,2).map((w, index) => (
                              <div key={w.id} className="flex gap-4 items-start">
                               <div className="flex flex-col items-center">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-orange-400 border border-slate-700">
                                   <Hammer size={14} />
                                 </div>
                                 {index < workItems.slice(0,2).length - 1 && (
                                   <div className="w-0.5 h-12 bg-slate-700 mt-2"></div>
                                 )}
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-200">{w.description}</p>
                                    <span className="text-xs text-slate-500">{w.startDate}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      w.status === WorkStatus.COMPLETED ? 'bg-green-900 text-green-300' :
                                      w.status === WorkStatus.IN_PROGRESS ? 'bg-blue-900 text-blue-300' :
                                      'bg-orange-900 text-orange-300'
                                    }`}>
                                      {w.status}
                                    </span>
                                    <span className="text-xs text-slate-500">{formatCurrency(w.actualCost)}</span>
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                   )}
                </div>
                
                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-vestra-gold/10 to-blue-500/10"></div>
                    <div className="relative z-10">
                      <Users className="text-vestra-gold mb-4" size={48} />
                      <h3 className="font-bold text-xl text-white mb-2">Team Collaboration</h3>
                      <p className="text-slate-400 mb-6 max-w-xs mx-auto">Connect with contractors, agents, and team members through the communication hub.</p>
                      <button onClick={() => setActiveTab('communications')} className="bg-vestra-gold text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-yellow-500 transition-colors">
                         Open Communications
                      </button>
                    </div>
                 </div>
             </div>
          {/* Property Gallery Preview */}
             <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-lg text-white flex items-center gap-2">
                   <Home size={20} className="text-blue-400" />
                   Property Gallery
                 </h3>
                 <button 
                   onClick={() => setActiveTab('properties')}
                   className="text-vestra-gold hover:text-yellow-500 text-sm font-medium transition-colors"
                 >
                   View All →
                 </button>
               </div>
               {properties.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {properties.slice(0, 4).map((property) => (
                     <div 
                       key={property.id}
                       onClick={() => setActiveTab('properties')}
                       className="group cursor-pointer bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-vestra-gold transition-all duration-200"
                     >
                       <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                         {property.imageUrl ? (
                           <img 
                             src={property.imageUrl} 
                             alt={property.address}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center">
                             <Home size={32} className="text-slate-600" />
                           </div>
                         )}
                         <div className="absolute top-2 right-2">
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                             property.status === 'Rehab' ? 'bg-orange-900 text-orange-300' :
                             property.status === 'Listed' ? 'bg-green-900 text-green-300' :
                             property.status === 'Sold' ? 'bg-red-900 text-red-300' :
                             'bg-blue-900 text-blue-300'
                           }`}>
                             {property.status}
                           </span>
                         </div>
                       </div>
                       <div className="p-3">
                         <p className="text-white font-medium text-sm truncate">{property.address}</p>
                         <p className="text-slate-400 text-xs truncate">{property.city}, {property.state}</p>
                         <div className="flex items-center justify-between mt-2">
                           <span className="text-vestra-gold font-bold text-sm">
                             {formatCurrency(property.afterRepairValue || 0)}
                           </span>
                           <span className="text-slate-500 text-xs">
                             {property.beds}bd/{property.baths}ba
                           </span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <Home size={48} className="text-slate-600 mx-auto mb-3" />
                   <p className="text-slate-500">No properties in portfolio yet</p>
                   <button 
                     onClick={() => setActiveTab('properties')}
                     className="mt-3 text-vestra-gold hover:text-yellow-500 font-medium text-sm transition-colors"
                   >
                     Add Your First Property →
                   </button>
                 </div>
               )}
             </div>
          </div>
        );
    }
  };

  return (
    <>
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[9999] bg-[#C1B283] flex flex-col items-center justify-center transition-opacity duration-1000 ${splashOpacity === 0 ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="text-center animate-pulse flex flex-col items-center">
                <img 
                    src="/Splash-logo720.png" 
                    alt="Sabia Investments LLC Logo" 
                    className="w-64 h-32 mb-6 object-contain"
                />
                <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-widest">Sabia</h1>
                <p className="text-sm text-slate-700 tracking-[0.3em] mt-2">Investments Inc.</p>
            </div>
        </div>
      )}

      <Layout activeTab={activeTab} setActiveTab={setActiveTab} serverConnected={!isOffline}>
        {renderContent()}
      </Layout>
    </>
  );
};

export default App;