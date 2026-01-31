import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Calculator, 
  MessageSquare, 
  LayoutDashboard,
  Wifi,
  WifiOff
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  serverConnected?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, serverConnected = false }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={22} /> },
    { id: 'properties', label: 'Assets', icon: <Building2 size={22} /> },
    { id: 'projects', label: 'Projects', icon: <Users size={22} /> },
    { id: 'financials', label: 'ROI', icon: <Calculator size={22} /> },
    { id: 'communications', label: 'Chat', icon: <MessageSquare size={22} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 z-50 px-4 py-3 border-b border-slate-800 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <img src="./lion-logo.png" alt="Sabia Lion" className="h-10 w-auto opacity-90" />
          <div>
            <div className="font-bold text-lg tracking-tight text-vestra-gold leading-none">SABIA</div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">Investments Inc.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${serverConnected ? 'bg-green-900/20 text-green-400 border-green-900' : 'bg-red-900/20 text-red-400 border-red-900'}`}>
                {serverConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {serverConnected ? 'Online' : 'Offline'}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-vestra-gold shadow-sm">
                AD
            </div>
        </div>
      </div>

      {/* Desktop Sidebar Navigation (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-100">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img src="./lion-logo.png" alt="Sabia Lion" className="h-12 w-auto opacity-90" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">SABIA</h1>
            <p className="text-vestra-gold text-[10px] uppercase tracking-widest mt-1 leading-none">Investments Properties Inc.</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-vestra-gold text-slate-900 font-bold shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-3">
          {/* Server Status Widget */}
          <div className={`rounded-lg p-3 border ${serverConnected ? 'bg-green-950/30 border-green-900' : 'bg-red-950/30 border-red-900'}`}>
             <div className="flex items-center gap-2 mb-1">
                 {serverConnected ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500" />}
                 <span className={`text-xs font-bold uppercase ${serverConnected ? 'text-green-500' : 'text-red-500'}`}>
                     {serverConnected ? 'Server Connected' : 'Local Mode'}
                 </span>
             </div>
             <p className="text-[10px] text-slate-500 leading-tight">
                 {serverConnected ? 'Database synced. Features active.' : 'Changes saved to device. Retrying...'}
             </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-vestra-gold">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Admin User</p>
              <p className="text-xs text-slate-500">Pro License</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen bg-slate-950 pt-16 md:pt-0 pb-24 md:pb-0 md:pl-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 flex justify-around items-center pb-6 pt-3 px-1 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
         {navItems.map((item) => {
           const isActive = activeTab === item.id;
           return (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-full space-y-1 ${isActive ? 'text-vestra-gold' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-slate-800' : ''}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
             </button>
           );
         })}
      </div>

    </div>
  );
};

export default Layout;